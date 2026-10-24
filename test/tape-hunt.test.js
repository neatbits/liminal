import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createLevel, TILE } from '../src/core/level.js';
import { fillTiles, rectIndices } from '../src/core/ops.js';
import { DOOR, setDoor } from '../src/core/doors.js';
import { mulberry32 } from '../src/core/rng.js';
import { exitsLocked, placeTapes, reachableCells } from '../src/gen/tapes.js';
import { generateLevel } from '../src/gen/index.js';
import { addExits } from '../src/gen/exits.js';
import { loadProgress, saveProgress } from '../src/core/storage.js';

// To rom med en lukket dør imellom, og et tredje rom bak en vegg uten åpning.
function rooms() {
  const level = createLevel({ w: 40, h: 14 });
  fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 12, z1: 12 }), TILE.FLOOR);
  fillTiles(level, rectIndices(level, { x0: 14, z0: 1, x1: 25, z1: 12 }), TILE.FLOOR);
  fillTiles(level, rectIndices(level, { x0: 27, z0: 1, x1: 38, z1: 12 }), TILE.FLOOR);
  level.tiles[6 * level.w + 13] = TILE.DOOR;
  setDoor(level, 13, 6, DOOR.CLOSED);
  return level;
}

describe('kassettjakt', () => {
  it('låser dørene til ingensteds bare på genererte nivåer, til kassettene er funnet', () => {
    expect(exitsLocked({ depth: 0, left: 3 })).toBe(false); // rommet fra editoren
    expect(exitsLocked({ depth: 1, left: 3 })).toBe(true);
    expect(exitsLocked({ depth: 4, left: 0 })).toBe(false);
    expect(exitsLocked({ depth: 2, left: 1, drifting: true })).toBe(false); // drømmegangen
  });

  it('når rom bak vanlige lukkede dører, men ikke bak vegger eller dører til ingensteds', () => {
    const level = rooms();
    const reach = reachableCells(level, 3.5, 3.5);
    expect(reach[3 * level.w + 3]).toBe(1);
    expect(reach[6 * level.w + 20]).toBe(1); // bak den lukkede døren
    expect(reach[6 * level.w + 30]).toBe(0); // bak veggen
    level.tiles[6 * level.w + 39] = TILE.WALL;
    addExits(level, mulberry32(3), 3);
    for (let i = 0; i < level.tiles.length; i++) if (level.tiles[i] === TILE.DOOR && i !== 6 * level.w + 13) expect(reach[i]).toBe(0);
  });

  it('legger kassettene bare der man kan gå fra start', () => {
    const level = rooms();
    for (let seed = 1; seed <= 30; seed++) {
      for (const t of placeTapes(level, { x: 3.5, z: 3.5 }, mulberry32(seed), 5)) expect(t.x).toBeLessThan(26);
    }
  });

  it('genererte nivåer får nåbare kassetter i alle temaer', () => {
    for (const theme of ['level0', 'office', 'pool', 'mall', 'school', 'hotel', 'playroom']) {
      for (let seed = 1; seed <= 4; seed++) {
        const level = generateLevel({ theme, w: 40, h: 32, seed });
        const reach = reachableCells(level, level.spawn.x, level.spawn.z);
        const tapes = placeTapes(level, level.spawn, mulberry32(seed));
        for (const t of tapes) expect(reach[Math.floor(t.z) * level.w + Math.floor(t.x)], `${theme} ${seed}`).toBe(1);
      }
    }
  });
});

describe('fremgang', () => {
  const data = new Map();
  beforeEach(() => {
    globalThis.localStorage = { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k) };
  });
  afterEach(() => {
    delete globalThis.localStorage;
    data.clear();
  });

  it('husker dypeste nivå og kassetter, og tåler tomme eller ødelagte verdier', () => {
    expect(loadProgress()).toEqual({ deepest: 0, tapes: 0 });
    expect(saveProgress({ deepest: 7, tapes: 23 })).toBe(true);
    expect(loadProgress()).toEqual({ deepest: 7, tapes: 23 });
    data.set('liminal.progress.v1', '{"deepest":"x","tapes":-4}');
    expect(loadProgress()).toEqual({ deepest: 0, tapes: 0 });
    data.set('liminal.progress.v1', '{oops');
    expect(loadProgress()).toEqual({ deepest: 0, tapes: 0 });
  });
});
