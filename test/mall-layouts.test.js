import { describe, it, expect, vi } from 'vitest';
import { TILE } from '../src/core/level.js';
import { generateLevel, presetById, PRESETS } from '../src/gen/index.js';
import { SEED_MAX } from '../src/core/rng.js';
import { mallPlan, MALL_PLANS } from '../src/gen/mall-shop-layout.js';
import { mallLayout } from '../src/gen/mall.js';
import { shopfronts } from '../src/core/shopfronts.js';
import { labelRegions } from '../src/gen/util.js';
import { levelFromJSON, levelToJSON } from '../src/core/serialize.js';
import { objectFits } from '../src/core/objects.js';
import { mallTraffic } from '../src/gen/mall-traffic.js';

describe('mall layout families', () => {
  it.each(MALL_PLANS)('%s stays connected, furnished and reproducible across seeds', layout => {
    for (const [w, h] of [
      [52, 38],
      [56, 40],
      [64, 44],
    ])
      for (const seed of [2, 7, 11]) {
        const opts = { theme: 'mall', w, h, seed, layout };
        const l = generateLevel(opts),
          again = generateLevel(opts);
        expect(l.tiles).toEqual(again.tiles);
        expect(l.objects).toEqual(again.objects);
        expect(labelRegions(l).sizes).toHaveLength(1);
        for (const o of l.objects) expect(objectFits(l, o), `${layout} ${o.id}`).toBe(true);
        expect(shopfronts(levelFromJSON(levelToJSON(l)))).toEqual(shopfronts(l));
        expect(l.tiles.some(t => t === TILE.STAIRS)).toBe(true);
      }
  });
  it('opens an aligned cross court through both shop bands and upper rear galleries', () => {
    const l = presetById('mall-cross-court').make(),
      mid = Math.floor(l.w / 2);
    for (let z = 2; z < l.h - 2; z++)
      for (let x = mid - 3; x <= mid + 3; x++) {
        // The atrium's bridge/columns/water keep their independent geometry.
        if (z >= mallLayout(l.w, l.h).atrium.z0 - 1 && z <= mallLayout(l.w, l.h).atrium.z1 + 1) continue;
        expect(l.tiles[z * l.w + x]).toBe(TILE.FLOOR);
        expect(l.finish[z * l.w + x]).toBe(0);
        expect(l.decks[z * l.w + x]).toBe(44);
      }
    const blocked = mallTraffic(l);
    for (let z = 2; z < l.h - 2; z++) expect(blocked([mid + 1, z])).toBe(true);
  });
  it('recesses some shops two metres, while retaining the original gallery example', () => {
    const l = presetById('mall-terraces').make(),
      fronts = shopfronts(l);
    expect(new Set(fronts.map(s => s.z)).size).toBe(4);
    const original = presetById('mall').make({ seed: 7, layout: 'gallery' });
    expect(new Set(shopfronts(original).map(s => s.z)).size).toBe(2);
    expect(
      new Set(Array.from({ length: 12 }, (_, i) => mallPlan({ w: 64, seed: i + 1 }, {}, undefined))).size,
    ).toBe(3);
    expect(mallPlan({ w: 32 }, null, 'terraces')).toBe('gallery');
  });
  it.each([
    [52, 38, 1],
    [56, 40, 1],
    [64, 44, 2],
  ])('makes Terraces visible at %i × %i with %im recesses', (w, h, inset) => {
    // Seed 3 selects Terraces through the same automatic path as endless/generated rooms.
    const l = generateLevel({ theme: 'mall', w, h, seed: 3 }),
      { shop } = mallLayout(w, h);
    expect([...new Set(shopfronts(l).map(s => s.z))].sort((a, b) => a - b)).toEqual([
      shop + 1 - inset,
      shop + 1,
      h - 2 - shop,
      h - 2 - shop + inset,
    ]);
  });
  it('offers one Mall card and chooses all three layouts when it is opened', () => {
    expect(PRESETS.filter(p => p.id.startsWith('mall')).map(p => p.id)).toEqual(['mall']);
    expect(presetById('toString')).toBeNull();
    const random = vi.spyOn(Math, 'random');
    try {
      for (const [seed, layout] of [
        [2, 'cross-court'],
        [3, 'terraces'],
        [7, 'gallery'],
      ]) {
        random.mockReturnValueOnce((seed - 0.5) / SEED_MAX);
        const l = presetById('mall').make(),
          expected = presetById('mall').make({ seed, layout });
        expect(l.seed).toBe(seed);
        expect(l.name).toBe('The Mall');
        expect(l.tiles).toEqual(expected.tiles);
        expect(l.objects).toEqual(expected.objects);
        expect(new Set(shopfronts(l).map(s => s.z)).size).toBe(layout === 'terraces' ? 4 : 2);
      }
      expect(random).toHaveBeenCalledTimes(3);
    } finally {
      random.mockRestore();
    }
  });
});
