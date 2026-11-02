import { describe, expect, it } from 'vitest';
import { TILE } from '../src/core/level.js';
import { storeyCount, storeyLevel, MAX_STOREYS } from '../src/core/storeys.js';
import { walkLevels, storeyEntry } from '../src/core/stairwells.js';
import { levelFromJSON, levelToJSON } from '../src/core/serialize.js';
import { generateLevel } from '../src/gen/index.js';
import { reachableCells } from '../src/gen/tapes.js';
import { generateBuilding, newBuilding, floorLimit } from '../src/gen/new-building.js';

const size = { w: 40, h: 36 };
const themes = (room) => Array.from({ length: storeyCount(room) }, (_, k) => storeyLevel(room, k).theme);
const links = (room) => {
  const { levels, wells } = walkLevels(room);
  return wells.length + levels.flatMap((l) => l.ladders).length;
};

/** Man kommer fra starten og opp til øverste etasje. */
function reachesTop(room) {
  const { levels, wells } = walkLevels(room);
  let start = room.spawn;
  for (let k = 0; k < levels.length - 1; k++) {
    const reach = reachableCells(levels[k], start.x, start.z);
    const well = wells.find((x) => x.k === k);
    const foot = well ? well.run[0] - well.dir[0] - well.dir[1] * room.w : levels[k].ladders[0]?.i;
    if (foot === undefined || !reach[foot]) return false;
    start = storeyEntry(levels, wells, k + 1);
  }
  return true;
}

describe('hele bygg fra editoren', () => {
  it('New room: så mange etasjer man velger, med trapp eller stige, og man når toppen', () => {
    for (const theme of ['office', 'backrooms', 'pool', 'hotel', 'garage']) {
      for (const floors of [1, 2, 3, 5]) {
        const room = newBuilding('random', { theme, ...size, seed: 40 + floors, floors, name: 'New room' });
        expect(storeyCount(room), `${theme} ${floors}`).toBe(floors);
        expect(links(room)).toBe(floors - 1);
        expect(reachesTop(room), `${theme} ${floors}`).toBe(true);
      }
    }
  }, 60_000);

  it('hvert sitt tema, eller samme tema med ulike rom', () => {
    const mixed = newBuilding('random', { theme: 'office', ...size, seed: 7, floors: 3 });
    expect(themes(mixed)[0]).toBe('office');
    expect(new Set(themes(mixed)).size).toBe(3);
    const same = newBuilding('random', { theme: 'office', ...size, seed: 7, floors: 3, mix: false });
    expect(themes(same)).toEqual(['office', 'office', 'office']);
    expect(same.storeys[0].tiles).not.toEqual(same.tiles);
  });

  it('kan velge alle etasjene, også flere enn det finnes temaer til nederst', () => {
    const room = newBuilding('random', { theme: 'hotel', ...size, seed: 3, floors: MAX_STOREYS });
    expect(storeyCount(room)).toBe(MAX_STOREYS);
    expect(reachesTop(room)).toBe(true);
  }, 30_000);

  it('Mall kan ha etasjer over seg når man ber om det, med stige', () => {
    const room = newBuilding('random', { theme: 'mall', w: 52, h: 38, seed: 5, floors: 2 });
    expect(storeyCount(room)).toBe(2);
    const { levels, wells } = walkLevels(room);
    expect(wells).toHaveLength(0);
    expect(levels[0].ladders).toHaveLength(1);
    expect(reachesTop(room)).toBe(true);
  });

  it('haller får trapp eller stige, tomme etasjer er tomme', () => {
    const halls = newBuilding('hall', { theme: 'office', ...size, seed: 2, floors: 3 });
    expect(storeyCount(halls)).toBe(3);
    expect(links(halls)).toBe(2);
    expect(reachesTop(halls)).toBe(true);
    const empty = newBuilding('empty', { theme: 'office', ...size, seed: 2, floors: 4 });
    expect(storeyCount(empty)).toBe(4);
    expect(empty.storeys.every((s) => s.tiles.every((t) => t === TILE.WALL))).toBe(true);
  });

  it('samme frø gir samme bygg, og etasje 0 er den samme med én og flere etasjer', () => {
    const make = (floors) => generateBuilding({ theme: 'school', ...size, seed: 123, floors });
    expect(make('random').storeys?.map((s) => [...s.tiles])).toEqual(make('random').storeys?.map((s) => [...s.tiles]));
    expect(make(3).storeys.map((s) => [...s.tiles])).toEqual(make(3).storeys.map((s) => [...s.tiles]));
    expect([...make(1).tiles]).toEqual([...generateLevel({ theme: 'school', ...size, seed: 123 }).tiles]);
  });

  it('Random gir både ett og flere etasjer, og aldri mer enn tre', () => {
    const counts = new Set();
    for (let seed = 1; seed <= 40; seed++) counts.add(storeyCount(generateBuilding({ theme: 'backrooms', w: 24, h: 24, seed, floors: 'random' })));
    expect([...counts].sort()).toEqual([1, 2, 3]);
  }, 30_000);

  it('beholder takhøyden til rommet det erstatter', () => {
    const room = generateBuilding({ theme: 'office', ...size, seed: 9, floors: 2, height: 3.3, waterDepth: 1.5 });
    expect(room.height).toBe(3.3);
    expect(room.waterDepth).toBe(1.5);
    expect(walkLevels(room).levels).toHaveLength(2);
  });

  it('blir lavere når rommet er for lite til forbindelsene', () => {
    const room = newBuilding('hall', { theme: 'office', w: 8, h: 8, seed: 1, floors: 3 });
    expect(storeyCount(room)).toBeLessThanOrEqual(3);
    expect(links(room)).toBe(storeyCount(room) - 1);
  });

  it('store rom: høyst tre genererte etasjer, tomme etasjer er fritt valg', () => {
    expect(floorLimit('random', 48, 48)).toBe(MAX_STOREYS);
    expect(floorLimit('random', 128, 128)).toBe(3);
    expect(floorLimit('hall', 64, 64)).toBe(3);
    expect(floorLimit('empty', 128, 128)).toBe(MAX_STOREYS);
  });

  it('bygget overlever lagring: temaer, stiger og trapper', () => {
    const room = newBuilding('random', { theme: 'pool', ...size, seed: 11, floors: 3, name: 'Saved' });
    const back = levelFromJSON(JSON.parse(JSON.stringify(levelToJSON(room))));
    expect(themes(back)).toEqual(themes(room));
    expect(links(back)).toBe(2);
    expect(reachesTop(back)).toBe(true);
  });
});
