import { describe, it, expect } from 'vitest';
import { TILE, createLevel } from '../src/core/level.js';
import { generateLevel, presetById } from '../src/gen/index.js';
import { LAYOUTS, buildLayout } from '../src/gen/layouts.js';
import { reachableCells } from '../src/gen/tapes.js';
import { objectFits, OBJECTS } from '../src/core/objects.js';
import { levelToJSON, levelFromJSON } from '../src/core/serialize.js';
import { LOOKS, surfacesOf, clampLook } from '../src/core/looks.js';
import { getTheme } from '../src/core/themes.js';
import { ceilingAt } from '../src/core/heights.js';
import { halfWalls, halfWallContains } from '../src/core/half-walls.js';
import { mulberry32 } from '../src/core/rng.js';

const ALL = ['hotel', 'office'].flatMap((theme) => Object.keys(LAYOUTS[theme]).map((layout) => [theme, layout]));
const make = (theme, layout, seed = 7, w = 48, h = 40) => {
  const rooms = [];
  const level = generateLevel({ theme, w, h, seed, layout, onPlan: (p) => rooms.push(...p) });
  return { level, rooms };
};
const ids = (l) => new Set(l.objects.map((o) => o.id));

describe('hotel and office layouts', () => {
  it.each(ALL)('%s %s: everything can be reached, and everything stands where it fits', (theme, layout) => {
    for (const seed of [1, 7, 23]) {
      const { level: l } = make(theme, layout, seed);
      expect(l.layout).toBe(layout);
      const reach = reachableCells(l, l.spawn.x, l.spawn.z);
      const lost = [...l.tiles.keys()].filter((i) => l.tiles[i] === TILE.FLOOR && !reach[i] && !isWallCell(l, i));
      expect(lost, `seed ${seed}`).toEqual([]);
      for (const o of l.objects) expect(objectFits(l, o), `${o.id} ${o.x},${o.z}`).toBe(true);
    }
  });

  it('every layout really is different', () => {
    const floors = ALL.map(([theme, layout]) => make(theme, layout).level.tiles.join(''));
    expect(new Set(floors).size).toBe(ALL.length);
  });

  it('new levels vary: all layouts turn up, and sometimes two together', () => {
    for (const theme of ['hotel', 'office']) {
      const seen = new Set();
      for (let seed = 1; seed <= 60; seed++) seen.add(generateLevel({ theme, w: 48, h: 40, seed }).layout);
      for (const id of Object.keys(LAYOUTS[theme])) expect(seen.has(id), `${theme}: ${id}`).toBe(true);
      expect([...seen].some((s) => s.includes('+')), theme).toBe(true);
    }
  }, 60000);

  it('two layouts side by side are joined up', () => {
    for (const [theme, layout] of [['hotel', 'lobby+wing'], ['hotel', 'conference+wing'], ['office', 'open+cells'], ['office', 'conference+archive']]) {
      const { level: l } = make(theme, layout, 3, 64, 44);
      expect(l.layout).toBe(layout);
      const reach = reachableCells(l, l.spawn.x, l.spawn.z);
      expect([...l.tiles.keys()].filter((i) => l.tiles[i] === TILE.FLOOR && !reach[i] && !isWallCell(l, i))).toEqual([]);
    }
  });

  it('the examples and old seeds of other themes are untouched', () => {
    const level = presetById('hotel').make();
    expect(level.layout).toBeUndefined();
    expect(level.look).toBe(0);
    expect(presetById('office').make().layout).toBeUndefined();
    expect(ids(level).has('double_bed')).toBe(false);
  });

  it('small rooms fall back to the old plan', () => {
    const l = createLevel({ theme: 'hotel', w: 12, h: 12 });
    expect(buildLayout(l, mulberry32(1), { doors: {} })).toBe(false);
    expect(generateLevel({ theme: 'hotel', w: 12, h: 12, seed: 4 }).layout).toBeUndefined();
  });

  it('a guest room has a bed by the far wall, nightstands, a tiled bath and a door', () => {
    const { level: l, rooms } = make('hotel', 'wing');
    const beds = l.objects.filter((o) => o.id === 'double_bed');
    // En dør til ingensteds bak sengen kan ta en av dem (gen/door-space.js).
    expect(beds.length).toBeGreaterThanOrEqual(rooms.filter((r) => r.kind === 'bedroom').length - 2);
    expect(l.objects.filter((o) => o.id === 'nightstand').length).toBeGreaterThanOrEqual(beds.length);
    for (const bath of rooms.filter((r) => r.kind === 'bath')) {
      expect(l.finish[bath.z0 * l.w + bath.x0]).toBe(1);
      const here = l.objects.filter((o) => o.x >= bath.x0 && o.x <= bath.x1 && o.z >= bath.z0 && o.z <= bath.z1);
      expect(here.map((o) => o.id).sort()).toEqual(['mirror', 'sink', 'toilet']); // speilet henger over vasken
    }
    expect(l.tiles.filter((t) => t === TILE.DOOR).length).toBeGreaterThan(beds.length);
  });

  it('the rooms are alike', () => {
    const { rooms } = make('hotel', 'wing');
    const shapes = new Set(rooms.filter((r) => r.kind === 'bedroom').map((r) => [r.x1 - r.x0, r.z1 - r.z0].sort().join()));
    expect(shapes.size).toBe(1);
  });

  it('the lobby and the ballroom are tall, with reception and tables', () => {
    const lobby = make('hotel', 'lobby');
    const hall = lobby.rooms.find((r) => r.kind === 'lobby');
    expect(ceilingAt(lobby.level, hall.x0 + 3, hall.z0 + 3)).toBeGreaterThanOrEqual(4);
    expect([...ids(lobby.level)]).toEqual(expect.arrayContaining(['counter', 'register', 'elevator', 'sofa']));
    expect(lobby.level.tiles.includes(TILE.PILLAR)).toBe(true);
    const ball = make('hotel', 'conference');
    const room = ball.rooms.find((r) => r.kind === 'ballroom');
    expect(ceilingAt(ball.level, room.x0 + 3, room.z0 + 3)).toBeGreaterThanOrEqual(3.6);
    expect([...ids(ball.level)]).toContain('cafe');
  });

  it('staff corridors are narrow, with laundry and storage', () => {
    const { level: l, rooms } = make('hotel', 'staff');
    expect(rooms.some((r) => r.kind === 'laundry') && rooms.some((r) => r.kind === 'storage')).toBe(true);
    expect([...ids(l)]).toEqual(expect.arrayContaining(['washer', 'archiveshelf']));
  });

  it('open plan has cubicles of half walls with desks, spread over the floor', () => {
    const { level: l } = make('office', 'open');
    const walls = l.objects.filter((o) => o.id === 'halfwall');
    expect(walls.length).toBeGreaterThan(20);
    expect(walls.length).toBeLessThanOrEqual(48);
    expect(l.objects.filter((o) => o.id === 'desk' || o.id === 'moderndesk').length).toBeGreaterThan(8);
    const zs = walls.map((o) => o.z);
    expect(Math.max(...zs) - Math.min(...zs)).toBeGreaterThan(14);
  });

  it('cellular offices have a core with lifts, toilets and a copier', () => {
    const { level: l, rooms } = make('office', 'cells');
    expect(rooms.filter((r) => r.kind === 'office').length).toBeGreaterThan(10);
    expect([...ids(l)]).toEqual(expect.arrayContaining(['elevator', 'toilet', 'copier']));
  });

  it('meeting rooms have glass walls that stop you, not the light', () => {
    const { level: l } = make('office', 'conference');
    const glass = l.objects.filter((o) => o.id === 'glasswall');
    expect(glass.length).toBeGreaterThan(5);
    const [a] = glass;
    expect(ceilingAt(l, a.x, a.z)).toBeCloseTo(2.2);
    expect(l.lights[a.z * l.w + a.x]).toBe(0);
    const low = halfWalls(l).filter((w) => w.top - w.bottom < 0.2);
    expect(low.length).toBe(glass.length);
  });

  it('the archive is dimmer than the rest', () => {
    const { level: l, rooms } = make('office', 'archive');
    const halls = rooms.filter((r) => r.kind === 'archive');
    let [on, dead] = [0, 0];
    for (const r of halls) for (let z = r.z0; z <= r.z1; z++) for (let x = r.x0; x <= r.x1; x++) {
      const v = l.lights[z * l.w + x];
      on += v === 1;
      dead += v === 3;
    }
    expect(dead).toBeGreaterThan(on * 0.5);
    expect(l.objects.filter((o) => o.id === 'archiveshelf').length).toBeGreaterThan(20);
  });
});

/** Ruten står under en glassvegg eller halvvegg, og er ikke et sted å gå. */
function isWallCell(l, i) {
  return halfWallContains(l, (i % l.w) + 0.5, Math.floor(i / l.w) + 0.5, 0.3);
}

describe('building looks', () => {
  it('every look has paintable textures, and the first is the theme itself', () => {
    for (const [theme, list] of Object.entries(LOOKS)) {
      expect(surfacesOf({ theme, look: 0 })).toBe(getTheme(theme).surfaces);
      for (let k = 1; k < list.length; k++) {
        const s = surfacesOf({ theme, look: k });
        expect(s.wall.tex).toBe(list[k].wall);
        expect(s.floor.tex).toBe(list[k].floor);
      }
    }
  });

  it('Poolrooms «Pink & cyan»: cyan tiles with a pink band at a fixed height in the lower part of the wall', () => {
    const k = LOOKS.pool.findIndex((l) => l.label === 'Pink & cyan');
    expect(k).toBeGreaterThan(0);
    const s = surfacesOf({ theme: 'pool', look: k });
    expect(s.wall.tex).toBe('poolTilesCyan');
    expect(s.wall2).toMatchObject({ tex: 'poolTilesCyanPink', split: 1.25, size: [1, 1.25] });
    expect(s.wall2.gloss).toEqual(getTheme('pool').surfaces.wall.gloss);
    expect(LOOKS.pool[4].label).toBe('Black'); // Abyss velger nr. 4
  });

  it('new buildings differ, and the look survives saving', () => {
    const seen = new Set();
    for (let seed = 1; seed <= 30; seed++) seen.add(generateLevel({ theme: 'hotel', w: 48, h: 40, seed }).look);
    expect(seen.size).toBeGreaterThan(2);
    const l = generateLevel({ theme: 'office', w: 48, h: 40, seed: 3 });
    l.look = 2;
    expect(levelFromJSON(levelToJSON(l)).look).toBe(2);
  });

  it('ignores looks that do not exist', () => {
    expect(clampLook('hotel', 99)).toBe(0);
    expect(clampLook('basement', 1)).toBe(0);
    expect(clampLook('office', 'x')).toBe(0);
    expect(surfacesOf({ theme: 'basement', look: 3 })).toBe(getTheme('basement').surfaces);
  });

  it('new objects are credited or built', () => {
    for (const id of ['double_bed', 'nightstand', 'toilet', 'sink', 'washer', 'copier', 'archiveshelf', 'elevator', 'glasswall']) {
      const d = OBJECTS[id];
      expect(d.file ? d.attribution : d.build, id).toBeTruthy();
    }
  });
});
