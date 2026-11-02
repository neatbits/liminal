import { describe, expect, it } from 'vitest';
import { TILE } from '../src/core/level.js';
import { mulberry32 } from '../src/core/rng.js';
import { generateLevel } from '../src/gen/index.js';
import { resolveSpawn } from '../src/core/spawn.js';
import { reachableCells } from '../src/gen/tapes.js';
import { floorAt } from '../src/core/heights.js';
import { DARK_POWER, FUSE_HEIGHT, fuseCount, fusePower, fusesLocked, placeFuses } from '../src/gen/fuses.js';

describe('sikringsskap (Lights out)', () => {
  it('henger på en vegg ved gulv man kan gå til, langt fra start og fra hverandre', () => {
    for (const theme of ['backrooms', 'office', 'hotel', 'pool', 'mall']) {
      const level = generateLevel({ theme, w: 40, h: 36, seed: 3 });
      const spawn = resolveSpawn(level);
      const reach = reachableCells(level, spawn.x, spawn.z);
      const fuses = placeFuses(level, spawn, mulberry32(7));
      expect(fuses.length, theme).toBe(fuseCount(level));
      for (const f of fuses) {
        expect(reach[f.z * level.w + f.x], theme).toBe(1);
        expect(level.tiles[(f.z + f.wall[1]) * level.w + f.x + f.wall[0]], theme).toBe(TILE.WALL);
        expect(Math.hypot(f.px - (f.x + 0.5), f.pz - (f.z + 0.5))).toBeCloseTo(0.44); // inntil veggen
        expect(f.y - floorAt(level, f.x, f.z)).toBeCloseTo(FUSE_HEIGHT);
        expect(Math.hypot(f.x + 0.5 - spawn.x, f.z + 0.5 - spawn.z), theme).toBeGreaterThan(5);
      }
      for (const [i, a] of fuses.entries()) for (const b of fuses.slice(i + 1)) expect(Math.hypot(a.x - b.x, a.z - b.z), theme).toBeGreaterThanOrEqual(3);
    }
  });

  it('henger ikke ved en stige eller et hull: der er E for klatring', () => {
    const level = generateLevel({ theme: 'office', w: 40, h: 36, seed: 3 });
    const spawn = resolveSpawn(level);
    const fuses = placeFuses(level, spawn, mulberry32(7));
    const { x, z } = fuses[0];
    const blocked = { ...level, ladders: [{ x, z }], holes: [{ x: fuses[1].x, z: fuses[1].z }] };
    for (const f of placeFuses(blocked, spawn, mulberry32(7))) {
      for (const l of [...blocked.ladders, ...blocked.holes]) expect(Math.hypot(f.x - l.x, f.z - l.z)).toBeGreaterThanOrEqual(2.5);
    }
  });

  it('strømmen øker for hvert skap, og dørene er låst til alle er på', () => {
    expect(fusePower(0, 3)).toBeCloseTo(DARK_POWER);
    expect(fusePower(1, 3)).toBeGreaterThan(fusePower(0, 3));
    expect(fusePower(3, 3)).toBe(1);
    expect(fusesLocked({ left: 1 })).toBe(true);
    expect(fusesLocked({ left: 0 })).toBe(false);
    expect(fusesLocked({ left: 2, drifting: true })).toBe(false);
  });
});
