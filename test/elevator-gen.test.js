import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/core/rng.js';
import { TILE } from '../src/core/level.js';
import { storeyCount, storeyLevel } from '../src/core/storeys.js';
import { walkLevels, storeyEntry } from '../src/core/stairwells.js';
import { footprint, elevatorProblem, elevatorStops } from '../src/core/elevators.js';
import { nextLevel } from '../src/gen/endless.js';
import { newBuilding, generateBuilding } from '../src/gen/new-building.js';
import { addElevator } from '../src/gen/elevators.js';
import { reachableCells } from '../src/gen/tapes.js';

/** Bygg med flere etasjer fra de uendelige nivåene. */
function buildings(n) {
  const rand = mulberry32(11);
  const out = [];
  for (let depth = 1; out.length < n && depth < 400; depth++) {
    const { level, kind } = nextLevel(depth, 'backrooms', rand, { corridor: 0 }, 1);
    if (kind === 'room' && storeyCount(level) > 1) out.push(level);
  }
  return out;
}

describe('heiser i genererte bygg', () => {
  const rooms = buildings(24);
  const lifted = rooms.filter((r) => r.elevators?.length);

  it('av og til: i noen av byggene med flere etasjer, aldri i bygg med én', () => {
    expect(lifted.length).toBeGreaterThan(3);
    expect(lifted.length).toBeLessThan(rooms.length);
    const single = nextLevel(1, 'backrooms', mulberry32(5), { corridor: 0 }, 1).level;
    if (storeyCount(single) === 1) expect(single.elevators).toBeUndefined();
  }, 120000);

  it('får plass, stopper i minst to etasjer, og trappene og stigene er der fortsatt', () => {
    for (const room of lifted) {
      const [e] = room.elevators;
      expect(elevatorProblem(room, e, e)).toBeNull();
      expect(elevatorStops(room, e).length).toBeGreaterThanOrEqual(2);
      const { levels, wells } = walkLevels(room);
      expect(wells.length + levels.flatMap((l) => l.ladders).length, room.theme).toBe(storeyCount(room) - 1);
    }
  }, 120000);

  it('dørene åpner mot den delen av etasjen man kommer inn i, og ingenting stenges inne', () => {
    for (const room of lifted) {
      const { levels, wells } = walkLevels(room);
      const f = footprint(room.elevators[0]);
      for (const [k, level] of levels.entries()) {
        const entry = k ? storeyEntry(levels, wells, k) : storeyLevel(room, 0).spawn;
        const reach = reachableCells(level, entry.x, entry.z);
        if (level.lifts.length) for (const [x, z] of f.landing) expect(reach[z * level.w + x], `${room.theme} floor ${k + 1}`).toBe(1);
        // Alt som var gulv i etasjen (utenfor sjakten), kan fortsatt nås like godt som uten heisen.
        const without = walkLevels({ ...room, elevators: [] }).levels[k];
        const before = reachableCells(without, entry.x, entry.z);
        const lost = [...before.keys()].filter((i) => before[i] && !reach[i] && !f.all.some(([x, z]) => z * level.w + x === i));
        expect(lost, `${room.theme} floor ${k + 1}`).toEqual([]);
      }
    }
  }, 120000);

  it('samme frø gir samme heis, og New room med flere etasjer kan også få en', () => {
    const o = { theme: 'office', w: 40, h: 32, seed: 9 };
    const a = generateBuilding({ ...o, floors: 3 });
    expect(generateBuilding({ ...o, floors: 3 }).elevators).toEqual(a.elevators);
    const hall = newBuilding('hall', { theme: 'backrooms', w: 30, h: 24, seed: 4, floors: 2 });
    expect(addElevator(hall, { chance: false }) ?? hall.elevators?.[0]).toBeTruthy();
    const [e] = hall.elevators;
    for (const [x, z] of footprint(e).landing) expect(hall.tiles[z * hall.w + x]).toBe(TILE.FLOOR);
  }, 60000);
});
