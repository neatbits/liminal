import { describe, expect, it } from 'vitest';
import { TILE, createLevel } from '../src/core/level.js';
import { storeyCount } from '../src/core/storeys.js';
import { stairwells, walkLevels } from '../src/core/stairwells.js';
import { presetById } from '../src/gen/index.js';
import { stackFloors } from '../src/gen/floors.js';
import { nextLevel } from '../src/gen/endless.js';
import { mulberry32 } from '../src/core/rng.js';

/** Alle ruter man kan stå på henger sammen (4-naboer, uten høyder). */
function connected(level) {
  const open = (i) => level.tiles[i] !== TILE.WALL && level.tiles[i] !== TILE.PILLAR;
  const cells = [...level.tiles.keys()].filter(open);
  const seen = new Set([cells[0]]);
  const queue = [cells[0]];
  while (queue.length) {
    const i = queue.pop();
    for (const j of [i - 1, i + 1, i - level.w, i + level.w]) {
      if (j >= 0 && j < level.tiles.length && Math.abs((j % level.w) - (i % level.w)) <= 1 && open(j) && !seen.has(j)) {
        seen.add(j);
        queue.push(j);
      }
    }
  }
  return seen.size === cells.length;
}

describe('bygg med flere etasjer', () => {
  it('eksempelet har fire hotelletasjer med trapp opp fra hver, og alt henger sammen', () => {
    const room = presetById('hotel-floors').make();
    expect(storeyCount(room)).toBe(4);
    const wells = stairwells(room);
    expect(wells.map((w) => w.k)).toEqual([0, 1, 2]);
    const { levels } = walkLevels(room);
    for (const level of levels) expect(connected(level)).toBe(true);
    for (const { k, landing, run } of wells) {
      expect(levels[k + 1].tiles[landing]).toBe(TILE.FLOOR);
      expect(run.every((i) => levels[k + 1].tiles[i] === TILE.WALL)).toBe(true);
      expect(run.every((i) => !levels[k].objects.some((o) => o.z * room.w + o.x === i))).toBe(true);
    }
    // Etasjene er nesten like: litt feil, ikke helt annerledes.
    const same = levels[1].tiles.filter((t, i) => t === levels[0].tiles[i]).length / room.tiles.length;
    expect(same).toBeGreaterThan(0.9);
    expect(presetById('hotel-floors').make().storeys[2].tiles).toEqual(room.storeys[2].tiles);
  });

  it('gir opp når det ikke er plass til et trapperom', () => {
    const room = createLevel({ w: 8, h: 8 });
    expect(stackFloors(room, mulberry32(1), 2)).toBe(1);
  });

  it('den uendelige utforskingen får av og til bygg med flere etasjer og trapper', () => {
    const rand = mulberry32(42);
    const multi = [];
    for (let depth = 1; depth < 60 && multi.length < 3; depth++) {
      const { level } = nextLevel(depth, 'backrooms', rand);
      if (storeyCount(level) > 1) multi.push(level);
    }
    expect(multi.length).toBeGreaterThan(0);
    for (const level of multi) expect(stairwells(level)).toHaveLength(storeyCount(level) - 1);
  });
});
