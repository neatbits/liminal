import { describe, expect, it } from 'vitest';
import { TILE } from '../src/core/level.js';
import { objectFits, OBJECTS } from '../src/core/objects.js';
import { THEME_IDS, getTheme } from '../src/core/themes.js';
import { canHoldWindow } from '../src/core/windows.js';
import { reachableCells } from '../src/gen/tapes.js';
import { generateLevel } from '../src/gen/index.js';
import { nextLevel } from '../src/gen/endless.js';
import { mulberry32 } from '../src/core/rng.js';
import { NOCLIP, storeLevel, storeReturn, markWall, againstMark, noclipMood, recordNoclip } from '../src/gen/noclip.js';
import { MOODS } from '../src/gen/moods.js';

describe('butikken i Noclip', () => {
  const store = storeLevel();

  it('er en vanlig møbelbutikk: møbler, en kasse, dagslys og et lager med hyller', () => {
    const ids = store.objects.map((o) => o.id);
    expect(ids).toEqual(expect.arrayContaining(['sofa', 'double_bed', 'table', 'counter', 'register', 'cashier', 'shelf', 'toilet', 'sink']));
    expect(ids.filter((id) => id === 'shelf').length).toBeGreaterThan(8);
    expect(store.sky).toBe('day');
    expect(store.meta.some((m, i) => store.tiles[i] === TILE.WALL && m & 1)).toBe(true); // vinduer
    expect(store.lights.some(Boolean)).toBe(true);
  });

  it('alt står der det får plass, og hele butikken og lageret kan nås', () => {
    for (const o of store.objects) expect(objectFits(store, o), `${o.id} ${o.x},${o.z}`).toBe(true);
    const reach = reachableCells(store, store.spawn.x, store.spawn.z);
    const { x, z } = store.noclip;
    expect(reach[z * store.w + x]).toBe(1);
  });

  it('firkanten står på lagerveggen, foran en ekte vegg', () => {
    const { x, z, dx, dz } = store.noclip;
    expect(store.tiles[(z + dz) * store.w + x + dx]).toBe(TILE.WALL);
    expect(store.objects.some((o) => o.id === NOCLIP.MARK && o.x === x && o.z === z)).toBe(true);
    expect(OBJECTS[NOCLIP.MARK].mount).toBe('wall');
    expect(store.finish[z * store.w + x]).toBe(1); // betong på lageret
  });

  it('temaet er skjult: man havner aldri i butikken gjennom en dør', () => {
    expect(getTheme('store').id).toBe('store');
    expect(THEME_IDS).not.toContain('store');
  });
});

describe('veggen man går gjennom', () => {
  const mark = { x: 5, z: 5, dx: 0, dz: 1 }; // veggen er i z = 6, flaten i z = 6
  const facing = Math.PI; // blikket mot +z

  it('virker når man står helt inntil og ser mot den', () => {
    expect(againstMark(mark, { x: 5.5, z: 5.7, yaw: facing })).toBe(true);
  });

  it('ikke fra avstand, ikke ved siden av, og ikke med ryggen til', () => {
    expect(againstMark(mark, { x: 5.5, z: 5.0, yaw: facing })).toBe(false);
    expect(againstMark(mark, { x: 6.5, z: 5.7, yaw: facing })).toBe(false);
    expect(againstMark(mark, { x: 5.5, z: 5.7, yaw: 0 })).toBe(false);
    expect(againstMark(null, { x: 5.5, z: 5.7, yaw: facing })).toBe(false);
  });

  it('i butikken kommer man tilbake foran firkanten, med ryggen mot den', () => {
    const store = storeLevel();
    const back = storeReturn(store);
    expect(againstMark(store.noclip, { x: back.x, z: back.z, yaw: back.a })).toBe(false);
    const { dx, dz } = store.noclip;
    expect(-Math.sin(back.a) * dx - Math.cos(back.a) * dz).toBeLessThan(-0.9); // blikket bort fra veggen
    expect(store.tiles[Math.floor(back.z) * store.w + Math.floor(back.x)]).toBe(TILE.FLOOR);
  });
});

describe('innover', () => {
  it('det første nivået er Level 0, med en firkant tilbake rett ved der man kommer inn', () => {
    for (let seed = 1; seed <= 6; seed++) {
      const { level } = nextLevel(1, 'store', mulberry32(seed), { corridor: 0.5 }, 1, 'backrooms');
      expect(level.theme).toBe('backrooms');
      expect(markWall(level)).toBe(true);
      const { x, z, dx, dz } = level.noclip;
      expect(level.tiles[(z + dz) * level.w + x + dx]).toBe(TILE.WALL);
      expect(Math.hypot(level.spawn.x - x - 0.5, level.spawn.z - z - 0.5)).toBeLessThan(0.5);
      expect(againstMark(level.noclip, { x: level.spawn.x, z: level.spawn.z, yaw: level.spawn.a })).toBe(false); // ryggen til
      for (const o of level.objects.filter((q) => q.id === NOCLIP.MARK)) expect(objectFits(level, o)).toBe(true);
    }
  });

  it('det blir rarere innover, men skikkelsen tar deg aldri', () => {
    const moods = [1, 2, 3, 6, 10, 40].map(noclipMood);
    expect(moods[0]).toBe('liminal');
    expect(new Set(moods).size).toBeGreaterThan(2);
    for (const m of moods) expect(MOODS[m].monster).not.toBe('hunt');
  });

  it('rekorden er det lengste man har kommet', () => {
    const a = recordNoclip({}, { depth: 4, distance: 312.4 });
    expect(recordNoclip(a, { depth: 2, distance: 80 })).toEqual({ runs: 2, bestDepth: 4, bestDistance: 312 });
  });

  it('nivåer som ikke er tvunget, velges som før', () => {
    const a = nextLevel(3, 'office', mulberry32(9));
    const b = nextLevel(3, 'office', mulberry32(9), undefined, 1, null);
    expect(a.level.theme).toBe(b.level.theme);
    expect(generateLevel).toBeTypeOf('function');
  });
});
