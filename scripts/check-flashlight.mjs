import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createLevel, TILE } from '../src/core/level.js';
import { autoLights } from '../src/core/ops.js';
import { encodeLevel } from '../src/core/serialize.js';
import { waitFor } from './browser-driver.mjs';

// Lommelykten på ekte GPU: F, strålen i et rom uten lys, under strømbrudd, på gjenstander og ved utgang.
// Skjermbilder: node_modules/.cache/flashlight-*.png.
export async function checkFlashlight(browser, origin) {
  const { call, evaluate } = browser;
  const l = createLevel({ name: 'Flashlight check', theme: 'backrooms', w: 26, h: 16, height: 2.8 });
  for (let z = 1; z < 15; z++) for (let x = 1; x < 25; x++) l.tiles[z * l.w + x] = TILE.FLOOR;
  for (let z = 1; z < 15; z++) if (z !== 3) l.tiles[z * l.w + 12] = TILE.WALL; // en vegg 9 m unna, midt i strålen
  l.objects = [{ id: 'watercooler', x: 8, z: 4, rot: 0 }];
  l.spawn = { x: 3.5, z: 7.5, a: -Math.PI / 2 };
  await call('Page.navigate', { url: 'about:blank' });
  await call('Page.navigate', { url: `${origin}/app/#room=${await encodeLevel(l)}` });
  await waitFor(() => evaluate('Boolean(window.liminal?.viewer.world)').catch(() => false), 'flashlight scene');
  await call('Emulation.setDeviceMetricsOverride', { width: 1100, height: 680, deviceScaleFactor: 1, mobile: false });
  await evaluate(`liminal.layout.set('3d')`);
  const png = async (name) => writeFileSync(`node_modules/.cache/flashlight-${name}.png`, Buffer.from(await evaluate(`(() => {
    const v = liminal.viewer; v.postfx.render(0); return v.renderer.domElement.toDataURL('image/png').split(',')[1];
  })()`), 'base64'));
  const result = await evaluate(`(async () => {
    const v = liminal.viewer, walk = v.walk, c = v.camera, gl = v.renderer.getContext();
    v.updateSettings({ effects: 'full', renderScale: 1, vhs: false, grain: false, mood: 'normal' }); v._applyLook();
    v.enterWalk(); walk.session.resume();
    v.renderer.setAnimationLoop(null);
    const key = (code) => window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    const run = (s) => { for (let t = 0; t < s; t += 1 / 30) walk.update(1 / 30, c, [0, 0, 0, 0], []); };
    const light = (ox = 0) => { v.postfx.render(0); const a = new Uint8Array(4 * 900), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
      gl.readPixels(Math.round(W * (0.5 + ox)) - 15, (H >> 1) - 15, 30, 30, gl.RGBA, gl.UNSIGNED_BYTE, a);
      let s = 0; for (let i = 0; i < a.length; i += 4) s += a[i] + a[i + 1] + a[i + 2]; return s / 2700; };
    run(0.2);
    const off = light();
    // I mørket med lykten av: et hint etter et par sekunder (world/flash-hint.js), og ikke før.
    v.fogLight.update(1);
    const early = v.hud.message.hidden || !/Press F/.test(v.hud.message.textContent);
    for (let k = 0; k < 4; k++) v.fogLight.update(1);
    const hint = !v.hud.message.hidden && /dark.*Press F/.test(v.hud.message.textContent);
    key('KeyF'); run(0.5);
    const on = light(), edge = light(0.47);
    window.__state = { off, on, edge, early, hint };
    return true;
  })()`);
  assert.equal(result, true);
  await png('beam');
  const after = await evaluate(`(async () => {
    const v = liminal.viewer, walk = v.walk, w = walk.walker, c = v.camera, gl = v.renderer.getContext();
    const run = (s) => { for (let t = 0; t < s; t += 1 / 30) walk.update(1 / 30, c, [0, 0, 0, 0], []); };
    const light = () => { v.postfx.render(0); const a = new Uint8Array(4 * 900), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
      gl.readPixels((W >> 1) - 15, (H >> 1) - 15, 30, 30, gl.RGBA, gl.UNSIGNED_BYTE, a);
      let s = 0; for (let i = 0; i < a.length; i += 4) s += a[i] + a[i + 1] + a[i + 2]; return s / 2700; };
    v.storeys.setPower(0); run(0.1);
    const blackout = light();
    v.storeys.setPower(1);
    window.__paused = walk.flashlight.on;
    walk.session.setPaused(true);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF', bubbles: true }));
    const stillOn = walk.flashlight.on;
    walk.session.setPaused(false);
    const linked = v.renderer.info.programs.every((p) => p.diagnostics?.runnable !== false);
    v.exitWalk(false);
    return { ...window.__state, blackout, stillOn, exited: { on: walk.flashlight.on, w: walk.flashlight.level }, linked, lost: gl.isContextLost() };
  })()`);
  assert.deepEqual([after.early, after.hint], [true, true], 'a hint about F after a while in the dark');
  assert.ok(after.on > after.off + 40, `lights up a dark room: ${after.off} → ${after.on}`);
  assert.ok(after.on > after.edge + 30, `a beam, not a lamp: middle ${after.on}, edge ${after.edge}`);
  assert.ok(after.blackout > after.on * 0.8, `not dimmed by a blackout: ${after.blackout}`);
  assert.equal(after.stillOn, true, 'F does nothing on pause');
  assert.deepEqual(after.exited, { on: false, w: 0 }, 'off when leaving walking');
  assert.equal(after.linked, true);
  assert.equal(after.lost, false);
  assert.deepEqual(browser.errors, []);
  console.log('PASS flashlight: F, beam in a dark room, blackout, pause, exit, shaders and GPU pixels');
}
