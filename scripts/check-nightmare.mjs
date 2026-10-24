import assert from 'node:assert/strict';
import { createLevel, TILE } from '../src/core/level.js';
import { autoLights } from '../src/core/ops.js';
import { encodeLevel } from '../src/core/serialize.js';
import { waitFor } from './browser-driver.mjs';

// Nightmare (gen/moods.js chase): tar monsteret deg, våkner du i starten av nivået, og kassettene
// du fant der, er spredt på nytt (view3d/nightmare.js wakeAtStart) – i stedet for noclip videre.
// Like etter at jakten begynner, brøler det (view3d/scary.js).
export async function checkNightmare(browser, origin) {
  const l = createLevel({ name: 'Nightmare check', theme: 'office', w: 18, h: 14 });
  for (let z = 1; z < 13; z++) for (let x = 1; x < 17; x++) l.tiles[z * l.w + x] = TILE.FLOOR;
  autoLights(l, { spacing: 4, state: 1 });
  l.spawn = { x: 3.5, z: 7, a: 0 };
  await browser.call('Page.navigate', { url: 'about:blank' });
  await browser.call('Page.navigate', { url: `${origin}/app/#room=${await encodeLevel(l)}` });
  await waitFor(() => browser.evaluate('Boolean(window.liminal?.viewer.world)').catch(() => false), 'nightmare room');
  const result = await browser.evaluate(`(async () => {
    const v = liminal.viewer, ex = v.explorer, w = v.walk.walker;
    liminal.layout.set('3d');
    v.updateSettings({ mood: 'nightmare' });
    v.enterWalk(); v.walk.session.resume();
    await ex.goDeeper();
    v.walk.session.resume();
    const level = v.walk.level, spawn = { ...level.spawn }, total = ex.total;
    const tape = ex.tapes.items[0], base = ex.hunt.progress.tapes; // fremgangen fra sjekkene før
    Object.assign(w, { x: tape.x, z: tape.z, floorY: tape.y });
    ex.update(0.016);
    const picked = { found: ex.found, saved: JSON.parse(localStorage.getItem('liminal.progress.v1')).tapes - base };
    // Strømmen går: monsteret begynner å jakte, og like etter brøler det (lyden må være på).
    if (!v.settings.sound) v.toggle('sound');
    ex.blackout.phase = 'dark'; ex.blackout.t = 30; ex.blackout.power = 0;
    ex.update(0.016);
    const ai = ex.scary.ai;
    const hunting = { state: ai.state, pending: ex.scary.roarIn !== null };
    for (let i = 0; i < 4; i++) ex.update(0.5);
    const roar = { roared: ex.scary.roarAgain > 15, pending: ex.scary.roarIn !== null, sound: v.walk.sound };
    // … og så står det rett ved siden av.
    Object.assign(ai, { state: 'hunt', x: w.x + 0.2, z: w.z });
    ex.update(0.016);
    const busy = ex.busy;
    await new Promise((r) => setTimeout(r, 1600));
    const progress = JSON.parse(localStorage.getItem('liminal.progress.v1'));
    const after = { depth: ex.depth, same: v.walk.level === level, found: ex.found, total: ex.total, left: ex.tapes.left,
      at: Math.hypot(w.x - spawn.x, w.z - spawn.z), busy: ex.busy, monster: ex.scary.ai?.state ?? 'none',
      title: document.querySelector('.hud-title')?.textContent ?? '', saved: progress.tapes - base };
    v.exitWalk(false);
    v.updateSettings({ mood: 'normal' });
    return { total, picked, hunting, roar, busy, after };
  })()`);
  assert.ok(result.total >= 1, `level 1 has tapes: ${JSON.stringify(result)}`);
  assert.deepEqual(result.picked, { found: 1, saved: 1 });
  assert.deepEqual(result.hunting, { state: 'hunt', pending: true }, 'the hunt begins with a roar on the way');
  assert.deepEqual(result.roar, { roared: true, pending: false, sound: true }, 'the roar plays shortly after');
  assert.equal(result.busy, true, 'being caught starts the wake-up');
  const a = result.after;
  assert.equal(a.depth, 1, 'no noclip to the next level');
  assert.equal(a.same, true);
  assert.ok(a.at < 0.6, `back at the start (${a.at.toFixed(2)} m away)`);
  assert.equal(a.found, 0, 'the tapes from this level are lost');
  assert.equal(a.saved, 0, 'and no longer counted in the saved progress');
  assert.equal(a.left, a.total, `all tapes are out again: ${JSON.stringify(a)}`);
  assert.equal(a.busy, false);
  assert.notEqual(a.monster, 'hunt');
  assert.match(a.title, /YOU WOKE UP/);
  assert.deepEqual(browser.errors, []);
  console.log('PASS nightmare: roar when the hunt begins, caught = wake at the start of the level with the tapes scattered again');
}
