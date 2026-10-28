// Gåing mellom etasjer i produksjonsbygget: opp en trapp til etasjen over (bytte midt på reposet,
// samme høyde i bygget, riktig verden og rom), ned igjen, og ut av gåmodus i etasje 1. Skjermbilder
// fra trappen og fra reposet ned trapperommet: node_modules/.cache/stairwell-*.png.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createLevel, TILE } from '../src/core/level.js';
import { encodeLevel } from '../src/core/serialize.js';
import { autoLights } from '../src/core/ops.js';
import { fillRect } from '../src/gen/util.js';
import { placeStairs } from '../src/core/stairs.js';
import { STAIR_THROUGH } from '../src/core/heights.js';
import { insertStorey, emptyStorey } from '../src/core/storeys.js';
import { waitFor } from './browser-driver.mjs';

/** Kontor: trapp opp fra x 3–7 (z 4) i etasje 1, reposet (8, 4) i et mindre rom i etasje 2. */
function building() {
  const level = createLevel({ name: 'Stairwell', theme: 'office', w: 14, h: 10, height: 2.8 });
  fillRect(level, 1, 1, 12, 8, TILE.FLOOR);
  autoLights(level, { spacing: 3, state: 1 });
  placeStairs(level, [3, 4], [7, 4]);
  for (let x = 3; x <= 7; x++) level.meta[4 * 14 + x] |= STAIR_THROUGH;
  const upper = emptyStorey(level);
  fillRect(upper, 6, 1, 12, 8, TILE.FLOOR);
  autoLights(upper, { spacing: 3, state: 1 });
  insertStorey(level, 1, upper);
  return level;
}

export async function checkStairwells(browser, origin) {
  const { call, evaluate } = browser;
  await call('Page.navigate', { url: 'about:blank' });
  await call('Page.navigate', { url: `${origin}/app/#room=${await encodeLevel(building())}` });
  await waitFor(() => evaluate(`window.liminal?.level.name === 'Stairwell' && Boolean(liminal.viewer.world)`).catch(() => false), 'stairwell room');
  await evaluate(`liminal.layout.set('3d')`);
  await evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
  // Normal stemning: ingen tilfeldige avvik (uendelige ganger flytter gåeren).
  await evaluate(`liminal.viewer.settings.mood = 'normal'; liminal.viewer.enterWalk()`);
  await evaluate(`document.querySelector('[data-act="resume"]')?.click()`);
  await evaluate(`(() => { const v = liminal.viewer; v.renderer.setAnimationLoop(null);
    window.__walk = (yaw, frames, until) => { v.walk.session.resume(); v.walk.input.consumeLook(); // pause og musebevegelse fra før
      const w = v.walk.walker; w.yaw = yaw; w.pitch = 0; v.walk.input.keys.add('KeyW');
      for (let i = 0; i < frames && !until(); i++) { v.walk.update(1 / 60, v.camera, v.flicker.values, []); v.storeys.follow(); }
      v.walk.input.keys.clear(); w.vx = w.vz = 0; };
    window.__state = () => { const v = liminal.viewer, s = v.storeys, w = v.walk.walker;
      return { storey: s.current, x: +w.x.toFixed(2), floorY: +w.floorY.toFixed(2), eye: +(v.camera.position.y - s.at[s.current]).toFixed(2),
        world: s.all.indexOf(v.world), level: v.walk.level.w === 14, at: s.at[s.current], visible: s.all.map(w => w.group.visible) }; };
    const w = v.walk.walker; w.x = 2.5; w.z = 4.5; w.floorY = 0; })()`);
  assert.equal(await evaluate('liminal.viewer.walk.paused'), false);
  const at = await evaluate('liminal.viewer.storeys.at');
  assert.equal(at.length, 2);
  assert.ok(at[1] > 2.8, `floor 2 at ${at[1]}`);

  // Opp: W mot +x til man står i etasje 2, forbi reposet.
  await evaluate(`__walk(-Math.PI / 2, 900, () => liminal.viewer.storeys.current === 1 && liminal.viewer.walk.walker.x > 9.6)`);
  const up = await evaluate('__state()');
  assert.equal(up.storey, 1, JSON.stringify(up));
  assert.equal(up.world, 1);
  assert.ok(up.x > 9.6 && Math.abs(up.floorY) < 0.05, JSON.stringify(up));
  assert.ok(Math.abs(up.eye - 1.62) < 0.15, `eye height on floor 2: ${up.eye}`);
  assert.deepEqual(up.visible, [true, true]);

  const shot = async (name, x, z, floorY, yaw, pitch) => {
    await evaluate(`(() => { const v = liminal.viewer, w = v.walk.walker; w.x = ${x}; w.z = ${z}; w.floorY = ${floorY}; w.yaw = ${yaw}; w.pitch = ${pitch};
      v.walk.update(1 / 600, v.camera, v.flicker.values, []); v.storeys.follow(); v.world.update(1, [1, 1, 1, 1], v.camera);
      v.storeys.update(1, [1, 1, 1, 1], v.camera, [1, 1, 1]); v.postfx.render(1); })()`);
    assert.equal(await evaluate('liminal.viewer.renderer.info.programs.every(p => p.diagnostics?.runnable !== false)'), true);
    writeFileSync(`node_modules/.cache/stairwell-${name}.png`, Buffer.from((await call('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  };
  await shot('down', 9.4, 4.5, 0, Math.PI / 2, -0.45); // fra reposet i etasje 2, ned trapperommet

  // Ned: W mot −x til man er tilbake i etasje 1 nedenfor trappen.
  await evaluate(`__walk(Math.PI / 2, 900, () => liminal.viewer.storeys.current === 0 && liminal.viewer.walk.walker.x < 2.6)`);
  const down = await evaluate('__state()');
  assert.equal(down.storey, 0, JSON.stringify(down));
  assert.equal(down.world, 0);
  assert.ok(down.x < 2.6 && Math.abs(down.floorY) < 0.05, JSON.stringify(down));
  assert.ok(Math.abs(down.eye - 1.62) < 0.15);
  await shot('up', 1.8, 4.5, 0, -Math.PI / 2, 0.35); // fra foten av trappen, opp mot reposet

  // Opp igjen og ut av gåmodus der oppe: oversikten får etasje 1 som verden.
  await evaluate(`__walk(-Math.PI / 2, 900, () => liminal.viewer.storeys.current === 1 && liminal.viewer.walk.walker.x > 9.6)`);
  const again = await evaluate(`({ ...__state(), drift: liminal.viewer.walk.drift.on, paused: liminal.viewer.walk.paused, mood: liminal.viewer.walk.mood?.id, loops: liminal.viewer.walk.loops?.loops?.length })`);
  assert.equal(again.storey, 1, JSON.stringify(again));
  await evaluate('liminal.viewer.exitWalk(false)');
  assert.deepEqual(await evaluate('[liminal.viewer.storeys.current, liminal.viewer.storeys.all.indexOf(liminal.viewer.world), liminal.viewer.walk.base]'), [0, 0, 0]);

  // Startpunktet i etasje 2: gåingen starter der, i riktig høyde.
  await evaluate(`(() => { liminal.level.spawnStorey = 1; liminal.level.storeys[0].spawn = { x: 10.5, z: 6.5, a: 0 }; liminal._rebuild(); liminal.viewer.enterWalk(); })()`);
  await evaluate(`document.querySelector('[data-act="resume"]')?.click()`);
  await evaluate(`(() => { const v = liminal.viewer; v.walk.update(1 / 60, v.camera, v.flicker.values, []); })()`);
  const start = await evaluate('__state()');
  assert.equal(start.storey, 1, JSON.stringify(start));
  assert.ok(Math.abs(start.eye - 1.62) < 0.15 && start.x === 10.5, JSON.stringify(start));
  await evaluate('liminal.viewer.exitWalk(false)');
  await evaluate(`liminal.viewer.renderer.setAnimationLoop((t) => liminal.viewer._tick(t))`);
  console.log('PASS stairwell: up the stairs to floor 2 (handover on the landing, same height), back down, exit on floor 2, start on floor 2');
}
