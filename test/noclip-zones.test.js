import { describe, expect, it } from 'vitest';
import { TILE, LIGHT } from '../src/core/level.js';
import { doorInfo } from '../src/core/doors.js';
import { mulberry32 } from '../src/core/rng.js';
import { reachableCells } from '../src/gen/tapes.js';
import { SEAM, zoneLevel, addSeams, zoneOffset, seamWest, seamEast } from '../src/gen/zones.js';

/** Et område med ganger, som view3d/zones.js lager det. */
function zone(depth, prev, seed, entry = true) {
  const rand = mulberry32(seed);
  const level = zoneLevel(depth, prev, rand);
  return { level, ...addSeams(level, rand, { entry }) };
}

describe('områdene i Noclip', () => {
  it('det første er Level 0, så kommer et nytt tema hver gang, og de er lange nok', () => {
    let prev = null;
    for (let depth = 1; depth <= 5; depth++) {
      const { level } = zone(depth, prev, depth * 11, depth > 1);
      if (depth === 1) expect(level.theme).toBe('backrooms');
      else expect(level.theme).not.toBe(prev);
      expect(level.w).toBeGreaterThanOrEqual(SEAM.MIN_W);
      prev = level.theme;
    }
  }, 60000);

  it('gangene ved kanten er like: tre ruter brede, massiv vegg rundt, samme takhøyde og lamper', () => {
    for (const seed of [1, 2, 3, 4]) {
      const { level, entry, exit } = zone(2, 'backrooms', seed);
      for (const [x0, z] of [[0, entry], [level.w - SEAM.S, exit]]) {
        for (let x = x0; x < x0 + SEAM.S; x++) {
          for (let r = 0; r < level.h; r++) {
            const inside = r >= z && r < z + SEAM.ROWS;
            expect(level.tiles[r * level.w + x], `${level.theme} ${x},${r}`).toBe(inside ? TILE.FLOOR : TILE.WALL);
            if (inside) expect(level.ceilings[r * level.w + x]).toBe(SEAM.CEIL);
          }
        }
        for (const lx of SEAM.LAMPS) expect(level.lights[(z + 1) * level.w + x0 + lx]).toBe(LIGHT.ON);
      }
    }
  }, 60000);

  it('man kommer seg fra gangen inn til gangen ut, og det finnes ingen dører til ingensteds', () => {
    for (const [seed, prev] of [[5, 'backrooms'], [6, 'pool'], [7, 'office'], [8, 'hotel'], [9, 'school'], [10, 'mall']]) {
      const { level, entry, exit } = zone(3, prev, seed);
      const reach = reachableCells(level, 1.5, entry + 1.5);
      expect(reach[(exit + 1) * level.w + level.w - 2], `${level.theme} seed ${seed}`).toBe(1);
      for (let i = 0; i < level.tiles.length; i++) {
        if (level.tiles[i] === TILE.DOOR) expect(doorInfo(level, i % level.w, Math.floor(i / level.w))?.oneSided).not.toBe(true);
      }
    }
  }, 60000);

  it('neste område ligger slik at gangene ligger nøyaktig oppå hverandre, og skjøten er midt i', () => {
    const a = zone(1, null, 21, false);
    const b = zone(2, a.level.theme, 22);
    const [dx, dz] = zoneOffset(a, b);
    for (let x = 0; x < SEAM.S; x++) {
      for (let r = 0; r < SEAM.ROWS; r++) {
        expect(a.level.tiles[(b.entry + r + dz) * a.level.w + x + dx]).toBe(TILE.FLOOR);
        expect(b.level.tiles[(b.entry + r) * b.level.w + x]).toBe(TILE.FLOOR);
      }
    }
    expect(seamEast(a.level)).toBeCloseTo(dx + seamWest());
  }, 60000);
});

describe('alltid en vei videre', () => {
  it('fra der man kommer inn til gangen ut, til fots: uten å krype, uten møbler og uten for høye kanter', async () => {
    const { makeZone } = await import('../src/gen/zones.js');
    const { markWall } = await import('../src/gen/noclip.js');
    const { walkReach } = await import('../src/gen/zone-paths.js');
    // 2026 og 10130: Level 0-labyrinter uten vei. 22471: en skole der begge gangene endte mot gulv 0,9–1,5 m høyere
    // (med rekkverk), og 10747: lekerommets tårn.
    for (const [index, seed, mood] of [[0, 2026, 'liminal'], [0, 10130, 'liminal'], [4, 22471, 'abandoned'], [7, 22471, 'uncanny'], [2, 10747, 'liminal'], [6, 31, 'uncanny']]) {
      const z = makeZone({ index, seed, prevTheme: index ? 'hotel' : null, mood });
      if (!index) markWall(z.level);
      const l = z.level;
      const from = index ? [1.5, z.entry + 1.5] : [l.spawn.x, l.spawn.z];
      expect(walkReach(l, ...from)[(z.exit + 1) * l.w + l.w - 2], `${index} ${seed} ${l.theme}`).toBe(1);
    }
  }, 120000);
});
