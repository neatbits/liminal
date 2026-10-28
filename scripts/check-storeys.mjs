// Etasjer i produksjonsbygget: velgeren over skissen, pekerdrag i etasje 2, angre/gjør om, Page Up/Down,
// kopi og fjerning, delingslenke, 3D-stabelen (bassenget henger ned under etasje 2) og gåmodus.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createLevel, TILE } from '../src/core/level.js';
import { encodeLevel } from '../src/core/serialize.js';
import { autoLights } from '../src/core/ops.js';
import { fillRect } from '../src/gen/util.js';
import { insertStorey, copyStorey } from '../src/core/storeys.js';
import { waitFor } from './browser-driver.mjs';

/** Hotell med to rom og en gang i etasje 1, og samme plan med et basseng i etasje 2. */
function building() {
  const level = createLevel({ name: 'Two floors', theme: 'hotel', w: 16, h: 12, height: 2.8 });
  fillRect(level, 1, 1, 6, 10, TILE.FLOOR);
  fillRect(level, 9, 1, 14, 10, TILE.FLOOR);
  fillRect(level, 7, 5, 8, 6, TILE.FLOOR);
  autoLights(level, { spacing: 3, state: 1 });
  const upper = copyStorey(level, 0);
  fillRect(upper, 10, 3, 13, 8, TILE.WATER);
  upper.depths.fill(20);
  insertStorey(level, 1, upper);
  return level;
}

export async function checkStoreys(browser, origin) {
  const { call, evaluate } = browser;
  await call('Page.navigate', { url: 'about:blank' });
  await call('Page.navigate', { url: `${origin}/app/#room=${await encodeLevel(building())}` });
  const ready = () => waitFor(() => evaluate(`window.liminal?.level.name === 'Two floors' && Boolean(liminal.viewer.world)`).catch(() => false), 'two-floor room');
  await ready();
  await evaluate(`liminal.layout.set('split')`);
  const frames = () => evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
  const built = () => waitFor(() => evaluate('!liminal._pending3D'), '3D rebuild');
  const state = () => evaluate(`({ storey: liminal.editor.storey, n: 1 + (liminal.level.storeys?.length ?? 0), label: document.querySelector('.storey-label').textContent,
    worlds: liminal.viewer.storeys.worlds.length, shown: liminal.viewer.storeys.worlds.filter(w => w.group.visible).length })`);
  const key = async (key, code = key) => {
    for (const type of ['keyDown', 'keyUp']) await call('Input.dispatchKeyEvent', { type, key, code, windowsVirtualKeyCode: { PageUp: 33, PageDown: 34 }[key] ?? 0 });
  };
  await frames();
  assert.deepEqual(await state(), { storey: 0, n: 2, label: 'Floor 1 / 2', worlds: 1, shown: 0 });

  // Etasje 2: tegn gulv med musa – etasje 1 er urørt, og Ctrl+Z angrer i etasje 2.
  await key('PageUp');
  await built();
  assert.deepEqual(await state(), { storey: 1, n: 2, label: 'Floor 2 / 2', worlds: 1, shown: 1 });
  await evaluate(`liminal.setTool('floor')`);
  const points = await evaluate(`(() => { const e = liminal.editor, r = e.canvas.getBoundingClientRect();
    return [[7, 2], [8, 2]].map(([x, z]) => { const p = e.view.toScreen(x + .5, z + .5); return { x: p[0] + r.left, y: p[1] + r.top }; }); })()`);
  await call('Input.dispatchMouseEvent', { type: 'mouseMoved', ...points[0] });
  await call('Input.dispatchMouseEvent', { type: 'mousePressed', ...points[0], button: 'left', buttons: 1, clickCount: 1 });
  await call('Input.dispatchMouseEvent', { type: 'mouseMoved', ...points[1], button: 'left', buttons: 1 });
  await call('Input.dispatchMouseEvent', { type: 'mouseReleased', ...points[1], button: 'left', buttons: 0, clickCount: 1 });
  const cells = `[liminal.level.tiles[2 * 16 + 7], liminal.level.storeys[0].tiles[2 * 16 + 7], liminal.level.storeys[0].tiles[2 * 16 + 8]]`;
  assert.deepEqual(await evaluate(cells), [TILE.WALL, TILE.FLOOR, TILE.FLOOR]);
  await evaluate(`liminal.layout.set('2d')`);
  await frames();
  writeFileSync('node_modules/.cache/storeys-2d.png', Buffer.from((await call('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  await key('PageDown');
  for (const type of ['keyDown', 'keyUp']) await call('Input.dispatchKeyEvent', { type, key: 'z', code: 'KeyZ', modifiers: 2, windowsVirtualKeyCode: 90 });
  assert.deepEqual(await evaluate(cells), [TILE.WALL, TILE.WALL, TILE.WALL]);
  assert.equal(await evaluate('liminal.editor.storey'), 1, 'undo shows the floor it changed');
  await evaluate(`liminal.editor.redo()`);
  assert.deepEqual(await evaluate(cells), [TILE.WALL, TILE.FLOOR, TILE.FLOOR]);

  // Kopi, ny tom etasje og fjerning via knappene – alt kan angres.
  const click = (title) => evaluate(`document.querySelector('.storey-bar [title^="${title}"]').click()`);
  await click('Duplicate');
  assert.deepEqual(await evaluate(`[liminal.editor.storey, liminal.level.storeys.length, liminal.level.storeys[1].tiles[2 * 16 + 7]]`), [2, 2, TILE.FLOOR]);
  await click('Add an empty');
  assert.deepEqual(await evaluate(`[liminal.editor.storey, liminal.level.storeys.length, liminal.level.storeys[2].tiles.every(t => t === 0)]`), [3, 3, true]);
  await click('Remove');
  assert.deepEqual(await evaluate(`[liminal.editor.storey, liminal.level.storeys.length]`), [2, 2]);
  await evaluate(`liminal.editor.undo()`);
  assert.equal(await evaluate(`liminal.level.storeys.length`), 3);
  await click('Remove'); // angringen beholdt etasje 3 (kopien) som valgt etasje
  await evaluate(`liminal.layout.set('split')`); // bare 2D: 3D bygges først når det vises (check-hidden-3d)
  await built();
  assert.deepEqual(await state(), { storey: 1, n: 3, label: 'Floor 2 / 3', worlds: 2, shown: 1 });
  assert.equal(await evaluate(`liminal.level.storeys[1].tiles.every(t => t === 0)`), true);

  // Delingslenken tar med alle etasjene.
  await evaluate(`[...document.querySelectorAll('.menu-list button')].find(b => b.textContent.includes('Share link')).click()`);
  await waitFor(() => evaluate(`Boolean(document.querySelector('.share-link'))`), 'storey share link');
  const shared = await evaluate(`document.querySelector('.share-link').value`);
  await call('Page.navigate', { url: 'about:blank' });
  await call('Page.navigate', { url: shared });
  await ready();
  assert.deepEqual(await evaluate(`[liminal.level.storeys.length, liminal.level.storeys[0].tiles[2 * 16 + 7], liminal.level.storeys[0].tiles[3 * 16 + 10]]`), [2, TILE.FLOOR, TILE.WATER]);

  // 3D: etasje 2 over etasje 1, bassenget henger ned som en kasse i rommet under (2,1 m fri høyde).
  await evaluate(`liminal.layout.set('3d')`);
  await key('PageUp');
  await key('PageUp');
  await built();
  await frames();
  const elevations = await evaluate(`liminal.viewer.storeys.worlds.map(w => w.group.position.y)`);
  assert.equal(elevations.length, 2);
  assert.ok(Math.abs(elevations[0] - (2.1 + 0.3 + 2)) < 1e-6, `floor 2 at ${elevations[0]}`);
  assert.deepEqual(await evaluate(`(() => { const g = liminal.viewer.storeys.levels[0]; return [g.ceilings[3 * 16 + 10], g.ceilings[3 * 16 + 2]]; })()`), [21, 0]);
  assert.ok(elevations[1] > elevations[0] + 2.8);
  await evaluate(`(() => { const v = liminal.viewer; v.renderer.setAnimationLoop(null); v.overview.go('perspective', true); v.world.update(1, [1, 1, 1, 1]); v.storeys.update(1, [1, 1, 1, 1], v.camera, [1, 1, 1]); v.postfx.render(1); })()`);
  assert.equal(await evaluate('liminal.viewer.renderer.getContext().isContextLost()'), false);
  assert.equal(await evaluate('liminal.viewer.renderer.info.programs.every(p => p.diagnostics?.runnable !== false)'), true);
  writeFileSync('node_modules/.cache/storeys-3d.png', Buffer.from((await call('Page.captureScreenshot', { format: 'png' })).data, 'base64'));

  // Gåmodus: man starter i etasje 1; bare etasjen over (opp trapperommet) vises, ikke den øverste.
  await evaluate(`liminal.viewer.enterWalk()`);
  assert.deepEqual(await evaluate(`liminal.viewer.storeys.all.map(w => w.group.visible)`), [true, true, false]);
  await evaluate(`liminal.viewer.exitWalk(false)`);
  assert.equal(await evaluate(`liminal.viewer.storeys.worlds.filter(w => w.group.visible).length`), 2);
  await evaluate(`liminal.viewer.renderer.setAnimationLoop((t) => liminal.viewer._tick(t))`);
  console.log('PASS floors: selector, drawing on floor 2, undo/redo per floor, Page Up/Down, duplicate/add/remove, sharing, stacked 3D with hanging pool, walk shows the floor above');
}
