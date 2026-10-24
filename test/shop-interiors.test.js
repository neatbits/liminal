import { describe, expect, it } from 'vitest';
import { createLevel, cloneLevel, TILE, setTile } from '../src/core/level.js';
import { SHOP_INTERIORS, shopInteriorMap } from '../src/core/shop-interiors.js';
import { SHOPFRONT, shopfronts } from '../src/core/shopfronts.js';
import { levelFromJSON, levelToJSON, encodeLevel, decodeLevel } from '../src/core/serialize.js';
import { generateLevel, presetById } from '../src/gen/index.js';
import { buildSurfaces } from '../src/world/surfaces.js';
import { getTheme } from '../src/core/themes.js';
import { surfaceFor } from '../src/view3d/walker.js';

describe('shop-specific interior finishes', () => {
  it('classifies all four shop types without spreading into galleries or rear arcades', () => {
    for (const seed of [1, 3, 7]) {
      const l = generateLevel({ theme: 'mall', w: 56, h: 40, seed }), map = shopInteriorMap(l);
      expect([...new Set(map)].sort()).toEqual([0, 1, 2, 3, 4]);
      for (let i = 0; i < map.length; i++) {
        if (!l.finish[i] || ![TILE.FLOOR, TILE.PILLAR].includes(l.tiles[i])) expect(map[i]).toBe(0);
        else expect(map[i], `shop cell ${i}`).toBeGreaterThan(0);
      }
      for (const s of shopfronts(l)) for (let x = s.x0; x <= s.x1; x++) {
        expect(map[(s.z - s.n) * l.w + x]).toBe(s.style + 1);
      }
    }
  });

  it('uses distinct floor/wall batches on both storeys with unchanged surface geometry', () => {
    const l = presetById('mall').make({seed:7,layout:'gallery'}), data = buildSurfaces(l, null);
    for (let style = 0; style < 4; style++) for (const type of ['Floor', 'Wall', 'Ceiling']) {
      const mesh = data[`shop${type}_${style}`];
      expect(mesh.vertexCount).toBeGreaterThan(0);
      expect(mesh.pos.filter((_, k) => k % 3 === 1).some(y => y >= 4.4)).toBe(true);
    }
    const sameType = cloneLevel(l);
    for (let i = 0; i < sameType.meta.length; i++) {
      if ([TILE.WALL, TILE.FLOOR].includes(l.tiles[i]) && l.meta[i] & SHOPFRONT) sameType.meta[i] = SHOPFRONT;
    }
    const single = buildSurfaces(sameType, null);
    const count = d => Object.values(d).reduce((sum, m) => sum + m.vertexCount, 0);
    expect(count(data)).toBe(count(single));
    expect(data.floor.pos).toEqual(single.floor.pos);
    // Opaque floors are rerouted, rather than adding overlapping overlays.
    const floorVertices = d => Object.entries(d).filter(([k]) => k.startsWith('shopFloor_')).reduce((n, [, m]) => n + m.vertexCount, 0);
    expect(floorVertices(data)).toBe(floorVertices(single));
  });

  it('preserves identities through copy, file and share links without adding room layers', async () => {
    const l = presetById('mall').make({seed:7,layout:'gallery'}), expected = shopInteriorMap(l);
    for (const copy of [cloneLevel(l), levelFromJSON(levelToJSON(l)), await decodeLevel(await encodeLevel(l))]) {
      expect(shopInteriorMap(copy)).toEqual(expected);
    }
  });

  it('leaves unmarked finishes and other themes alone, and follows repainting', () => {
    const l = presetById('mall').make({seed:7,layout:'gallery'}), s = shopfronts(l).find(s => s.style === 2);
    const cell = (s.z - s.n) * l.w + s.x0;
    expect(shopInteriorMap(l)[cell]).toBe(3);
    setTile(l, s.x0, s.z - s.n, TILE.WATER);
    expect(shopInteriorMap(l)[cell]).toBe(0);
    expect(shopInteriorMap({ ...l, theme: 'office' }).some(Boolean)).toBe(false);
    const empty = createLevel({ theme: 'mall', w: 12, h: 12 });
    empty.tiles.fill(TILE.FLOOR); empty.finish.fill(1);
    expect(shopInteriorMap(empty).some(Boolean)).toBe(false);
    expect(buildSurfaces(empty, null).tileFloor.vertexCount).toBeGreaterThan(0);
  });

  it('matches carpet/tile footsteps to each actual shop finish', () => {
    const mall = getTheme('mall');
    for (let i = 0; i < SHOP_INTERIORS.length; i++) {
      expect(surfaceFor(mall, TILE.FLOOR, 1, i + 1)).toBe(i === 2 ? 'carpet' : 'tile');
      expect(surfaceFor(mall, TILE.WATER, 1, i + 1)).toBe('water');
    }
    expect(surfaceFor(mall, TILE.FLOOR, 0, 3)).toBe('tile');
    expect(surfaceFor(mall, TILE.FLOOR, 1, 0)).toBe('carpet');
  });
});
