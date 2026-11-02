import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createLevel, TILE } from '../src/core/level.js';
import { autoLights } from '../src/core/ops.js';
import { encodeLevel } from '../src/core/serialize.js';
import { waitFor } from './browser-driver.mjs';

// Den sorte skikkelsen på ekte GPU: mørke piksler der den står, røyken beveger seg, pause fryser den,
// den er mer utvisket i et utfall, og kompilert uten feil. Skjermbilder: node_modules/.cache/figure-*.png.
export async function checkFigure(browser, origin) {
  const l = createLevel({ name: 'Dark figure check', theme: 'backrooms', w: 16, h: 18, height: 3 });
  for (let z = 1; z < 17; z++) for (let x = 1; x < 15; x++) l.tiles[z * l.w + x] = TILE.FLOOR;
  autoLights(l, { spacing: 4, state: 1 });
  await browser.call('Page.navigate', { url: 'about:blank' });
  await browser.call('Page.navigate', { url: `${origin}/app/#room=${await encodeLevel(l)}` });
  await waitFor(() => browser.evaluate('Boolean(window.liminal?.viewer.world)').catch(() => false), 'figure scene');
  await browser.evaluate(`(async () => {
    const v = liminal.viewer; v.renderer.setAnimationLoop(null); liminal.layout.set('3d');
    v.mode = 'walk'; v.overview.enabled = false;
    v.updateSettings({ effects: 'full', renderScale: 1, vhs: false, grain: false, mood: 'normal' }); v._applyLook();
    v.camera.position.set(8, 1.55, 10); v.camera.lookAt(8, 1.3, 6);
    window.__ai = { x: 8, y: 0, z: 6, state: 'hunt', visible: true };
    window.__player = { x: 8, z: 10 };
    const m = v.explorer.scary.monster; await m.load(); m.update(0, __ai, __player, 1);
  })()`);
  await browser.evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
  const shots = await browser.evaluate(`(() => {
    const v = liminal.viewer, m = v.explorer.scary.monster, gl = v.renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    const read = () => { v.postfx.render(0); const a = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, a); return a; };
    const changed = (a, b) => { let n = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 20) n++; return n; };
    // Lysglød og tåke løfter de mørkeste pikslene litt: mål mot bakgrunnen, ikke mot svart.
    const darker = (a, b) => { let n = 0; for (let i = 0; i < a.length; i += 4) if (a[i] + a[i + 1] + a[i + 2] < 0.5 * (b[i] + b[i + 1] + b[i + 2])) n++; return n; };
    const png = () => v.renderer.domElement.toDataURL('image/png').split(',')[1];
    const shown = read(), lit = png();
    m.group.visible = false; const hidden = read(); m.group.visible = true;
    m.update(0.8, __ai, __player, 1); const smoke = read();
    m.update(0, __ai, __player, 1); const paused = read();
    for (let i = 0; i < 40; i++) m.update(0.05, { ...__ai, fast: true }, __player, 1);
    const rush = read(), fast = png();
    m.update(0.1, __ai, __player, 0.05);
    for (let i = 0; i < 40; i++) m.update(0.05, __ai, __player, 0.05);
    read(); const blackout = png();
    m.update(0, { ...__ai, visible: false }, __player, 1);
    return { visible: changed(shown, hidden), body: darker(shown, hidden), smoke: changed(shown, smoke), paused: changed(smoke, paused),
      rush: changed(smoke, rush), lit, fast, blackout, hiddenAfter: !m.group.visible,
      linked: v.renderer.info.programs.every((p) => p.diagnostics?.runnable !== false), lost: gl.isContextLost() };
  })()`);
  for (const key of ['lit', 'fast', 'blackout']) writeFileSync(`node_modules/.cache/figure-${key}.png`, Buffer.from(shots[key], 'base64'));
  assert.ok(shots.visible > 500, `the figure covers pixels: ${shots.visible}`);
  assert.ok(shots.body > 300, `dark body against the wall: ${shots.body}`);
  assert.ok(shots.smoke > 30, 'the edge of the smoke moves');
  assert.equal(shots.paused, 0, 'frozen while paused');
  assert.ok(shots.rush > 30, 'more blurred in a rush');
  assert.equal(shots.hiddenAfter, true);
  assert.equal(shots.linked, true);
  assert.equal(shots.lost, false);
  assert.deepEqual(browser.errors, []);
  console.log('PASS dark figure: dark body, moving smoke, pause, rush, hiding, shaders and GPU pixels');
}
