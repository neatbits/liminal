// Sklie ned fra etasjen over i produksjonsbygget: man starter i etasje 2, går inn i toppen av sklien,
// sklir gjennom sjakten og lander i bassenget i etasje 1. Skjermbilde fra rennen:
// node_modules/.cache/slide-drop.png.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createLevel, TILE } from '../src/core/level.js';
import { encodeLevel } from '../src/core/serialize.js';
import { autoLights } from '../src/core/ops.js';
import { fillRect } from '../src/gen/util.js';
import { addSlide } from '../src/core/slides.js';
import { insertStorey, emptyStorey } from '../src/core/storeys.js';
import { waitFor } from './browser-driver.mjs';

function building() {
  const level = createLevel({ name: 'Slide down', theme: 'pool', w: 16, h: 10, height: 3 });
  fillRect(level, 1, 1, 14, 8, TILE.FLOOR);
  fillRect(level, 9, 2, 14, 7, TILE.WATER);
  level.depths.fill(15);
  autoLights(level, { spacing: 3, state: 1 });
  const upper = emptyStorey(level);
  fillRect(upper, 1, 1, 14, 8, TILE.FLOOR);
  autoLights(upper, { spacing: 3, state: 1 });
  upper.spawn = { x: 1.5, z: 4.5, a: -Math.PI / 2 };
  insertStorey(level, 1, upper);
  level.spawnStorey = 1;
  addSlide(level, [[3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4]], true, 'red', true);
  return level;
}

export async function checkSlideDrops(browser, origin) {
  const { call, evaluate } = browser;
  await call('Page.navigate', { url: 'about:blank' });
  await call('Page.navigate', { url: `${origin}/app/#room=${await encodeLevel(building())}` });
  await waitFor(() => evaluate(`window.liminal?.level.name === 'Slide down' && Boolean(liminal.viewer.world)`).catch(() => false), 'slide-down room');
  await evaluate(`liminal.layout.set('3d')`);
  await evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
  // Normal stemning: ingen tilfeldige avvik (uendelige ganger flytter gåeren).
  await evaluate(`liminal.viewer.settings.mood = 'normal'; liminal.viewer.enterWalk()`);
  await evaluate(`document.querySelector('[data-act="resume"]')?.click()`);
  const start = await evaluate(`(() => { const v = liminal.viewer; v.renderer.setAnimationLoop(null); return [v.storeys.current, v.walk.walker.x]; })()`);
  assert.deepEqual(start, [1, 1.5]);
  // Gå fram til toppen: sklien begynner, og man er i etasje 1 (der bassenget er).
  const ride = await evaluate(`(() => { const v = liminal.viewer, w = v.walk.walker; v.walk.session.resume(); v.walk.input.consumeLook(); w.yaw = -Math.PI / 2; w.pitch = 0; v.walk.input.keys.add('KeyW');
    let shot = null;
    for (let i = 0; i < 900; i++) {
      v.walk.update(1 / 60, v.camera, v.flicker.values, []); v.storeys.follow();
      if (v.walk.rider.active && !shot && v.walk.rider.s > 3) { shot = { storey: v.storeys.current, y: +v.camera.position.y.toFixed(2) }; break; }
    }
    return shot; })()`);
  assert.ok(ride, 'the slide started');
  assert.equal(ride.storey, 0);
  await evaluate(`(() => { const v = liminal.viewer; v.world.update(1, [1, 1, 1, 1], v.camera); v.storeys.update(1, [1, 1, 1, 1], v.camera, [1, 1, 1]); v.postfx.render(1); })()`);
  assert.equal(await evaluate('liminal.viewer.renderer.info.programs.every(p => p.diagnostics?.runnable !== false)'), true);
  writeFileSync('node_modules/.cache/slide-drop.png', Buffer.from((await call('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  // Videre til man lander i bassenget.
  const landed = await evaluate(`(() => { const v = liminal.viewer, w = v.walk.walker; v.walk.session.resume();
    for (let i = 0; i < 900 && v.walk.rider.active; i++) { v.walk.update(1 / 60, v.camera, v.flicker.values, []); v.storeys.follow(); }
    v.walk.input.keys.clear();
    return { riding: v.walk.rider.active, storey: v.storeys.current, tile: v.walk.level.tiles[Math.floor(w.z) * 16 + Math.floor(w.x)], world: v.storeys.all.indexOf(v.world) }; })()`);
  assert.deepEqual(landed, { riding: false, storey: 0, tile: TILE.WATER, world: 0 });
  await evaluate('liminal.viewer.exitWalk(false)');
  await evaluate(`liminal.viewer.renderer.setAnimationLoop((t) => liminal.viewer._tick(t))`);
  console.log('PASS slide down: from floor 2 through the slab into the pool on floor 1');
}
