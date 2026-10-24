import { describe, it, expect } from 'vitest';
import { createLevel, TILE, cloneLevel, resizeLevel } from '../src/core/level.js';
import { FINISH, FINISHES, clampFinish } from '../src/core/finishes.js';
import { paintZone, floodFillZone } from '../src/core/zones.js';
import { paintAt, applyRect, applyFill, toolById } from '../src/editor/tools.js';
import { shopInteriorMap } from '../src/core/shop-interiors.js';
import { shopfronts } from '../src/core/shopfronts.js';
import { presetById } from '../src/gen/index.js';
import { levelToJSON, levelFromJSON, encodeLevel, decodeLevel } from '../src/core/serialize.js';
import { History } from '../src/core/history.js';
import { buildSurfaces } from '../src/world/surfaces.js';
import { surfaceFor } from '../src/view3d/walker.js';
import { getTheme } from '../src/core/themes.js';
import { hoverText, toolText } from '../src/app/status.js';

function room(theme = 'mall') {
  const l = createLevel({ theme, w: 16, h: 12, height: 4 });
  for (let z = 1; z < 11; z++) for (let x = 1; x < 15; x++) l.tiles[z * l.w + x] = TILE.FLOOR;
  for (let z = 1; z < 11; z++) l.tiles[z * l.w + 8] = TILE.WALL;
  return l;
}

describe('paintable interior finishes', () => {
  it.each(FINISHES.filter(f => f.style !== undefined))('paints $label without needing a generated storefront', finish => {
    for (const theme of ['mall', 'backrooms', 'office']) {
      const l = room(theme), t = { ...toolById('tiles'), value: finish.value };
      expect(applyRect(l, t, { x0: 1, z0: 1, x1: 7, z1: 10 }, false)).toBe(70);
      const map = shopInteriorMap(l), meshes = buildSurfaces(l, null);
      expect(map[4 * l.w + 4]).toBe(finish.style + 1);
      expect(map[4 * l.w + 10]).toBe(0);
      expect(meshes[`shopFloor_${finish.style}`].vertexCount).toBeGreaterThan(0);
      expect(meshes[`shopWall_${finish.style}`].vertexCount).toBeGreaterThan(0);
      expect(meshes[`shopCeiling_${finish.style}`].vertexCount).toBeGreaterThan(0);
      expect(surfaceFor(getTheme(theme), TILE.FLOOR, finish.value)).toBe(finish.value === FINISH.ARCADE ? 'carpet' : 'tile');
      const base = buildSurfaces(room(theme), null), vertices = d => Object.values(d).reduce((n, m) => n + m.vertexCount, 0);
      expect(vertices(meshes)).toBe(vertices(base)); // Real surface routing, no overlapping floor overlay.
    }
  });

  it('supports brush, rectangle, fill, undo, redo and erasing', () => {
    const l = room(), history = new History(), t = { ...toolById('tiles'), value: FINISH.ARCADE };
    history.push(l); expect(paintAt(l, t, 3, 3, 1, false)).toBe(1);
    expect(l.finish[3 * l.w + 3]).toBe(FINISH.ARCADE);
    history.undo(l); expect(l.finish.some(Boolean)).toBe(false);
    history.redo(l); expect(l.finish[3 * l.w + 3]).toBe(FINISH.ARCADE);
    expect(paintAt(l, t, 3, 3, 1, true)).toBe(1);
    expect(applyFill(l, t, 3, 3, false)).toBe(70);
    expect(l.finish[3 * l.w + 10]).toBe(0);
    expect(applyFill(l, t, 3, 3, true)).toBe(70);
    expect(shopInteriorMap(l).some(Boolean)).toBe(false);
    expect(floodFillZone(l, 'finish', 9, 2, FINISH.ELECTRONICS)).toBe(60);
    expect(l.finish[3 * l.w + 10]).toBe(FINISH.ELECTRONICS);
  });

  it('ignores water and walls, retains hidden finishes after rebuilding, and uses safe values', () => {
    const l = room(); l.tiles[3 * l.w + 3] = TILE.WATER;
    expect(paintZone(l, 'finish', [[3, 3], [8, 3], [4, 4]], FINISH.ARCADE)).toBe(1);
    const i = 4 * l.w + 4; l.tiles[i] = TILE.WALL;
    expect(shopInteriorMap(l)[i]).toBe(0);
    l.tiles[i] = TILE.FLOOR; expect(shopInteriorMap(l)[i]).toBe(3);
    for (const value of [-1, 1.5, 99, NaN]) expect(clampFinish(value)).toBe(FINISH.THEME);
    expect(clampFinish(true)).toBe(FINISH.TILES);
    expect(clampFinish('4')).toBe(FINISH.ARCADE);
  });

  it('saves all choices through files, links, clone and resize', async () => {
    const l = room();
    for (const f of FINISHES) paintZone(l, 'finish', [[f.value + 1, 2]], f.value);
    for (const copy of [cloneLevel(l), levelFromJSON(levelToJSON(l)), await decodeLevel(await encodeLevel(l))]) {
      expect(copy.finish).toEqual(l.finish);
      expect(shopInteriorMap(copy)).toEqual(shopInteriorMap(l));
    }
    const resized = resizeLevel(l, 18, 14);
    for (const f of FINISHES) expect(resized.finish[3 * resized.w + f.value + 2]).toBe(f.value);
  });

  it('repaints generated stores without losing their glass facade or unpainted finishes', () => {
    const l = presetById('mall').make({ seed: 7, layout: 'gallery' }), before = shopfronts(l);
    const s = before.find(s => s.style !== 2), z = s.z - s.n;
    const originals = shopInteriorMap(l);
    for (let x = s.x0; x <= s.x1; x++) paintZone(l, 'finish', [[x, z]], FINISH.ARCADE);
    expect(shopfronts(l)).toEqual(before);
    const after = shopInteriorMap(l);
    for (let x = s.x0; x <= s.x1; x++) expect(after[z * l.w + x]).toBe(3);
    for (let i = 0; i < originals.length; i++) if (originals[i] && l.finish[i] === FINISH.TILES) expect(after[i]).toBe(originals[i]);
  });

  it('names the chosen finish in the editor instead of describing carpet as tiles', () => {
    const l = room(); paintZone(l, 'finish', [[2, 2]], FINISH.ARCADE);
    expect(hoverText(l, [2, 2])).toContain('Arcade');
    expect(hoverText(l, [2, 2])).not.toContain('tiled');
    expect(toolText({ tool: toolById('tiles'), shape: 'rect', brush: 1, zone: { finish: FINISH.ARCADE } })).toContain('Arcade');
  });
});
