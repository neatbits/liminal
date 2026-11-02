// Et ekte generert bygg (gen/mixed-floors.js) i produksjonsbygget: tre etasjer med hvert sitt tema, opp
// fra etasje 1 til 3 med trappen og stigen slik de ble lagt, kassetter i alle etasjene, ingen feil i
// skyggeleggerne. Skriver byggetiden per etasje. Skjermbilder: node_modules/.cache/mixed-floor-*.png.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { encodeLevel } from '../src/core/serialize.js';
import { storeyCount, storeyLevel } from '../src/core/storeys.js';
import { walkLevels } from '../src/core/stairwells.js';
import { mulberry32 } from '../src/core/rng.js';
import { nextLevel } from '../src/gen/endless.js';
import { waitFor } from './browser-driver.mjs';

/** Et bygg med tre ulike temaer og både trapp og stige, hvis det finnes blant de første nivåene. */
function building() {
  const rand = mulberry32(2026);
  let spare = null;
  for (let depth = 1; depth < 500; depth++) {
    const { level, kind } = nextLevel(depth, 'backrooms', rand, { corridor: 0 }, 1);
    if (kind !== 'room' || storeyCount(level) !== 3) continue;
    const themes = new Set([0, 1, 2].map((k) => storeyLevel(level, k).theme));
    if (themes.size !== 3) continue;
    const { wells } = walkLevels(level);
    if (wells.length === 1) return Object.assign(level, { name: 'Mixed floors' });
    spare ??= level;
  }
  return Object.assign(spare, { name: 'Mixed floors' });
}

/** New room med tre etasjer, Random i sidepanelet, Ctrl+Z, og «This floor only» som lar de andre etasjene være. */
async function checkEditor(browser, origin) {
  const { call, evaluate } = browser;
  await call('Page.navigate', { url: 'about:blank' });
  await call('Page.navigate', { url: `${origin}/app/` });
  await waitFor(() => evaluate('Boolean(window.liminal?.level && window.liminal?.viewer.world) && Boolean(document.querySelector(".modal"))').catch(() => false), 'New room');
  const made = await evaluate(`(() => {
    const selects = document.querySelectorAll('.modal-body select');
    const [theme, w, h, floors] = selects;
    floors.value = '8'; w.value = '128'; h.value = '128'; w.dispatchEvent(new Event('change'));
    const capped = floors.value === '3' && floors.options[3].disabled;
    if (!capped) throw new Error('big rooms offer at most three floors');
    theme.value = 'office'; w.value = '32'; h.value = '32'; w.dispatchEvent(new Event('change')); floors.value = '3';
    floors.dispatchEvent(new Event('change'));
    const mix = document.querySelector('.modal-body .row-toggle');
    const hiddenBefore = getComputedStyle(mix).display === 'none';
    [...document.querySelectorAll('.modal .card')].find((c) => c.textContent.includes('Randomly generated')).click();
    return { hiddenBefore, shown: getComputedStyle(mix).display !== 'none', label: floors.closest('.row').textContent.startsWith('Floors') };
  })()`);
  assert.deepEqual(made, { hiddenBefore: true, shown: true, label: true }, JSON.stringify(made));
  // Med et utkast fra før er «Continue» hovedknappen, så knappen velges på teksten.
  await evaluate(`liminal.dirty = false; [...document.querySelectorAll('.modal-foot button')].find((b) => b.textContent === 'Create room').click()`);
  await waitFor(() => evaluate(`!document.querySelector('.modal') && liminal.level.storeys?.length === 2`), 'three floors from New room');
  assert.equal(new Set(await evaluate(`[liminal.level.theme, ...liminal.level.storeys.map((s) => s.theme)]`)).size, 3, 'a theme per floor');
  const click = (text) => evaluate(`[...document.querySelectorAll('.seed-row button')].find((b) => b.textContent.includes(${JSON.stringify(text)})).click()`);
  const floors = () => evaluate('1 + (liminal.level.storeys?.length ?? 0)');
  const seed = () => evaluate('liminal.level.seed');
  await evaluate(`liminal.editor.setStorey(2)`);
  const before = await seed();
  await evaluate(`document.querySelector('select[title^="How many floors"]').value = '2'`);
  await click('🎲 Random');
  assert.equal(await floors(), 2, 'Random builds the chosen number of floors');
  assert.equal(await evaluate('liminal.editor.storey'), 0, 'back on the ground floor');
  const first = await evaluate(`[liminal.level.seed, Array.from(liminal.level.storeys[0].tiles).join('')]`);
  await evaluate(`document.querySelector('#btn-undo').click()`);
  assert.equal(await floors(), 3, 'Ctrl+Z brings the old building back');
  assert.equal(await seed(), before);
  // Samme frø: samme bygg.
  await evaluate(`(() => { const input = document.querySelector('.seed-row input'); input.value = ${JSON.stringify(String(first[0]))}; })()`);
  await click('Generate');
  assert.deepEqual(await evaluate(`[liminal.level.seed, Array.from(liminal.level.storeys[0].tiles).join('')]`), first, 'same seed, same building');
  // Bare etasjen man tegner: resten av bygget står.
  await evaluate(`liminal.editor.setStorey(1); document.querySelector('select[title^="How many floors"]').value = 'this'`);
  const ground = await evaluate(`Array.from(liminal.level.tiles).join('')`);
  await click('🎲 Random');
  assert.equal(await floors(), 2);
  assert.equal(await evaluate(`Array.from(liminal.level.tiles).join('')`), ground, 'This floor only leaves the floor below');
  assert.notEqual(await evaluate(`Array.from(liminal.level.storeys[0].tiles).join('')`), first[1]);
  console.log('PASS editor floors: New room with three themed floors, Random, undo, same seed, This floor only');
}

const yawTo = ([dx, dz]) => Math.atan2(-dx, -dz); // W går i retning (−sin yaw, −cos yaw)

export async function checkMixedFloors(browser, origin) {
  const { call, evaluate } = browser;
  await checkEditor(browser, origin);
  const room = building();
  const { levels, wells } = walkLevels(room);
  await call('Page.navigate', { url: 'about:blank' });
  await call('Page.navigate', { url: `${origin}/app/#room=${await encodeLevel(room)}` });
  await waitFor(() => evaluate(`window.liminal?.level.name === 'Mixed floors' && Boolean(liminal.viewer.world)`).catch(() => false), 'mixed building');
  await evaluate(`liminal.layout.set('3d')`);
  await evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
  const build = await evaluate(`(() => { const v = liminal.viewer, t = performance.now(); v.setLevel(liminal.level, { explorer: true }); const ms = performance.now() - t;
    return { ms: Math.round(ms), floors: v.storeys.all.map((w) => Math.round(w.stats.ms)) }; })()`);
  await evaluate(`liminal.viewer.settings.mood = 'normal'; liminal.viewer.enterWalk()`);
  await evaluate(`document.querySelector('[data-act="resume"]')?.click()`);
  await evaluate(`(() => { const v = liminal.viewer; v.renderer.setAnimationLoop(null);
    window.__step = (key, frames, until) => { v.walk.session.resume(); v.walk.input.consumeLook(); if (key) v.walk.input.keys.add(key);
      for (let i = 0; i < frames && !until(); i++) { v.walk.update(1 / 60, v.camera, v.flicker.values, []); v.storeys.follow(); }
      v.walk.input.keys.clear(); };
    window.__state = () => { const w = v.walk.walker; return { storey: v.storeys.current, climbing: v.walk.climb.active, x: +w.x.toFixed(2), z: +w.z.toFixed(2), y: +w.floorY.toFixed(2), theme: v.world.theme.id }; };
    window.__put = (x, z, yaw) => { const w = v.walk.walker; Object.assign(w, { x, z, yaw, pitch: 0, floorY: 0, vx: 0, vz: 0, vy: 0 }); };
    window.__shot = (pitch) => { const w = v.walk.walker; v.hud.fade(false, true); w.pitch = pitch; w.applyToCamera(v.camera); v.camera.position.y += v.walk.base;
      for (let i = 0; i < 3; i++) { v.world.update(1, [1, 1, 1, 1], v.camera); v.storeys.update(1, [1, 1, 1, 1], v.camera, [1, 1, 1]); v.postfx.render(1); }
      w.pitch = 0; return v.renderer.domElement.toDataURL('image/png').split(',')[1]; }; })()`);
  assert.deepEqual(await evaluate(`[...new Set(liminal.viewer.explorer.tapes.items.map((t) => t.storey))].sort()`), [0, 1, 2], 'tapes on every floor');

  const shot = async (name, pitch = 0) => writeFileSync(`node_modules/.cache/mixed-floor-${name}.png`, Buffer.from(await evaluate(`__shot(${pitch})`), 'base64'));
  const links = [];
  for (let k = 0; k < 2; k++) {
    const well = wells.find((x) => x.k === k);
    if (well) {
      const before = well.run[0] - well.dir[0] - well.dir[1] * room.w;
      await evaluate(`__put(${(before % room.w) + 0.5}, ${Math.floor(before / room.w) + 0.5}, ${yawTo(well.dir)})`);
      await shot(`${k}-stairs`, 0.15);
      await evaluate(`__step('KeyW', 1500, () => liminal.viewer.storeys.current === ${k + 1})`);
      links.push(`stairs (${well.gap.toFixed(1)} m, ${well.run.length} cells)`);
    } else {
      const l = levels[k].ladders[0];
      await evaluate(`__put(${l.x + 0.5 + l.dir[0] * 0.6}, ${l.z + 0.5 + l.dir[1] * 0.6}, ${yawTo([-l.dir[0], -l.dir[1]])}); liminal.viewer.walk.useDoor()`);
      assert.equal(await evaluate('__state().climbing'), true, `ladder on floor ${k + 1}`);
      await shot(`${k}-ladder`, 0.7);
      await evaluate(`__step('KeyW', 1500, () => liminal.viewer.storeys.current === ${k + 1})`);
      links.push(`ladder (${l.gap.toFixed(1)} m)`);
    }
    const s = await evaluate('__state()');
    assert.deepEqual({ storey: s.storey, climbing: s.climbing, theme: s.theme }, { storey: k + 1, climbing: false, theme: storeyLevel(room, k + 1).theme }, JSON.stringify(s));
    await shot(`${k + 1}-arrival`);
  }
  assert.equal(await evaluate('liminal.viewer.renderer.info.programs.every(p => p.diagnostics?.runnable !== false)'), true);
  await evaluate('liminal.viewer.exitWalk(false)');
  await evaluate(`liminal.viewer.renderer.setAnimationLoop((t) => liminal.viewer._tick(t))`);
  console.log(`PASS mixed floors: ${[0, 1, 2].map((k) => storeyLevel(room, k).theme).join(' / ')} via ${links.join(', ')}; ${room.w}x${room.h}, build ${build.ms} ms (${build.floors.join(' + ')})`);
}
