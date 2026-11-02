import { describe, expect, it } from 'vitest';
import { TILE, LIGHT, cloneLevel } from '../src/core/level.js';
import { mulberry32 } from '../src/core/rng.js';
import { generateLevel } from '../src/gen/index.js';
import { applyChange, makeWrong, CHANGE_NAMES } from '../src/gen/wrong.js';
import { MORE_CHANGES } from '../src/gen/wrong-more.js';
import { reachableCells } from '../src/gen/tapes.js';
import { floorAt } from '../src/core/heights.js';
import { objectFits } from '../src/core/objects.js';

const NEW = Object.keys(MORE_CHANGES);
// Rom der hver av endringene har noe å virke på: møbler, vinduer, søyler, fliser, dører og lys.
const ROOMS = [
  ['office', 1], ['hotel', 3], ['backrooms', 5], ['garage', 2], ['basement', 4], ['ward', 6], ['school', 7], ['mall', 8],
].map(([theme, seed]) => () => generateLevel({ theme, w: 40, h: 32, seed }));

/** Rutene man når fra start, som en mengde. */
const reach = (l) => {
  const r = reachableCells(l, l.spawn.x, l.spawn.z);
  return new Set([...l.tiles.keys()].filter((i) => r[i]));
};

describe('ten more ways to make it wrong', () => {
  it('there are ten, and they are all in the list', () => {
    expect(NEW).toHaveLength(10);
    for (const name of NEW) expect(CHANGE_NAMES).toContain(name);
  });

  it.each(NEW)('%s: works in some room, says what changed, and never shuts anything off', (name) => {
    let worked = 0;
    for (const [k, make] of ROOMS.entries()) {
      const level = make();
      const before = reach(level);
      const done = applyChange(level, name, mulberry32(k + 1));
      if (!done) continue;
      worked++;
      expect(done.what.length).toBeGreaterThan(8);
      const after = reach(level);
      const lost = [...before].filter((i) => !after.has(i) && !done.cells.some(([x, z]) => z * level.w + x === i));
      expect(lost, `${name} in ${level.theme}`).toEqual([]);
      for (const o of level.objects) expect(objectFits(level, o), `${o.id}`).toBe(true);
    }
    expect(worked, name).toBeGreaterThan(0);
  }, 60000);

  it('the changes are small: a raised floor is a step, not a wall, and an extra light sits next to another', () => {
    const level = generateLevel({ theme: 'office', w: 40, h: 32, seed: 1 });
    const done = applyChange(level, 'floorRaised', mulberry32(2));
    for (const [x, z] of done.cells) expect(floorAt(level, x, z)).toBeGreaterThan(0.05);
    for (const [x, z] of done.cells) expect(floorAt(level, x, z)).toBeLessThanOrEqual(0.15);
    const lit = generateLevel({ theme: 'backrooms', w: 40, h: 32, seed: 5 });
    const pair = applyChange(lit, 'lightPair', mulberry32(3));
    expect(pair.cells).toHaveLength(2);
    for (const [x, z] of pair.cells) expect(lit.lights[z * lit.w + x]).toBe(LIGHT.ON);
  });

  it('a door taken off its hinges is still a doorway', () => {
    const level = generateLevel({ theme: 'hotel', w: 40, h: 32, seed: 3 });
    const { cells: [[x, z]] } = applyChange(level, 'doorRemoved', mulberry32(1));
    expect(level.tiles[z * level.w + x]).toBe(TILE.DOOR);
    expect(level.meta[z * level.w + x] & 3).toBe(0);
  });

  it('a missing pillar leaves plain floor – its size bits never turn into a ladder', async () => {
    const { createLevel } = await import('../src/core/level.js');
    const { fillRect } = await import('../src/gen/util.js');
    const { ladders } = await import('../src/core/ladders.js');
    const level = createLevel({ theme: 'pool', w: 16, h: 8 });
    fillRect(level, 1, 1, 14, 6, TILE.FLOOR);
    for (const x of [3, 6, 9, 12]) { level.tiles[3 * level.w + x] = TILE.PILLAR; level.meta[3 * level.w + x] = 7; } // stor diameter
    level.spawn = { x: 1.5, z: 1.5, a: 0 };
    const { cells: [[x, z]] } = applyChange(level, 'pillarGone', mulberry32(1));
    expect(level.tiles[z * level.w + x]).toBe(TILE.FLOOR);
    expect(level.meta[z * level.w + x]).toBe(0);
    expect(ladders(level)).toEqual([]);
  });

  it('a gap in the wall only ever opens: never more walls than before', () => {
    const level = generateLevel({ theme: 'office', w: 40, h: 32, seed: 1 });
    const walls = level.tiles.filter((t) => t === TILE.WALL).length;
    applyChange(level, 'wallGap', mulberry32(4));
    expect(level.tiles.filter((t) => t === TILE.WALL).length).toBe(walls - 1);
  });

  it('they turn up in Make it wrong too', () => {
    const seen = new Set();
    for (let seed = 1; seed <= 12; seed++) {
      const level = cloneLevel(ROOMS[seed % ROOMS.length]());
      for (const c of makeWrong(level, 'very', mulberry32(seed))) seen.add(c.name);
    }
    expect(NEW.filter((n) => seen.has(n)).length).toBeGreaterThanOrEqual(7);
  }, 60000);
});
