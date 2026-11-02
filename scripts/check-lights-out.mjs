// Lights out (Game mode, view3d/lights-out.js) i produksjonsbygget: strømmen er borte på Level 1, dørene
// er låst, E ved hvert sikringsskap gir mer lys, og når alle er på, åpner døren seg til Level 2 – der det
// er mørkt igjen med nye skap.
import assert from 'node:assert/strict';
import { waitFor } from './browser-driver.mjs';
import { DARK_POWER } from '../src/gen/fuses.js';

export async function checkLightsOut(browser, origin) {
  const { call, evaluate } = browser;
  await call('Page.navigate', { url: 'about:blank' });
  await call('Page.navigate', { url: `${origin}/app/#lights` });
  await waitFor(() => evaluate(`Boolean(window.liminal?.viewer.world && document.querySelector('.modal[aria-label="Game mode"]'))`).catch(() => false), 'game mode dialog');
  await evaluate(`(() => { const m = document.querySelector('.modal[aria-label="Game mode"]'); liminal.layout.set('3d');
    [...m.querySelectorAll('.card')].find((c) => c.textContent.startsWith('Normal')).click();
    m.querySelector('.btn-accent').click(); })()`);
  await waitFor(() => evaluate(`liminal.viewer.explorer.depth === 1 && !liminal.viewer.explorer.busy && liminal.viewer.explorer.lightsOut.fuses.total > 0`).catch(() => false), 'Level 1 without power');
  const result = await evaluate(`(() => { const v = liminal.viewer, ex = v.explorer, lo = ex.lightsOut, w = v.walk.walker; v.renderer.setAnimationLoop(null); v.walk.session.resume();
    ex.update(1 / 30);
    const start = { total: lo.fuses.total, power: +lo.power.toFixed(3), locked: ex.hunt.locked, tapes: ex.tapes.left, prompt: v.walk.exitLock(), extra: document.querySelector('.hud-extra').textContent };
    const steps = [];
    for (const f of [...lo.fuses.items]) {
      // Foran skapet, vendt mot det.
      Object.assign(w, { x: f.px - f.wall[0] * 0.8, z: f.pz - f.wall[1] * 0.8, yaw: Math.atan2(-f.wall[0], -f.wall[1]), pitch: 0 });
      v.walk._prompt();
      const prompt = document.querySelector('.hud-prompt').textContent;
      v.walk.useDoor();
      for (let i = 0; i < 60; i++) ex.update(1 / 30); // blinkingen er over
      steps.push({ prompt, on: f.on, power: +lo.power.toFixed(3) });
    }
    const opened = { locked: ex.hunt.locked, power: lo.power, prompt: v.walk.exitLock() };
    return { start, steps, opened };
  })()`);
  assert.ok(result.start.total >= 2, JSON.stringify(result.start));
  assert.equal(result.start.power, DARK_POWER, 'Level 1 starts without power');
  assert.equal(result.start.locked, true);
  assert.equal(result.start.tapes, 0, 'no tapes in Lights out');
  assert.match(result.start.prompt, /power is out · ⚡ 0\//);
  assert.match(result.start.extra, /LIGHTS OUT · LEVEL 1 · ⚡ 0\//);
  result.steps.forEach((s, i) => {
    assert.equal(s.prompt, 'E – switch on the power', JSON.stringify(s));
    assert.equal(s.on, true);
    if (i) assert.ok(s.power > result.steps[i - 1].power, 'more light for each fuse box');
  });
  assert.deepEqual(result.opened, { locked: false, power: 1, prompt: null });
  const next = await evaluate(`(async () => { const ex = liminal.viewer.explorer; await ex.goDeeper({ door: {} }); ex.update(1 / 30);
    const out = { depth: ex.depth, power: +ex.lightsOut.power.toFixed(3), total: ex.lightsOut.fuses.total, on: ex.lightsOut.fuses.items.filter((f) => f.on).length };
    liminal.viewer.exitWalk(false); liminal.viewer.renderer.setAnimationLoop((t) => liminal.viewer._tick(t));
    return { ...out, after: ex.lightsOut.active }; })()`);
  assert.deepEqual({ ...next, total: next.total > 0 }, { depth: 2, power: DARK_POWER, total: true, on: 0, after: false });
  console.log(`PASS lights out: dark Level 1, ${result.start.total} fuse boxes, more light each, open door, dark Level 2`);
}
