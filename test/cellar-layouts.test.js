import { describe, it, expect } from 'vitest';
import { TILE } from '../src/core/level.js';
import { generateLevel, presetById } from '../src/gen/index.js';
import { LAYOUTS } from '../src/gen/layouts.js';
import { reachableCells } from '../src/gen/tapes.js';
import { ceilingAt } from '../src/core/heights.js';
import { objectFits, OBJECTS } from '../src/core/objects.js';
import { pillarContains } from '../src/core/pillars.js';
import { shopfronts } from '../src/core/shopfronts.js';
import { mallRoof } from '../src/core/mall-roof.js';
import { OBJECT_GROUPS } from '../src/ui/object-info.js';

const make = (theme, layout, seed = 7, w = 48, h = 40) => {
  const rooms = [];
  const level = generateLevel({ theme, w, h, seed, layout, onPlan: (p) => rooms.push(...p) });
  return { level, rooms };
};
const ids = (l) => l.objects.map((o) => o.id);
const count = (l, id) => ids(l).filter((x) => x === id).length;
const ALL = ['mall', 'basement'].flatMap((theme) => Object.keys(LAYOUTS[theme]).filter((id) => LAYOUTS[theme][id].build).map((id) => [theme, id]));

describe('mall and basement layouts', () => {
  it.each(ALL)('%s %s: all of it can be reached, and everything fits', (theme, layout) => {
    for (const [seed, w, h] of [[1, 48, 40], [7, 40, 56], [23, 64, 44]]) {
      const { level: l } = make(theme, layout, seed, w, h);
      expect(l.layout).toBe(layout);
      const reach = reachableCells(l, l.spawn.x, l.spawn.z);
      const lost = [...l.tiles.keys()].filter((i) => {
        if ((l.tiles[i] !== TILE.FLOOR && l.tiles[i] !== TILE.WATER) || reach[i]) return false;
        return !pillarContains(l, (i % l.w) + 0.5, Math.floor(i / l.w) + 0.5, 0.3);
      });
      expect(lost, `seed ${seed} ${w}×${h}`).toEqual([]);
      for (const o of l.objects) expect(objectFits(l, o), `${o.id} ${o.x},${o.z}`).toBe(true);
    }
  });

  it('new levels vary, and the atrium is still the most common mall', () => {
    for (const theme of ['mall', 'basement']) {
      const seen = {};
      for (let seed = 1; seed <= 60; seed++) {
        const name = generateLevel({ theme, w: 48, h: 40, seed }).layout ?? 'classic';
        for (const part of name.split('+')) seen[part] = (seen[part] ?? 0) + 1;
      }
      for (const id of Object.keys(LAYOUTS[theme])) expect(Object.keys(seen).join(), `${theme}: ${id}`).toContain(id);
      if (theme === 'mall') expect(seen.classic).toBeGreaterThan(15);
    }
  }, 60000);

  it('the examples and the old mall plans are untouched', () => {
    for (const id of ['mall', 'basement', 'mall-terraces']) expect(presetById(id).make().layout).toBeUndefined();
  });

  it('the food court has cafés along the wall, tables and a glass roof over the hall', () => {
    const { level: l, rooms } = make('mall', 'foodcourt');
    const hall = rooms.find((r) => r.kind === 'foodcourt');
    expect(ceilingAt(l, hall.x0 + 3, hall.z0 + 3)).toBeCloseTo(7);
    expect(mallRoof(l)).not.toBe(null);
    expect(shopfronts(l).length).toBeGreaterThan(2);
    expect(shopfronts(l).every((f) => f.style === 3)).toBe(true);
    expect(count(l, 'dinerset') + count(l, 'cafe')).toBeGreaterThan(10);
  });

  it('the promenade is lower, with mostly closed shops on both sides and benches down the middle', () => {
    const { level: l, rooms } = make('mall', 'promenade', 7, 64, 44);
    const street = rooms.find((r) => r.kind === 'promenade');
    expect(ceilingAt(l, street.x0, street.z0)).toBeCloseTo(4.6);
    expect(mallRoof(l)).toBe(null);
    expect(shopfronts(l).length).toBeGreaterThan(4);
    const closed = [...l.tiles.keys()].filter((i) => l.tiles[i] === TILE.DOOR && l.meta[i] & 1);
    expect(closed.length).toBeGreaterThan(4);
    expect(ids(l)).toEqual(expect.arrayContaining(['mallbench', 'pottedtree']));
  });

  it('the service corridors are low, with stockrooms full of shelves', () => {
    const { level: l, rooms } = make('mall', 'service');
    expect(rooms.some((r) => r.kind === 'stockroom')).toBe(true);
    expect(count(l, 'shelf')).toBeGreaterThan(5);
    expect(ceilingAt(l, l.spawn.x | 0, l.spawn.z | 0)).toBeCloseTo(2.8);
  });

  it('storage cages are small, many and mostly locked', () => {
    const { rooms, level: l } = make('basement', 'storage');
    const cages = rooms.filter((r) => r.kind === 'cage');
    expect(cages.length).toBeGreaterThan(20);
    for (const c of cages) expect(Math.min(c.x1 - c.x0, c.z1 - c.z0) + 1).toBeLessThanOrEqual(3);
    const doors = [...l.tiles.keys()].filter((i) => l.tiles[i] === TILE.DOOR);
    expect(doors.filter((i) => (l.meta[i] & 3) === 1).length / doors.length).toBeGreaterThan(0.4);
  });

  it('the boiler room is taller, with boilers along the walls', () => {
    const { level: l, rooms } = make('basement', 'boiler');
    const hall = rooms.find((r) => r.kind === 'boiler');
    expect(ceilingAt(l, hall.x0 + 1, hall.z0 + 1)).toBeCloseTo(3.4);
    expect(count(l, 'boiler')).toBeGreaterThan(2);
  });

  it('the shelter is low, with dormitories full of bunk beds', () => {
    const { level: l } = make('basement', 'shelter');
    expect(ceilingAt(l, l.spawn.x | 0, l.spawn.z | 0)).toBeCloseTo(2.2);
    expect(count(l, 'bunkbed')).toBeGreaterThan(8);
  });

  it('the laundry has washing machines and drying rooms', () => {
    const { level: l, rooms } = make('basement', 'laundry');
    expect(rooms.some((r) => r.kind === 'drying')).toBe(true);
    expect(count(l, 'washer')).toBeGreaterThan(2);
  });

  it('the boiler, the bunk bed, the toilet and the sink are in the catalogue and the picker, the models with credits', () => {
    expect(OBJECTS.boiler.build).toBe('boiler');
    for (const [id, file] of [['bunkbed', 'bunk_bed'], ['toilet', 'toilet'], ['sink', 'simple_sink'], ['washer', 'washing_machine_2']]) {
      expect(OBJECTS[id].file).toBe(file);
      expect(OBJECTS[id].attribution?.license).toMatch(/CC BY 4.0/);
    }
    for (const id of ['boiler', 'bunkbed', 'mirror']) expect(OBJECT_GROUPS.some(([, list]) => list.includes(id))).toBe(true);
  });
});
