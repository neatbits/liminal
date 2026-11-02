// Spot the wrong og The Descent i produksjonsbygget: fra lenken og gjennom sidene, riktig og galt svar, seier,
// batteri, batterifunn, å bli tatt, resultatsiden og at stemningen spilleren hadde, er tilbake etterpå.
import assert from 'node:assert/strict';
import { waitFor } from './browser-driver.mjs';

const ready = (name) => `Boolean(window.liminal?.viewer.world && document.querySelector('.modal[aria-label="${name}"]'))`;

async function open(browser, origin, hash, name) {
  const { call, evaluate } = browser;
  await call('Page.navigate', { url: 'about:blank' });
  await call('Page.navigate', { url: `${origin}/app/#${hash}` });
  await waitFor(() => evaluate(ready(name)).catch(() => false), name);
  await evaluate(`(() => { liminal.layout.set('3d'); liminal.viewer.updateSettings({ mood: 'liminal' }); localStorage.removeItem('liminal.runs.v1');
    document.querySelector('.modal[aria-label="${name}"] .btn-accent').click(); })()`);
}

const THROUGH = `
  const v = liminal.viewer, ex = v.explorer, spot = ex.spot;
  const idle = async () => { for (let i = 0; i < 300 && ex.busy; i++) await new Promise((r) => setTimeout(r, 20)); };
  const go = async (right) => {
    await idle();
    const wrong = !!spot.run.round.change;
    const x = (right ? wrong : !wrong) ? v.walk.level.spot.back : v.walk.level.spot.onward;
    await ex.goDeeper({ door: { info: { x } } });
    await idle();
  };
`;

export async function checkModes(browser, origin) {
  const { evaluate } = browser;
  await open(browser, origin, 'spot', 'Spot the wrong');
  await waitFor(() => evaluate('Boolean(liminal.viewer.explorer.spot.run && !liminal.viewer.explorer.busy)').catch(() => false), 'first corridor');
  const spot = await evaluate(`(async () => {${THROUGH}
    const start = { mood: v.settings.mood, change: spot.run.round.change, tapes: ex.tapes.items.length, spot: !!v.walk.level.spot, mode: v.mode };
    await go(true);
    const one = spot.run.streak;
    await go(false);
    const zero = spot.run.streak;
    const after = { change: spot.run.round.change };
    for (let i = 0; i < 40 && spot.active; i++) await go(true);
    return { start, one, zero, after, ended: !spot.active, mode: v.mode, mood: v.settings.mood,
      saved: JSON.parse(localStorage.getItem('liminal.runs.v1')).spot, page: document.querySelector('.modal')?.getAttribute('aria-label') };
  })()`);
  assert.deepEqual(spot.start, { mood: 'normal', change: null, tapes: 0, spot: true, mode: 'walk' }, 'starts in the plain corridor');
  assert.equal(spot.one, 1, 'the right door counts');
  assert.equal(spot.zero, 0, 'the wrong door starts over');
  assert.equal(spot.after.change, null, 'after a mistake you see the corridor as it was');
  assert.equal(spot.ended, true);
  assert.equal(spot.mode, 'overview');
  assert.equal(spot.mood, 'liminal', 'the mood the player had is back');
  assert.equal(spot.saved.wins, 1);
  assert.equal(spot.page, 'Spot the wrong complete');

  await open(browser, origin, 'descent', 'The Descent');
  await waitFor(() => evaluate('Boolean(liminal.viewer.explorer.descent.run && liminal.viewer.explorer.depth === 1 && !liminal.viewer.explorer.busy)').catch(() => false), 'level 1');
  const descent = await evaluate(`(async () => {
    const v = liminal.viewer, ex = v.explorer, d = ex.descent, w = v.walk.walker, lamp = v.walk.flashlight;
    v.renderer.setAnimationLoop(null);
    const idle = async () => { for (let i = 0; i < 400 && ex.busy; i++) await new Promise((r) => setTimeout(r, 20)); };
    const first = { mood: v.settings.mood, tapes: ex.tapes.items.length, batteries: d.batteries.items.length, hud: d.extra() };
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF', bubbles: true }));
    lamp.update(10, v.camera);
    const used = lamp.battery;
    const tape = ex.tapes.items[0]; // batteriet lengst unna: kassetten skal ikke plukkes opp samtidig
    const b = [...d.batteries.items].sort((p, q) => Math.hypot(q.x - tape.x, q.z - tape.z) - Math.hypot(p.x - tape.x, p.z - tape.z))[0];
    Object.assign(w, { x: b.x, z: b.z, floorY: b.y });
    ex.update(0.016);
    const topped = lamp.battery;
    const locked = ex.hunt.locked;
    await ex.goDeeper({ door: { info: { x: 0, z: 0 } } });
    const stayed = ex.depth;
    for (const t of [...ex.tapes.items]) { Object.assign(w, { x: t.x, z: t.z, floorY: t.y }); ex.update(0.016); }
    await ex.goDeeper({ door: { info: { x: 0, z: 0 } } });
    await idle();
    const two = { depth: ex.depth, mood: v.settings.mood, battery: lamp.battery };
    while (ex.depth < 4) { await ex.goDeeper(); await idle(); }
    const deep = { depth: ex.depth, lethal: d.lethal, mood: v.settings.mood, tapes: ex.tapes.items.length };
    await d.die();
    await idle();
    await new Promise((r) => setTimeout(r, 50));
    return { first, used, topped, locked, stayed, two, deep, ended: !d.active, limited: lamp.limited, mood: v.settings.mood, mode: v.mode,
      saved: JSON.parse(localStorage.getItem('liminal.runs.v1')).descent, page: document.querySelector('.modal')?.getAttribute('aria-label') };
  })()`);
  assert.equal(descent.first.mood, 'abandoned');
  assert.equal(descent.first.tapes, 1, 'one tape on the first level');
  assert.equal(descent.first.batteries, 2);
  assert.match(descent.first.hud, /DESCENT · LEVEL 1 · 🔋 100 %/);
  assert.ok(descent.used < 1, `the battery runs down: ${descent.used}`);
  assert.ok(descent.topped > descent.used, 'a battery tops it up');
  assert.equal(descent.locked, true);
  assert.equal(descent.stayed, 1, 'the door stays shut until the tape is found');
  assert.equal(descent.two.depth, 2);
  assert.ok(descent.two.battery > 0.9, 'the battery goes with you');
  assert.equal(descent.deep.lethal, true);
  assert.equal(descent.deep.mood, 'uncanny');
  assert.equal(descent.deep.tapes, 2);
  assert.equal(descent.ended, true);
  assert.equal(descent.limited, false, 'the flashlight is back to normal');
  assert.equal(descent.mood, 'liminal', 'the mood the player had is back');
  assert.equal(descent.mode, 'overview');
  assert.deepEqual([descent.saved.runs, descent.saved.bestDepth], [1, 4], 'counted once');
  assert.equal(descent.page, 'The Descent is over');
  assert.deepEqual(browser.errors, []);
  console.log('PASS game modes: Spot the wrong (right, wrong, win) and The Descent (battery, locked door, mood, death, records)');
}
