import { describe, expect, it } from 'vitest';
import { createLevel, resizeLevel, TILE } from '../src/core/level.js';
import { fillTiles, rectIndices } from '../src/core/ops.js';
import { OBJECTS, placeObject, objectPose, objectColliders, objectsAt, objectBox } from '../src/core/objects.js';
import { WATER_SURFACE } from '../src/core/level.js';
import { levelFromJSON, levelToJSON } from '../src/core/serialize.js';
import { History } from '../src/core/history.js';
import { moveCircle } from '../src/world/collision.js';

// Rom 10 × 8 med gulv i x 1–8, z 1–6.
function room() {
  const level = createLevel({ w: 10, h: 8 });
  fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 8, z1: 6 }), TILE.FLOOR);
  return level;
}

describe('gjenstander', () => {
  it('settes inn på gulv, snus ved nytt klikk og fjernes med viskelær', () => {
    const level = room();
    expect(placeObject(level, 4, 3, 'tv')).toBe(1);
    expect(level.objects).toEqual([{ id: 'tv', x: 4, z: 3, rot: 0 }]);
    const before = level.objects;
    placeObject(level, 4, 3, 'tv');
    expect(level.objects[0].rot).toBe(1);
    expect(before[0].rot).toBe(0); // listen endres aldri på stedet
    expect(placeObject(level, 4, 3, 'tv', true)).toBe(1);
    expect(level.objects).toEqual([]);
  });

  it('ikke i vegg, vann eller med ukjent id', () => {
    const level = room();
    level.tiles[3 * 10 + 5] = TILE.WATER;
    expect(placeObject(level, 0, 0, 'tv')).toBe(0);
    expect(placeObject(level, 5, 3, 'tv')).toBe(0);
    expect(placeObject(level, 4, 3, 'sofa')).toBe(0);
  });

  it('ved en vegg vender den ryggen mot veggen og står inntil den', () => {
    const level = room();
    placeObject(level, 4, 1, 'tv'); // veggen er i nord (z = 0)
    const o = level.objects[0];
    expect(o.rot).toBe(0); // forsiden mot sør
    const p = objectPose(level, o);
    const [, , d] = OBJECTS.tv.size;
    expect(p.z - d / 2).toBeCloseTo(1.03, 5);
    expect(p.x).toBe(4.5);
  });

  it('dreid en kvart omdreining bytter bredde og dybde', () => {
    const level = room();
    level.objects = [{ id: 'tv', x: 4, z: 3, rot: 1 }];
    const p = objectPose(level, level.objects[0]);
    expect(p.w).toBe(OBJECTS.tv.size[2]);
    expect(p.d).toBe(OBJECTS.tv.size[0]);
  });

  it('stopper spilleren', () => {
    const level = room();
    placeObject(level, 4, 3, 'tv');
    expect(objectColliders(level, 4, 3)).toHaveLength(1);
    const [x] = moveCircle(level, 2.5, 3.5, 3, 0, 0.28, true, 0);
    expect(x).toBeLessThan(4.5 - OBJECTS.tv.size[0] / 2);
  });

  it('lagres, leses tilbake og følger med når rommet endrer størrelse', () => {
    const level = room();
    placeObject(level, 4, 3, 'tv');
    placeObject(level, 4, 3, 'tv');
    const data = JSON.parse(JSON.stringify(levelToJSON(level)));
    expect(levelFromJSON(data).objects).toEqual([{ id: 'tv', x: 4, z: 3, rot: 1 }]);
    data.objects.push({ id: 'unknown', x: 1, z: 1, rot: 0 }, { id: 'tv', x: 40, z: 1, rot: 0 });
    expect(levelFromJSON(data).objects).toHaveLength(1);
    const bigger = resizeLevel(level, 14, 8);
    expect(bigger.objects[0]).toMatchObject({ x: 6, z: 3 });
    expect(objectsAt(bigger, 6, 3)).toEqual([0]);
  });

  it('angre tar med gjenstandene', () => {
    const level = room();
    const history = new History();
    history.push(level);
    placeObject(level, 4, 3, 'tv');
    history.undo(level);
    expect(level.objects).toEqual([]);
    history.redo(level);
    expect(level.objects).toHaveLength(1);
  });

  it('små gjenstander settes oppå skrivebordet, også i naboruter det dekker', () => {
    const level = room();
    placeObject(level, 4, 3, 'desk');
    placeObject(level, 4, 3, 'laptop');
    placeObject(level, 5, 3, 'tv');
    const [desk, laptop, tv] = level.objects.map((o) => objectPose(level, o));
    expect(laptop.y).toBeCloseTo(OBJECTS.desk.surface);
    expect(tv.y).toBeCloseTo(OBJECTS.desk.surface);
    // TV-et er trukket inn så det står helt på bordplaten.
    expect(objectBox(tv)[2]).toBeLessThanOrEqual(objectBox(desk)[2] + 1e-9);
    // Viskelær tar det øverste først; uten bordet faller TV-et ned på gulvet.
    placeObject(level, 4, 3, 'tv', true);
    expect(level.objects.map((o) => o.id)).toEqual(['desk', 'tv']);
    placeObject(level, 4, 3, 'desk', true);
    expect(objectPose(level, level.objects[0]).y).toBe(0);
    placeObject(level, 5, 3, 'tv', true);
    expect(level.objects).toEqual([]);
  });

  it('store gjenstander går ikke inn i vegger eller i hverandre', () => {
    const level = room();
    expect(placeObject(level, 8, 3, 'desk')).toBe(1); // inntil østveggen: dreies langs veggen
    const box = objectBox(objectPose(level, level.objects[0]));
    expect(box[2]).toBeLessThanOrEqual(9);
    expect(placeObject(level, 1, 1, 'desk')).toBe(0); // 2 m bredt: får ikke plass midt i et hjørne
    expect(placeObject(level, 2, 1, 'desk')).toBe(1);
    expect(placeObject(level, 3, 1, 'desk')).toBe(0); // ville stått i skrivebordet ved siden av
  });

  it('skrivebordet stopper spilleren også i naboruter det stikker inn i', () => {
    const level = room();
    placeObject(level, 4, 3, 'desk');
    expect(objectColliders(level, 5, 3)).toHaveLength(1);
    expect(objectColliders(level, 6, 3)).toHaveLength(0);
  });

  it('en badeand flyter i vannet; et TV kan ikke stå der', () => {
    const level = room();
    level.tiles[3 * 10 + 5] = TILE.WATER;
    expect(placeObject(level, 5, 3, 'tv')).toBe(0);
    expect(placeObject(level, 5, 3, 'duck')).toBe(1);
    expect(objectPose(level, level.objects[0]).y).toBeLessThan(WATER_SURFACE);
    expect(objectColliders(level, 5, 3)).toEqual([]); // man vasser forbi den
  });
});

describe('gjenstander på vegg og i tak', () => {
  it('veggklokken henger på veggen bak seg, takvifta under taket', async () => {
    const { generateLevel } = await import('../src/gen/index.js');
    const { ceilingAt } = await import('../src/core/heights.js');
    const level = generateLevel({ theme: 'basement', w: 36, h: 28, seed: 3 });
    const fan = level.objects.find((o) => o.id === 'fan');
    const clock = level.objects.find((o) => o.id === 'clock');
    expect(fan).toBeTruthy();
    const fp = objectPose(level, fan);
    expect(fp.y + fp.h).toBeCloseTo(ceilingAt(level, fan.x, fan.z) - 0.01, 3);
    expect(level.lights[fan.z * level.w + fan.x]).toBe(0);
    expect(clock).toBeTruthy();
    expect(objectPose(level, clock).y).toBeGreaterThan(1.8);
    // En klokke uten vegg bak kan ikke henge der.
    const r = room();
    expect(placeObject(r, 4, 3, 'clock')).toBe(0);
    expect(placeObject(r, 4, 1, 'clock')).toBe(1);
    // Takvifta og klokka er ikke i veien når man går.
    expect(objectColliders(level, fan.x, fan.z).filter((c) => c.bottom < 1.75)).toHaveLength(0);
  });
});
