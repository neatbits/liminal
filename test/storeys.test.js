import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLevel, cloneLevel, resizeLevel, TILE } from '../src/core/level.js';
import { fillRect } from '../src/gen/util.js';
import { SLAB, STAIR_THROUGH } from '../src/core/heights.js';
import {
  MAX_STOREYS, storeyCount, storeyLevel, insertStorey, insertBelow, removeStorey, copyStorey, emptyStorey, spawnStorey,
  highestCeiling, poolsOver, storeyGap, storeyElevations,
} from '../src/core/storeys.js';
import { levelToJSON, levelFromJSON, encodeLevel, decodeLevel, VERSION } from '../src/core/serialize.js';
import { History } from '../src/core/history.js';
import { walkLevels } from '../src/core/stairwells.js';
import { ceilingAt } from '../src/core/heights.js';
import { saveRoom, loadRoom } from '../src/core/storage.js';

/** 10 × 8, 3 m tak, med ett rom (x 1–8, z 1–6). */
function room() {
  const level = createLevel({ theme: 'hotel', w: 10, h: 8, height: 3 });
  fillRect(level, 1, 1, 8, 6, TILE.FLOOR);
  return level;
}
const at = (level, x, z) => z * level.w + x;

describe('etasjer', () => {
  it('legger til, kopierer og fjerner etasjer, med felles tema og høyst MAX_STOREYS', () => {
    const r = room();
    expect(storeyCount(r)).toBe(1);
    expect(insertStorey(r, 1)).toBe(1);
    expect(storeyLevel(r, 1).tiles.every((t) => t === TILE.WALL)).toBe(true);
    expect(insertStorey(r, 2, copyStorey(r, 0))).toBe(2);
    expect(storeyLevel(r, 2).tiles).toEqual(r.tiles);
    expect(storeyLevel(r, 2).tiles).not.toBe(r.tiles);
    expect(storeyLevel(r, 2).storeys).toBeUndefined();
    r.theme = 'office';
    r.sky = 'night';
    expect(storeyLevel(r, 1)).toMatchObject({ theme: 'office', sky: 'night' });
    while (storeyCount(r) < MAX_STOREYS) insertStorey(r, 1);
    expect(insertStorey(r, 1)).toBe(-1);
    expect(removeStorey(r, MAX_STOREYS)).toBe(false);
    expect(removeStorey(r, 1)).toBe(true);
    expect(storeyCount(r)).toBe(MAX_STOREYS - 1);
    expect(storeyLevel(r, MAX_STOREYS)).toBeNull();
  });

  it('en kopi har bassengene og skliene, men ikke sklier ned fra etasjen over eller trapper opp', () => {
    const r = room();
    fillRect(r, 5, 2, 7, 4, TILE.WATER);
    r.tiles[at(r, 2, 5)] = r.tiles[at(r, 3, 5)] = TILE.STAIRS;
    r.meta[at(r, 2, 5)] = STAIR_THROUGH; // trapp opp
    r.floors[at(r, 2, 5)] = r.floors[at(r, 3, 5)] = 6;
    r.depths.fill(25);
    const own = { points: [[2, 3], [5, 3]], tube: false };
    r.slides = [own, { points: [[2, 4], [5, 4]], tube: false, drop: true }];
    const copy = copyStorey(r, 0);
    expect(copy.tiles[at(r, 6, 3)]).toBe(TILE.WATER);
    expect(copy.depths[at(r, 6, 3)]).toBe(25);
    expect(copy.slides).toEqual([own]);
    expect(copy.tiles).not.toBe(r.tiles);
    expect([copy.tiles[at(r, 2, 5)], copy.meta[at(r, 2, 5)], copy.floors[at(r, 2, 5)]]).toEqual([TILE.FLOOR, 0, 0]);
    expect(copy.tiles[at(r, 3, 5)]).toBe(TILE.STAIRS); // vanlig trapp følger med
  });

  it('løfter etasjen over det høyeste taket under, og høyt nok til at bassenget henger ned som en kasse', () => {
    const r = room();
    r.ceilings[at(r, 2, 2)] = 45;
    const one = emptyStorey(r);
    fillRect(one, 1, 1, 8, 6, TILE.FLOOR);
    fillRect(one, 3, 3, 4, 4, TILE.WATER);
    one.depths[at(one, 3, 3)] = 25;
    insertStorey(r, 1, one);
    insertStorey(r, 2);
    expect(highestCeiling(r)).toBe(4.5);
    expect(poolsOver(r, one).map((p) => p.depth)).toEqual([2.5, 0.7, 0.7, 0.7]);
    // 2,1 m fri høyde under det dypeste bassenget + platen + dybden.
    expect(storeyGap(r, one)).toBeCloseTo(2.1 + SLAB + 2.5);
    const [ground, first, second] = storeyElevations(r);
    expect(ground).toBe(0);
    expect(first).toBeCloseTo(4.9);
    expect(second).toBeCloseTo(first + 3 + SLAB);
    // Taket under det dype hjørnet senkes til 2,1 m; under resten er det høyt nok fra før.
    const [lower] = walkLevels(r).levels;
    expect(ceilingAt(lower, 3, 3)).toBeCloseTo(2.1);
    expect(ceilingAt(lower, 4, 4)).toBe(3);
    expect(r.ceilings[at(r, 3, 3)]).toBe(0); // rommet selv er urørt
  });

  it('kopierer og endrer størrelse på alle etasjene', () => {
    const r = room();
    insertStorey(r, 1, copyStorey(r, 0));
    const copy = cloneLevel(r);
    expect(copy.storeys[0]).not.toBe(r.storeys[0]);
    copy.storeys[0].tiles[0] = TILE.FLOOR;
    expect(r.storeys[0].tiles[0]).toBe(TILE.WALL);
    const big = resizeLevel(r, 14, 12);
    expect(big.storeys[0]).toMatchObject({ w: 14, h: 12 });
    expect(big.storeys[0].tiles[at(big, 3, 3)]).toBe(TILE.FLOOR);
  });
});

describe('etasjer i romformatet', () => {
  beforeEach(() => {
    const data = new Map();
    vi.stubGlobal('localStorage', { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) });
  });
  afterEach(() => vi.unstubAllGlobals());

  function building() {
    const r = room();
    r.sky = 'dusk';
    const one = copyStorey(r, 0);
    one.height = 4.2;
    one.tiles[at(one, 2, 2)] = TILE.WATER;
    one.objects = [{ id: 'pottedplant', x: 5, z: 3, rot: 1 }];
    insertStorey(r, 1, one);
    insertStorey(r, 2);
    return r;
  }
  const same = (a, b) => {
    expect(storeyCount(b)).toBe(storeyCount(a));
    for (let k = 1; k < storeyCount(a); k++) {
      const [x, y] = [storeyLevel(a, k), storeyLevel(b, k)];
      expect(y.tiles).toEqual(x.tiles);
      expect(y.height).toBe(x.height);
      expect(y.objects).toEqual(x.objects);
      expect(y.sky).toBe(a.sky);
    }
  };

  it('bevarer etasjene via JSON (v4), delingslenke og lokal lagring', async () => {
    const r = building();
    const json = JSON.parse(JSON.stringify(levelToJSON(r)));
    expect(json.v).toBe(VERSION);
    expect(VERSION).toBe(4);
    expect(json.storeys).toHaveLength(2);
    expect(json.storeys[0].name).toBeUndefined();
    expect(json.storeys[0].sky).toBeUndefined();
    same(r, levelFromJSON(json));
    same(r, await decodeLevel(await encodeLevel(r)));
    expect(saveRoom(r)).toBe(true);
    same(r, loadRoom(r.id));
  });

  it('leser rom uten etasjer, og avviser ødelagte etasjelister', () => {
    const json = levelToJSON(room());
    expect(json.storeys).toBeUndefined();
    expect(levelFromJSON({ ...json, v: 3 }).storeys).toBeUndefined();
    expect(() => levelFromJSON({ ...json, storeys: 'x' })).toThrow('Invalid floors');
    expect(() => levelFromJSON({ ...json, storeys: [null] })).toThrow('Invalid floors');
    expect(() => levelFromJSON({ ...json, storeys: Array(MAX_STOREYS).fill(json) })).toThrow('Invalid floors');
    expect(() => levelFromJSON({ ...json, storeys: [{ rows: ['x'] }] })).toThrow();
    // En etasje kan ikke ha egne etasjer.
    const nested = levelFromJSON({ ...json, storeys: [{ ...json, storeys: [json] }] });
    expect(storeyCount(nested)).toBe(2);
  });
});

describe('angre med etasjer', () => {
  it('angrer endringer i riktig etasje og sier hvilken', () => {
    const r = room();
    insertStorey(r, 1, copyStorey(r, 0));
    const history = new History();
    history.push(r, 1);
    storeyLevel(r, 1).tiles[at(r, 2, 2)] = TILE.WATER;
    history.push(r, 0);
    r.tiles[at(r, 3, 3)] = TILE.WATER;
    expect(history.undo(r)).toEqual({ storey: 0 });
    expect(r.tiles[at(r, 3, 3)]).toBe(TILE.FLOOR);
    expect(history.undo(r)).toEqual({ storey: 1 });
    expect(storeyLevel(r, 1).tiles[at(r, 2, 2)]).toBe(TILE.FLOOR);
    expect(history.redo(r)).toEqual({ storey: 1 });
    expect(storeyLevel(r, 1).tiles[at(r, 2, 2)]).toBe(TILE.WATER);
  });

  it('angrer og gjør om nye etasjer, og dropper tomme endringer av bygget', () => {
    const r = room();
    const history = new History();
    history.push(r, 'all');
    insertStorey(r, 1, copyStorey(r, 0));
    history.push(r, 1);
    storeyLevel(r, 1).tiles[0] = TILE.FLOOR;
    expect(history.undo(r)).toEqual({ storey: 1 });
    expect(history.undo(r)).toEqual({ all: true });
    expect(storeyCount(r)).toBe(1);
    expect(history.redo(r)).toEqual({ all: true });
    expect(storeyCount(r)).toBe(2);
    expect(history.redo(r)).toEqual({ storey: 1 });
    expect(storeyLevel(r, 1).tiles[0]).toBe(TILE.FLOOR);
    history.push(r, 'all');
    history.dropIfUnchanged(r);
    expect(history.undo(r)).toEqual({ storey: 1 });
  });
});

describe('startetasje og etasje under', () => {
  it('flytter innholdet opp når en etasje legges under, og man starter fortsatt samme sted', () => {
    const r = room();
    r.spawn = { x: 4.5, z: 3.5, a: 1 };
    insertStorey(r, 1);
    const ground = r.tiles.slice();
    expect(insertBelow(r)).toBe(0);
    expect(r.tiles.every((t) => t === TILE.WALL)).toBe(true);
    expect(storeyLevel(r, 1).tiles).toEqual(ground);
    expect(storeyLevel(r, 1).spawn).toEqual({ x: 4.5, z: 3.5, a: 1 });
    expect(spawnStorey(r)).toBe(1);
    expect(storeyCount(r)).toBe(3);
    // Startetasjen følger med når etasjer legges til og fjernes.
    insertStorey(r, 1);
    expect(spawnStorey(r)).toBe(2);
    removeStorey(r, 1);
    expect(spawnStorey(r)).toBe(1);
    removeStorey(r, 1);
    expect(spawnStorey(r)).toBe(0);
    // Den nederste kan fjernes når det er flere: etasjen over flyttes ned.
    expect(removeStorey(r, 0)).toBe(true);
    expect(storeyCount(r)).toBe(1);
    expect(removeStorey(r, 0)).toBe(false);
  });

  it('lagrer startetasjen og hver etasjes startpunkt, og angrer flytting av startpunktet', () => {
    const r = room();
    insertStorey(r, 1, copyStorey(r, 0));
    const history = new History();
    history.push(r, 1);
    storeyLevel(r, 1).spawn = { x: 6.5, z: 2.5, a: 0 };
    r.spawnStorey = 1;
    const back = levelFromJSON(JSON.parse(JSON.stringify(levelToJSON(r))));
    expect(spawnStorey(back)).toBe(1);
    expect(storeyLevel(back, 1).spawn).toEqual({ x: 6.5, z: 2.5, a: 0 });
    expect(levelFromJSON({ ...levelToJSON(r), spawnStorey: 9 }).spawnStorey).toBeUndefined();
    expect(history.undo(r)).toEqual({ storey: 1 });
    expect(spawnStorey(r)).toBe(0);
    expect(history.redo(r)).toEqual({ storey: 1 });
    expect(spawnStorey(r)).toBe(1);
  });
});
