import { describe, expect, it } from 'vitest';
import { TILE } from '../src/core/level.js';
import { mulberry32 } from '../src/core/rng.js';
import { ceilingAt, depthAt } from '../src/core/heights.js';
import { generateLevel, presetById } from '../src/gen/index.js';
import { HEIGHT_RANGES, levelHeight, basins, poolDepths } from '../src/gen/variety.js';
import { moodLevel } from '../src/gen/moods.js';

const depths = (level, cells) => cells.map((i) => depthAt(level, i % level.w, Math.floor(i / level.w)));

describe('takhøyden varierer fra nivå til nivå', () => {
  it('innenfor temaets område, og ikke alltid den samme', () => {
    const seen = new Set();
    for (let s = 1; s <= 20; s++) {
      const h = levelHeight('backrooms', mulberry32(s));
      expect(h).toBeGreaterThanOrEqual(HEIGHT_RANGES.backrooms[0]);
      expect(h).toBeLessThanOrEqual(HEIGHT_RANGES.backrooms[1]);
      seen.add(h);
    }
    expect(seen.size).toBeGreaterThan(3);
  });

  it('romoppsettet er det samme med og uten variasjon, og eksemplene er urørt', () => {
    const a = generateLevel({ theme: 'office', seed: 8 });
    const b = generateLevel({ theme: 'office', seed: 8, vary: false });
    expect(Array.from(a.tiles)).toEqual(Array.from(b.tiles));
    expect(b.height).toBe(2.7);
    const pools = presetById('pools').make();
    expect(pools.height).toBe(3.4);
    expect(pools.depths.every((d) => d === 0)).toBe(true);
  });

  it('noen bassenghaller i Poolrooms får høyt tak', () => {
    let all = 0;
    let tall = 0;
    for (let s = 1; s <= 8; s++) {
      const level = generateLevel({ theme: 'pool', seed: s });
      for (const cells of basins(level)) {
        if (cells.length < 30) continue;
        all++;
        const i = cells[0];
        if (ceilingAt(level, i % level.w, Math.floor(i / level.w)) >= 4.8) tall++;
      }
    }
    expect(tall / all).toBeGreaterThan(0.15);
    expect(tall / all).toBeLessThan(0.6);
  });
});

describe('bassengene får ulik dybde', () => {
  it('grunne, vanlige, med dyp ende og dype – innenfor sine områder', () => {
    const kinds = new Set();
    for (let s = 1; s <= 12; s++) {
      const level = generateLevel({ theme: 'pool', seed: s, vary: false });
      const used = poolDepths(level, mulberry32(s));
      basins(level).forEach((cells, k) => {
        const d = depths(level, cells);
        const kind = used[k];
        kinds.add(kind);
        if (kind === 'shallow') for (const v of d) expect(v).toBeLessThanOrEqual(0.5);
        if (kind === 'deep') for (const v of d) expect(v).toBeGreaterThanOrEqual(2.2);
        if (kind === 'sloped') expect(Math.max(...d) - Math.min(...d)).toBeGreaterThan(0.7);
      });
    }
    expect([...kinds].sort()).toEqual(['deep', 'normal', 'shallow', 'sloped']);
  });

  it('fontener med egen dybde beholdes', () => {
    const level = generateLevel({ theme: 'mall', w: 56, h: 40, seed: 7, vary: false });
    const before = Array.from(level.depths);
    poolDepths(level, mulberry32(1));
    for (let i = 0; i < before.length; i++) if (before[i]) expect(level.depths[i]).toBe(before[i]);
  });

  it('i Nightmare er flere bassenger mørke og dype', () => {
    let deepNormal = 0;
    let deepNight = 0;
    for (let s = 1; s <= 10; s++) {
      const level = generateLevel({ theme: 'pool', seed: s });
      const night = moodLevel(level, 'nightmare', mulberry32(s));
      for (const cells of basins(level)) {
        if (Math.min(...depths(level, cells)) >= 2.2) deepNormal++;
        if (Math.min(...depths(night, cells)) >= 2.2) deepNight++;
      }
    }
    expect(deepNight).toBeGreaterThan(deepNormal);
  });
});
