import { describe, it, expect } from 'vitest';
import { TILE } from '../src/core/level.js';
import { generateLevel, presetById } from '../src/gen/index.js';
import { LAYOUTS } from '../src/gen/layouts.js';
import { PIT_MAX } from '../src/gen/play-layouts.js';
import { reachableCells } from '../src/gen/tapes.js';
import { ceilingAt, depthAt } from '../src/core/heights.js';
import { objectFits } from '../src/core/objects.js';
import { pillarContains } from '../src/core/pillars.js';
import { LOOKS } from '../src/core/looks.js';
import { textureKeys } from '../src/textures/index.js';
import { ledFaces } from '../src/core/leds.js';
import { slidePath } from '../src/core/slides.js';

const make = (theme, layout, seed = 7, w = 48, h = 40) => generateLevel({ theme, w, h, seed, layout });
const count = (l, tile) => l.tiles.filter((t) => t === tile).length;
const ALL = ['pool', 'playroom'].flatMap((theme) => Object.keys(LAYOUTS[theme]).filter((id) => LAYOUTS[theme][id].build).map((id) => [theme, id]));

describe('extreme pools and playrooms', () => {
  it.each(ALL)('%s %s: all of it can be reached from the start, and everything fits', (theme, layout) => {
    for (const seed of [1, 7, 23]) {
      const l = make(theme, layout, seed);
      expect(l.layout).toBe(layout);
      const reach = reachableCells(l, l.spawn.x, l.spawn.z);
      const lost = [...l.tiles.keys()].filter((i) => (l.tiles[i] === TILE.FLOOR || l.tiles[i] === TILE.WATER) && !reach[i] && !pillarContains(l, (i % l.w) + 0.5, Math.floor(i / l.w) + 0.5, 0.3));
      expect(lost, `seed ${seed}`).toEqual([]);
      for (const o of l.objects) expect(objectFits(l, o), `${o.id} ${o.x},${o.z}`).toBe(true);
      expect(l.tiles.includes(TILE.DOOR), `${layout} ${seed}: a way on`).toBe(true);
    }
  });

  it('new levels vary, and the old plan is still among them', () => {
    for (const theme of ['pool', 'playroom']) {
      const seen = new Set();
      for (let seed = 1; seed <= 60; seed++) seen.add(generateLevel({ theme, w: 48, h: 40, seed }).layout ?? 'classic');
      for (const id of Object.keys(LAYOUTS[theme])) expect(seen.has(id), `${theme}: ${id}`).toBe(true);
    }
  }, 60000);

  it('the examples are untouched', () => {
    expect(presetById('pools').make().layout).toBeUndefined();
    expect(presetById('playroom').make().layout).toBeUndefined();
  });

  it('the cathedral is enormous, with wide columns standing in water of different depths', () => {
    const l = make('pool', 'cathedral');
    expect(ceilingAt(l, 10, 10)).toBeGreaterThanOrEqual(9);
    expect(count(l, TILE.PILLAR)).toBeGreaterThan(3);
    const depths = new Set([...l.tiles.keys()].filter((i) => l.tiles[i] === TILE.WATER).map((i) => depthAt(l, i % l.w, Math.floor(i / l.w))));
    expect(depths.size).toBeGreaterThanOrEqual(3);
  });

  it('the water park has several tall slides that all work', () => {
    for (const [theme, layout] of [['pool', 'lagoon'], ['playroom', 'tower']]) {
      const l = make(theme, layout);
      expect(l.slides.length).toBeGreaterThanOrEqual(2);
      expect(Math.max(...l.floors) / 10).toBeGreaterThanOrEqual(3.6);
      for (const s of l.slides) expect(slidePath(l, s).problem).toBeFalsy();
    }
  });

  it('the abyss is deep, black, dim and without pool toys', () => {
    const l = make('pool', 'abyss');
    const water = [...l.tiles.keys()].filter((i) => l.tiles[i] === TILE.WATER);
    expect(water.every((i) => depthAt(l, i % l.w, Math.floor(i / l.w)) >= 3)).toBe(true);
    expect(LOOKS.pool[l.look].label).toBe('Black');
    expect(l.bright).toBeLessThan(1);
    expect(l.lights.filter((v) => v === 3).length).toBeGreaterThan(l.lights.filter((v) => v === 1).length * 0.7);
    expect(l.objects.some((o) => ['duck', 'flamingo', 'divingboard'].includes(o.id))).toBe(false);
  });

  it('the canals are low and flooded, with dry rooms and deep shafts', () => {
    const l = make('pool', 'canals');
    expect(ceilingAt(l, l.spawn.x | 0, l.spawn.z | 0)).toBeLessThan(2.6);
    expect(count(l, TILE.WATER)).toBeGreaterThan(count(l, TILE.FLOOR));
    const depths = [...l.tiles.keys()].filter((i) => l.tiles[i] === TILE.WATER).map((i) => depthAt(l, i % l.w, Math.floor(i / l.w)));
    expect(Math.min(...depths)).toBeLessThanOrEqual(0.5);
    expect(Math.max(...depths)).toBe(3);
  });

  it('the ball sea covers the floor, but never more than the balls can bear', () => {
    const l = make('playroom', 'ballsea');
    expect(count(l, TILE.WATER)).toBeGreaterThan(count(l, TILE.FLOOR));
    for (const layout of ['ballsea', 'tower', 'blacklight']) {
      const big = count(make('playroom', layout, 3, 128, 128), TILE.WATER);
      expect(big, layout).toBeLessThanOrEqual(PIT_MAX);
      expect(big, layout).toBeGreaterThan(PIT_MAX * 0.4);
    }
  }, 30000);

  it('the soft maze is low, with crawl holes through the walls', () => {
    const l = make('playroom', 'softmaze');
    expect(ceilingAt(l, l.spawn.x | 0, l.spawn.z | 0)).toBeLessThan(2.4);
    expect(count(l, TILE.CRAWL)).toBeGreaterThan(3);
  });

  it('the dark room has no working ceiling lights, only a limited number of LEDs', () => {
    const l = make('playroom', 'blacklight');
    expect(l.lights.filter((v) => v === 1 || v === 2).length).toBe(0);
    expect(ledFaces(l).length).toBeGreaterThan(20);
    expect(ledFaces(make('playroom', 'blacklight', 3, 96, 96)).length).toBeLessThan(400);
  });

  it('every look can be painted', () => {
    const keys = new Set(textureKeys());
    for (const list of Object.values(LOOKS)) for (const look of list) for (const k of ['wall', 'wall2', 'floor', 'ceiling', 'basin']) if (look[k]) expect(keys.has(look[k]), look[k]).toBe(true);
  });
});
