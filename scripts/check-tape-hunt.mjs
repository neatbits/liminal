import assert from 'node:assert/strict';
import { createLevel, TILE } from '../src/core/level.js';
import { autoLights } from '../src/core/ops.js';
import { encodeLevel } from '../src/core/serialize.js';
import { waitFor } from './browser-driver.mjs';

// Kassettjakten: rommet fra editoren er åpent, genererte nivåer er låst til alle kassettene er
// funnet, summingen følger den nærmeste kassetten, og dypeste nivå og antall kassetter lagres.
export async function checkTapeHunt(browser, origin) {
  const l = createLevel({ name: 'Tape hunt check', theme: 'office', w: 18, h: 14 });
  for (let z = 1; z < 13; z++) for (let x = 1; x < 17; x++) l.tiles[z * l.w + x] = TILE.FLOOR;
  autoLights(l, { spacing: 4, state: 1 });
  l.spawn = { x: 3.5, z: 7, a: 0 };
  await browser.call('Page.navigate', { url: 'about:blank' });
  await browser.call('Page.navigate', { url: `${origin}/app/#room=${await encodeLevel(l)}` });
  await waitFor(() => browser.evaluate('Boolean(window.liminal?.viewer.world)').catch(() => false), 'tape hunt room');
  const result = await browser.evaluate(`(async () => {
    localStorage.removeItem('liminal.progress.v1');
    const v = liminal.viewer, ex = v.explorer, door = { info: { x: 0, z: 7 } };
    liminal.layout.set('3d');
    v.updateSettings({ mood: 'normal' });
    if (!v.settings.sound) v.toggle('sound'); // en tidligere sjekk kan ha slått av lyden
    v.enterWalk(); v.walk.session.resume();
    const home = { locked: ex.hunt.locked, prompt: v.walk.exitLock() };
    await ex.goDeeper(); // som noclip: ingen dør, aldri låst
    v.walk.session.resume();
    const level1 = { depth: ex.depth, total: ex.total, locked: ex.hunt.locked, prompt: v.walk.exitLock() };
    const first = ex.tapes.items[0], w = v.walk.walker;
    Object.assign(w, { x: first.x - 3, z: first.z, floorY: first.y, yaw: 0 }); // kassetten 3 m til høyre
    ex.hunt.update();
    const tapeHum = v.audio.graph?.tapeHum;
    const hum = { sound: v.walk.sound, graph: Boolean(v.audio.graph), hum: Boolean(tapeHum),
      pan: tapeHum?.panner ? tapeHum.panner.pan.value : null };
    // Tilbake til start: derfra kan kassettene nås (ellers åpnes døren med vilje, se TapeHunt.tryExit).
    const start = v.walk.level.spawn;
    Object.assign(w, { x: start.x, z: start.z, floorY: 0 });
    await ex.goDeeper({ door }); // låst
    const stayed = ex.depth;
    // Gå til hver kassett.
    for (const t of [...ex.tapes.items]) {
      Object.assign(v.walk.walker, { x: t.x, z: t.z, floorY: t.y });
      ex.update(0.016);
    }
    const opened = { left: ex.tapes.left, locked: ex.hunt.locked, prompt: v.walk.exitLock() };
    await ex.goDeeper({ door });
    const progress = JSON.parse(localStorage.getItem('liminal.progress.v1'));
    const extra = v.hud.walkbar.querySelector('.hud-extra').textContent;
    v.exitWalk(false);
    return { home, level1, hum, stayed, opened, depth: ex.depth, reached: progress, extra };
  })()`);
  assert.deepEqual(result.home, { locked: false, prompt: null }, 'the room from the editor stays open');
  assert.equal(result.level1.depth, 1);
  assert.ok(result.level1.total > 0, `level 1 has tapes: ${JSON.stringify(result.level1)}`);
  assert.equal(result.level1.locked, true);
  assert.match(result.level1.prompt, /locked · 📼 0\/\d/);
  assert.ok(result.hum.hum, `the nearest tape hums: ${JSON.stringify(result.hum)}`);
  assert.equal(result.stayed, 1, 'a locked door keeps you on the level');
  assert.deepEqual(result.opened, { left: 0, locked: false, prompt: null });
  assert.equal(result.reached.deepest, 2);
  assert.equal(result.reached.tapes, result.level1.total);
  assert.deepEqual(browser.errors, []);
  console.log('PASS tape hunt: home room open, locked generated exits, hum, pick-up unlock and saved progress', result.reached);
}
