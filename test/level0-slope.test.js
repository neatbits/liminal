import { describe, expect, it } from 'vitest';
import { generateLevel } from '../src/gen/index.js';
import { TILE } from '../src/core/level.js';
import { isRamp } from '../src/core/ramps.js';
import { ceilingAt, floorAt, topFloorAt } from '../src/core/heights.js';
import { walkReach } from '../src/gen/zone-paths.js';
import { isWalkableCell } from '../src/core/spawn.js';
import { doorInfo } from '../src/core/doors.js';

const make = (seed, w = 56, h = 40) => generateLevel({ theme: 'backrooms', w, h, seed, layout: 'slope' });
const cells = (level, test) => {
  const out = [];
  for (let z = 0; z < level.h; z++) for (let x = 0; x < level.w; x++) if (test(x, z)) out.push([x, z]);
  return out;
};

describe('salen med bakke ned i Level 0', () => {
  it('en bred bakke som faller flere meter, med høyt tak over bunnen', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const level = make(seed);
      const ramp = cells(level, (x, z) => isRamp(level, x, z));
      expect(ramp.length, `seed ${seed}`).toBeGreaterThanOrEqual(12 * 12);
      const top = Math.max(...ramp.map(([x, z]) => topFloorAt(level, x, z)));
      const bottom = Math.min(...ramp.map(([x, z]) => floorAt(level, x, z)));
      expect(top - bottom).toBeGreaterThanOrEqual(2.4);
      expect(bottom).toBe(0);
      const [bx, bz] = ramp.find(([x, z]) => floorAt(level, x, z) === 0);
      expect(ceilingAt(level, bx, bz)).toBeGreaterThan(top + 3);
    }
  });

  it('man starter oppe og når alt til fots – bakken ned, døren i bunnen og labyrinten bak den', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const level = make(seed, seed % 2 ? 56 : 40, seed % 2 ? 40 : 52);
      const { x, z } = level.spawn;
      expect(floorAt(level, Math.floor(x), Math.floor(z)), `seed ${seed}`).toBeGreaterThan(2);
      // Høydene: uten møblene (de kan stenge en og annen krok, som ellers i Level 0) og uten dørene til ingensteds i ytterveggen.
      const reach = walkReach(level, x, z, new Set());
      const walkable = (cx, cz) => isWalkableCell(level, cx, cz) && !doorInfo(level, cx, cz)?.oneSided; // ikke halvvegger og dører til ingensteds
      const open = cells(level, (cx, cz) => walkable(cx, cz) && [TILE.FLOOR, TILE.STAIRS, TILE.DOOR].includes(level.tiles[cz * level.w + cx]));
      const missed = open.filter(([cx, cz]) => !reach[cz * level.w + cx]);
      expect(missed, `seed ${seed}`).toEqual([]);
      expect(open.some(([cx, cz]) => reach[cz * level.w + cx] && floorAt(level, cx, cz) === 0 && level.tiles[cz * level.w + cx] === TILE.FLOOR)).toBe(true);
    }
  }, 60000);

  it('kommer av og til i nye Level 0-nivåer, alltid alene', () => {
    const layouts = Array.from({ length: 60 }, (_, k) => generateLevel({ theme: 'backrooms', w: 56, h: 40, seed: k + 1 }).layout ?? '');
    expect(layouts.filter((l) => l === 'slope').length).toBeGreaterThan(1);
    expect(layouts.filter((l) => l.includes('slope') && l !== 'slope')).toEqual([]);
  }, 60000);

  it('ikke i Noclip: gangene der går på gulvhøyde 0 og måtte gravd seg gjennom salen', async () => {
    const { zoneLevel } = await import('../src/gen/zones.js');
    const { mulberry32 } = await import('../src/core/rng.js');
    for (let seed = 1; seed <= 40; seed++) expect(zoneLevel(1, null, mulberry32(seed)).layout, `seed ${seed}`).not.toBe('slope');
  }, 120000);

  it('døren ut står i bunnen', () => {
    const level = make(3);
    const ramp = cells(level, (x, z) => isRamp(level, x, z));
    const doors = cells(level, (x, z) => level.tiles[z * level.w + x] === TILE.DOOR && floorAt(level, x, z) === 0);
    const lowRow = ramp.filter(([x, z]) => topFloorAt(level, x, z) < 0.3);
    const near = doors.some(([dx, dz]) => lowRow.some(([x, z]) => Math.abs(x - dx) + Math.abs(z - dz) <= 6));
    expect(near).toBe(true);
  });
});
