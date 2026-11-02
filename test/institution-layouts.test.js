import { describe, it, expect } from 'vitest';
import { TILE } from '../src/core/level.js';
import { generateLevel, presetById } from '../src/gen/index.js';
import { LAYOUTS } from '../src/gen/layouts.js';
import { reachableCells } from '../src/gen/tapes.js';
import { ceilingAt, topFloorAt } from '../src/core/heights.js';
import { objectFits, OBJECTS } from '../src/core/objects.js';
import { pillarContains } from '../src/core/pillars.js';
import { halfWallContains } from '../src/core/half-walls.js';
import { isLadder } from '../src/core/ladders.js';

const make = (theme, layout, seed = 7, w = 48, h = 40) => {
  const rooms = [];
  const level = generateLevel({ theme, w, h, seed, layout, onPlan: (p) => rooms.push(...p) });
  return { level, rooms };
};
const ids = (l) => l.objects.map((o) => o.id);
const THEMES = ['school', 'ward', 'garage', 'backrooms'];
const ALL = THEMES.flatMap((theme) => Object.keys(LAYOUTS[theme]).filter((id) => LAYOUTS[theme][id].build).map((id) => [theme, id]));

describe('school, ward, garage and Level 0 layouts', () => {
  it.each(ALL)('%s %s: all of it can be reached, and everything fits', (theme, layout) => {
    for (const seed of [1, 7, 23]) {
      const { level: l } = make(theme, layout, seed);
      expect(l.layout).toBe(layout);
      const reach = reachableCells(l, l.spawn.x, l.spawn.z);
      const lost = [...l.tiles.keys()].filter((i) => {
        if ((l.tiles[i] !== TILE.FLOOR && l.tiles[i] !== TILE.WATER) || reach[i]) return false;
        const [x, z] = [(i % l.w) + 0.5, Math.floor(i / l.w) + 0.5];
        return !pillarContains(l, x, z, 0.3) && !halfWallContains(l, x, z, 0.3);
      });
      expect(lost, `seed ${seed}`).toEqual([]);
      for (const o of l.objects) expect(objectFits(l, o), `${o.id} ${o.x},${o.z}`).toBe(true);
    }
  });

  it('new levels vary, and Level 0 is still mostly the yellow rooms you know', () => {
    for (const theme of THEMES) {
      const seen = {};
      for (let seed = 1; seed <= 80; seed++) {
        const name = generateLevel({ theme, w: 48, h: 40, seed }).layout ?? 'classic';
        seen[name] = (seen[name] ?? 0) + 1;
      }
      for (const id of Object.keys(LAYOUTS[theme])) expect(Object.keys(seen).join(), `${theme}: ${id}`).toContain(id);
      if (theme === 'backrooms') expect(seen.classic).toBeGreaterThan(25);
    }
  }, 60000);

  it('the examples are untouched', () => {
    for (const id of ['level0', 'school', 'ward', 'garage']) expect(presetById(id).make().layout).toBeUndefined();
  });

  it('classrooms have rows of desks facing a board, off corridors with lockers', () => {
    const { level: l, rooms } = make('school', 'classrooms');
    expect(rooms.filter((r) => r.kind === 'classroom').length).toBeGreaterThan(6);
    expect(ids(l).filter((id) => id === 'desk2').length).toBeGreaterThan(20);
    expect(l.finish.includes(1)).toBe(true);
  });

  it('the gym is tall, with stands you can climb and a hoop at each end', () => {
    const { level: l, rooms } = make('school', 'gym');
    const hall = rooms.find((r) => r.kind === 'gym');
    expect(ceilingAt(l, hall.x0 + 5, hall.z0 + 5)).toBeGreaterThanOrEqual(6.5);
    expect(ids(l).filter((id) => id === 'hoop').length).toBe(2);
    expect(Math.max(...l.floors) / 10).toBeCloseTo(1.6);
    expect(l.objects.filter((o) => o.x > hall.x0 + 4 && o.x < hall.x1 - 4 && o.z > hall.z0 + 4 && o.z < hall.z1 - 4)).toEqual([]);
  });

  it('the auditorium climbs in rows no higher than a step, away from a raised stage', () => {
    const { level: l, rooms } = make('school', 'auditorium');
    const seats = rooms.find((r) => r.kind === 'seating');
    const x = seats.x0;
    const row = Array.from({ length: seats.z1 - seats.z0 }, (_, k) => topFloorAt(l, x, seats.z0 + k));
    for (let k = 1; k < row.length; k++) expect(row[k] - row[k - 1]).toBeCloseTo(0.3);
    expect(ids(l).filter((id) => id === 'plasticchair').length).toBeGreaterThan(40);
  });

  it('the library has rows of books', () => {
    expect(ids(make('school', 'library').level).filter((id) => id === 'bookshelf').length).toBeGreaterThan(10);
  });

  it('the cafeteria has a counter, long rows of tables and a kitchen', () => {
    const { level: l, rooms } = make('school', 'cafeteria');
    expect(rooms.some((r) => r.kind === 'kitchen')).toBe(true);
    expect(ids(l)).toEqual(expect.arrayContaining(['counter', 'table', 'plasticchair']));
  });

  it('open wards have rows of beds along both walls', () => {
    const { level: l, rooms } = make('ward', 'nightingale');
    expect(rooms.some((r) => r.kind === 'nightingale')).toBe(true);
    expect(ids(l).filter((id) => id === 'hospitalbed').length).toBeGreaterThan(15);
  });

  it('operating theatres have a table, a lamp and glass', () => {
    const { level: l } = make('ward', 'surgery');
    expect(ids(l)).toEqual(expect.arrayContaining(['ortable', 'surgicallamp', 'glasswall', 'medicaltrolley']));
  });

  it('isolation cells and the morgue are shut, and dim', () => {
    for (const layout of ['isolation', 'morgue']) {
      const { level: l } = make('ward', layout);
      const doors = [...l.tiles.keys()].filter((i) => l.tiles[i] === TILE.DOOR && l.meta[i]);
      expect(doors.length).toBeGreaterThan(5);
      expect(l.lights.filter((v) => v === 3).length).toBeGreaterThan(5);
    }
    expect(ids(make('ward', 'morgue').level)).toEqual(expect.arrayContaining(['morguewall', 'gurney']));
    expect(ids(make('ward', 'isolation').level).filter((id) => id === 'hospitalbed').length).toBeGreaterThan(10);
  });

  it('parking bays hold covered cars in three colours', () => {
    const { level: l } = make('garage', 'bays');
    const cars = l.objects.filter((o) => o.id === 'coveredcar');
    expect(cars.length).toBeGreaterThan(10);
    expect(new Set(cars.map((c) => c.v)).size).toBeGreaterThan(1);
    expect(OBJECTS.coveredcar.build).toBe('coveredcar');
  });

  it('the flooded level has a dry way along the walls', () => {
    const { level: l } = make('garage', 'flooded');
    expect(l.tiles.filter((t) => t === TILE.WATER).length).toBeGreaterThan(l.tiles.filter((t) => t === TILE.FLOOR).length);
    expect(l.tiles[1 * l.w + 5]).toBe(TILE.FLOOR);
    expect(l.tiles.includes(TILE.DOOR)).toBe(true);
  });

  it('the crypt is as low as it gets, with columns everywhere', () => {
    const { level: l } = make('garage', 'crypt');
    expect(ceilingAt(l, l.spawn.x | 0, l.spawn.z | 0)).toBeCloseTo(2.2);
    expect(l.tiles.filter((t) => t === TILE.PILLAR).length).toBeGreaterThan(100);
  });

  it('Level 0 goes wrong in four ways', () => {
    expect(make('backrooms', 'pillars').level.tiles.filter((t) => t === TILE.PILLAR).length).toBeGreaterThan(40);
    const canyon = make('backrooms', 'canyon').level;
    expect(ceilingAt(canyon, canyon.spawn.x | 0, canyon.spawn.z | 0)).toBeGreaterThanOrEqual(5.5);
    const low = make('backrooms', 'lowrooms').level;
    expect(ceilingAt(low, low.spawn.x | 0, low.spawn.z | 0)).toBeLessThan(2.3);
    expect(low.tiles.includes(TILE.CRAWL)).toBe(true);
    expect(make('backrooms', 'maze').level.layout).toBe('maze');
  });

  it('a shopfront is not read as a ladder', () => {
    const { level: mall } = make('mall', undefined, 5, 52, 38);
    for (let i = 0; i < mall.tiles.length; i++) expect(isLadder(mall, i)).toBe(false);
  });
});
