// Stige mellom etasjer i produksjonsbygget (core/ladders.js, view3d/climb.js), med eget tema per etasje:
// E ved foten, W opp gjennom hullet til etasje 2 (Poolrooms), E ved hullet ovenfra, S ned igjen.
// Skjermbilder: node_modules/.cache/ladder-{up,hole}.png.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createLevel, TILE } from '../src/core/level.js';
import { encodeLevel } from '../src/core/serialize.js';
import { autoLights } from '../src/core/ops.js';
import { fillRect } from '../src/gen/util.js';
import { insertStorey, emptyStorey } from '../src/core/storeys.js';
import { toggleLadder, ladders } from '../src/core/ladders.js';
import { waitFor } from './browser-driver.mjs';

function building() {
  const level = createLevel({ name: 'Ladder', theme: 'office', w: 12, h: 10, height: 2.8 });
  fillRect(level, 1, 1, 10, 8, TILE.FLOOR);
  autoLights(level, { spacing: 3, state: 1 });
  level.spawn = { x: 5.5, z: 6.5, a: 0 };
  const upper = emptyStorey(level);
  upper.theme = 'pool';
  fillRect(upper, 1, 1, 10, 8, TILE.FLOOR);
  autoLights(upper, { spacing: 3, state: 1 });
  insertStorey(level, 1, upper);
  toggleLadder(level, 0, 5, 4);
  return level;
}

export async function checkLadders(browser, origin) {
  const { call, evaluate } = browser;
  const room = building();
  const [{ dir }] = ladders(room);
  await call('Page.navigate', { url: 'about:blank' });
  await call('Page.navigate', { url: `${origin}/app/#room=${await encodeLevel(room)}` });
  await waitFor(() => evaluate(`window.liminal?.level.name === 'Ladder' && Boolean(liminal.viewer.world)`).catch(() => false), 'ladder room');
  await evaluate(`liminal.layout.set('3d')`);
  await evaluate(`liminal.viewer.settings.mood = 'normal'; liminal.viewer.enterWalk()`);
  await evaluate(`document.querySelector('[data-act="resume"]')?.click()`);
  await evaluate(`(() => { const v = liminal.viewer; v.renderer.setAnimationLoop(null);
    window.__step = (key, frames, until) => { v.walk.session.resume(); v.walk.input.consumeLook(); if (key) v.walk.input.keys.add(key);
      for (let i = 0; i < frames && !until(); i++) { v.walk.update(1 / 60, v.camera, v.flicker.values, []); v.storeys.follow(); }
      v.walk.input.keys.clear(); };
    window.__state = () => { const v = liminal.viewer, w = v.walk.walker;
      return { storey: v.storeys.current, climbing: v.walk.climb.active, x: +w.x.toFixed(2), z: +w.z.toFixed(2), y: +w.floorY.toFixed(2), theme: v.world.theme.id }; };
    window.__shot = (x, z, y, yaw, pitch) => { const w = v.walk.walker; Object.assign(w, { x, z, floorY: y, yaw, pitch });
      w.applyToCamera(v.camera); v.camera.position.y += v.walk.base; v.world.update(1, [1, 1, 1, 1], v.camera);
      v.storeys.update(1, [1, 1, 1, 1], v.camera, [1, 1, 1]); v.postfx.render(1);
      return v.renderer.domElement.toDataURL('image/png').split(',')[1]; }; })()`); // lerretet med en gang: et skjermbilde etterpå kan være tomt
  const yaw = Math.atan2(dir[0], dir[1]); // vendt mot stigen (bort fra utgangen dir)
  // Ved foten, vendt mot stigen: E – climb up.
  await evaluate(`(() => { const w = liminal.viewer.walk.walker; w.x = ${5.5 + dir[0] * 0.6}; w.z = ${4.5 + dir[1] * 0.6}; w.yaw = ${yaw}; w.pitch = 0; liminal.viewer.walk._prompt(); })()`);
  assert.equal(await evaluate(`document.querySelector('.hud-prompt').textContent`), 'E – climb up');
  await evaluate('liminal.viewer.walk.useDoor()');
  assert.equal(await evaluate('__state().climbing'), true, 'E takes hold of the ladder');
  // Halvveis opp, kikk opp gjennom hullet.
  await evaluate(`__step('KeyW', 50, () => false)`);
  const upShot = await evaluate(`(() => { const v = liminal.viewer, w = v.walk.walker; v.hud.fade(false, true); w.pitch = 0.75; w.applyToCamera(v.camera); v.camera.position.y += v.walk.base;
    // Tre ganger: det første bildet etter at animasjonen er stoppet kan bli svart mens skyggeleggerne kompileres.
    for (let i = 0; i < 3; i++) { v.world.update(1, [1, 1, 1, 1], v.camera); v.storeys.update(1, [1, 1, 1, 1], v.camera, [1, 1, 1]); v.postfx.render(1); }
    w.pitch = 0; return v.renderer.domElement.toDataURL('image/png').split(',')[1]; })()`);
  writeFileSync('node_modules/.cache/ladder-up.png', Buffer.from(upShot, 'base64'));
  await evaluate(`__step('KeyW', 600, () => liminal.viewer.storeys.current === 1)`);
  const up = await evaluate('__state()');
  assert.deepEqual({ storey: up.storey, climbing: up.climbing, y: up.y, theme: up.theme }, { storey: 1, climbing: false, y: 0, theme: 'pool' }, JSON.stringify(up));
  assert.ok(Math.abs(up.x - (5.5 + dir[0] * 0.85)) < 0.05 && Math.abs(up.z - (4.5 + dir[1] * 0.85)) < 0.05, JSON.stringify(up));
  // Oppe ved hullet, vendt mot det: E – climb down, så S til man står nede.
  await evaluate(`(() => { const w = liminal.viewer.walk.walker; w.yaw = ${yaw}; liminal.viewer.walk._prompt(); })()`);
  assert.equal(await evaluate(`document.querySelector('.hud-prompt').textContent`), 'E – climb down');
  const holeShot = await evaluate(`__shot(${5.5 + dir[0] * 1.6}, ${4.5 + dir[1] * 1.6}, 0, ${yaw}, -0.6)`);
  writeFileSync('node_modules/.cache/ladder-hole.png', Buffer.from(holeShot, 'base64'));
  await evaluate(`(() => { const w = liminal.viewer.walk.walker; w.x = ${5.5 + dir[0] * 0.85}; w.z = ${4.5 + dir[1] * 0.85}; w.yaw = ${yaw}; w.pitch = 0; })()`);
  await evaluate('liminal.viewer.walk.useDoor()');
  // Man henger på stigen også uten å trykke noe (før ble man satt av øverst med en gang).
  await evaluate(`__step(null, 30, () => false)`);
  const top = await evaluate('__state()');
  assert.deepEqual({ storey: top.storey, climbing: top.climbing, theme: top.theme }, { storey: 0, climbing: true, theme: 'office' }, JSON.stringify(top));
  assert.ok(top.y > 2.8, JSON.stringify(top));
  // Ned: man blir på sin side av stigen (mot utgangen) og vender fortsatt samme vei.
  assert.ok(Math.abs(top.x - (5.5 + dir[0] * 0.06)) < 0.01 && Math.abs(top.z - (4.5 + dir[1] * 0.06)) < 0.01, JSON.stringify(top));
  assert.ok(Math.abs(await evaluate('liminal.viewer.walk.walker.yaw') - yaw) < 1e-6, 'same facing when climbing down');
  await evaluate(`__step('KeyS', 600, () => !liminal.viewer.walk.climb.active)`);
  const down = await evaluate('__state()');
  assert.deepEqual({ storey: down.storey, climbing: down.climbing, y: down.y }, { storey: 0, climbing: false, y: 0 }, JSON.stringify(down));
  assert.equal(await evaluate('liminal.viewer.renderer.info.programs.every(p => p.diagnostics?.runnable !== false)'), true);
  // Opp igjen, bort fra hullet og tilbake fra baksiden av stigen: også derfra kan man klatre ned.
  await evaluate(`(() => { const w = liminal.viewer.walk.walker; w.x = ${5.5 + dir[0] * 0.6}; w.z = ${4.5 + dir[1] * 0.6}; w.yaw = ${yaw}; liminal.viewer.walk.useDoor(); })()`);
  await evaluate(`__step('KeyW', 600, () => liminal.viewer.storeys.current === 1)`);
  await evaluate(`(() => { const w = liminal.viewer.walk.walker; w.x = ${5.5 - dir[0] * 1.0}; w.z = ${4.5 - dir[1] * 1.0}; w.yaw = ${yaw + Math.PI}; liminal.viewer.walk._prompt(); })()`);
  assert.equal(await evaluate(`document.querySelector('.hud-prompt').textContent`), 'E – climb down', 'from behind the ladder');
  await evaluate('liminal.viewer.walk.useDoor()');
  const behind = await evaluate('__state()');
  assert.deepEqual({ storey: behind.storey, climbing: behind.climbing }, { storey: 0, climbing: true }, JSON.stringify(behind));
  assert.ok(Math.abs(behind.x - (5.5 + dir[0] * 0.06)) < 0.01, 'moved round to the climbing side');
  await evaluate('liminal.viewer.walk.climb.stop()');
  await evaluate('liminal.viewer.exitWalk(false)');
  await evaluate(`liminal.viewer.renderer.setAnimationLoop((t) => liminal.viewer._tick(t))`);
  console.log('PASS ladder: E at the foot, W up through the hole to floor 2 (own theme), E at the hole, S back down');
}
