// Bare 2D vises: maling bygger ikke 3D (app._schedule3D) og 3D tegnes ikke (viewer.hidden). Når 3D
// vises igjen – eller man går i rommet – bygges det én gang med alle endringene.
import assert from 'node:assert/strict';
import { createLevel, TILE } from '../src/core/level.js';
import { encodeLevel } from '../src/core/serialize.js';
import { autoLights } from '../src/core/ops.js';
import { fillRect } from '../src/gen/util.js';
import { waitFor } from './browser-driver.mjs';

function room() {
  const level = createLevel({ name: 'Hidden 3D', theme: 'office', w: 20, h: 14, height: 2.8 });
  fillRect(level, 1, 1, 18, 12, TILE.FLOOR);
  autoLights(level, { spacing: 3, state: 1 });
  return level;
}

export async function checkHidden3D(browser, origin) {
  const { call, evaluate } = browser;
  await call('Page.navigate', { url: 'about:blank' });
  await call('Page.navigate', { url: `${origin}/app/#room=${await encodeLevel(room())}` });
  await waitFor(() => evaluate(`window.liminal?.level.name === 'Hidden 3D' && Boolean(liminal.viewer.world)`).catch(() => false), 'hidden-3d room');
  await evaluate(`liminal.layout.set('2d')`);
  await evaluate(`(() => { const a = liminal; window.__builds = 0; const orig = a.viewer.setLevel.bind(a.viewer);
    a.viewer.setLevel = (...x) => (window.__builds++, orig(...x));
    window.__frames = 0; const render = a.viewer.postfx.render.bind(a.viewer.postfx); a.viewer.postfx.render = (...x) => (window.__frames++, render(...x)); })()`);
  await evaluate(`liminal.setTool('wall')`);
  const points = await evaluate(`(() => { const e = liminal.editor, r = e.canvas.getBoundingClientRect();
    return [[5, 4], [12, 4]].map(([x, z]) => { const p = e.view.toScreen(x + .5, z + .5); return { x: p[0] + r.left, y: p[1] + r.top }; }); })()`);
  await call('Input.dispatchMouseEvent', { type: 'mouseMoved', ...points[0] });
  await call('Input.dispatchMouseEvent', { type: 'mousePressed', ...points[0], button: 'left', buttons: 1, clickCount: 1 });
  await call('Input.dispatchMouseEvent', { type: 'mouseMoved', ...points[1], button: 'left', buttons: 1 });
  await call('Input.dispatchMouseEvent', { type: 'mouseReleased', ...points[1], button: 'left', buttons: 0, clickCount: 1 });
  await new Promise((r) => setTimeout(r, 600)); // lenger enn 3D-ventetiden
  const hidden = await evaluate(`({ builds: __builds, frames: __frames, wall: liminal.level.tiles[4 * 20 + 8] })`);
  assert.deepEqual(hidden, { builds: 0, frames: 0, wall: TILE.WALL }, 'no 3D work while only 2D is shown');
  await evaluate(`liminal.layout.set('split')`);
  const shown = await evaluate(`({ builds: __builds, wall: liminal.viewer.storeys.levels[0].tiles[4 * 20 + 8] })`);
  assert.deepEqual(shown, { builds: 1, wall: TILE.WALL }, 'showing 3D builds once with the change');
  await waitFor(() => evaluate('__frames > 0'), '3D frames again');
  // Gå i rommet rett fra 2D-visningen: 3D bygges først.
  await evaluate(`liminal.layout.set('2d')`);
  await evaluate(`liminal.setTool('floor')`);
  await call('Input.dispatchMouseEvent', { type: 'mousePressed', ...points[0], button: 'left', buttons: 1, clickCount: 1 });
  await call('Input.dispatchMouseEvent', { type: 'mouseMoved', ...points[1], button: 'left', buttons: 1 });
  await call('Input.dispatchMouseEvent', { type: 'mouseReleased', ...points[1], button: 'left', buttons: 0, clickCount: 1 });
  await evaluate(`liminal.walk()`);
  assert.deepEqual(await evaluate(`[__builds, liminal.viewer.walk.level.tiles[4 * 20 + 8], liminal.viewer.mode]`), [2, TILE.FLOOR, 'walk']);
  await evaluate('liminal.viewer.exitWalk(false)');
  console.log('PASS hidden 3D: no rebuilds or frames in 2D-only layout, one build when shown or walking');
}
