import { describe, expect, it } from 'vitest';
import { createLevel, cloneLevel, TILE, LIGHT } from '../src/core/level.js';
import { fillTiles, rectIndices } from '../src/core/ops.js';
import { DOOR, setDoor } from '../src/core/doors.js';
import { FACING } from '../src/core/objects.js';
import { Shifts, behind, facingRot } from '../src/world/shifts.js';
import { MOODS } from '../src/gen/moods.js';

// To rom (x 1–8 og x 10–17, z 1–6) med vegg i x 9 og to dører i den (z 2 og z 5), lys i taket.
function rooms({ doors = [2, 5] } = {}) {
  const level = createLevel({ w: 19, h: 8 });
  fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 17, z1: 6 }), TILE.FLOOR);
  fillTiles(level, rectIndices(level, { x0: 9, z0: 1, x1: 9, z1: 6 }), TILE.WALL);
  for (const z of doors) setDoor(level, 9, z, DOOR.OPEN);
  for (let x = 2; x <= 16; x += 3) level.lights[3 * level.w + x] = LIGHT.ON;
  return level;
}

// Spilleren går gjennom punktene (et halvt sekund mellom hvert). Langs z = 2,5 går man gjennom
// døren i (9, 2); langs z = 3,5 under lysene.
function walk(shifts, level, path) {
  for (const [x, z] of path) shifts.observe(level, x, z, 0.5);
}
const east = (z, x0, x1) => Array.from({ length: (x1 - x0) * 2 + 1 }, (_, k) => [x0 + k / 2, z]);

describe('bak ryggen', () => {
  it('bare det som er bak spilleren og et stykke unna (yaw 0 = mot −z)', () => {
    const view = { x: 5, z: 5, yaw: 0 };
    expect(behind(view, 5, 10)).toBe(true); // rett bak
    expect(behind(view, 5, 0)).toBe(false); // rett foran
    expect(behind(view, 10, 5)).toBe(false); // til siden (90°) – kan sees i øyekroken
    expect(behind(view, 5, 6)).toBe(false); // for nær
  });

  it('retningen som peker mot spilleren', () => {
    for (const [dx, dz] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) expect(FACING[facingRot(dx * 3, dz * 3)]).toEqual([dx, dz]);
  });
});

describe('endringer når man ikke ser', () => {
  it('en dør man gikk gjennom blir vegg – men rommene henger fortsatt sammen', () => {
    const level = rooms();
    const shifts = new Shifts(() => 0, [0, 0]); // 0 → første type med kandidater: doorWall
    walk(shifts, level, east(2.5, 2, 15));
    const s = shifts.pick(level, { x: 15, z: 2.5, yaw: -Math.PI / 2 }); // ser mot +x, døren er bak
    expect(s.kind).toBe('doorWall');
    const copy = cloneLevel(level);
    s.apply(copy);
    expect(copy.tiles[2 * level.w + 9]).toBe(TILE.WALL);
    expect(copy.tiles[5 * level.w + 9]).toBe(TILE.DOOR);
  });

  it('aldri den eneste veien tilbake', () => {
    const level = rooms({ doors: [2] });
    const shifts = new Shifts(() => 0, [0, 0]);
    walk(shifts, level, east(2.5, 2, 15));
    const s = shifts.pick(level, { x: 15, z: 2.5, yaw: -Math.PI / 2 });
    expect(s?.kind).not.toBe('doorWall');
  });

  it('et lys man gikk under slukner bak en', () => {
    const level = rooms();
    const shifts = new Shifts(() => 0.99, [0, 0]); // høy verdi: siste type med kandidater
    walk(shifts, level, east(3.5, 2, 8));
    const s = shifts.pick(level, { x: 8.5, z: 3.5, yaw: -Math.PI / 2 });
    expect(['lightOut', 'doorClose']).toContain(s.kind);
    const lit = (l) => l.lights.filter((v) => v === LIGHT.ON).length;
    const copy = cloneLevel(level);
    s.apply(copy);
    if (s.kind === 'lightOut') {
      expect(lit(copy)).toBe(lit(level) - 1);
      expect(s.c.x).toBeLessThan(6); // bak spilleren
    }
  });

  it('en gjenstand bak en snur seg mot en', () => {
    const level = rooms({ doors: [] });
    level.lights.fill(0);
    level.objects = [{ id: 'dinerchair', x: 2, z: 3, rot: 2 }];
    const shifts = new Shifts(() => 0, [0, 0]);
    const s = shifts.pick(level, { x: 7.5, z: 3.5, yaw: -Math.PI / 2 });
    expect(s.kind).toBe('objectTurn');
    const copy = cloneLevel(level);
    s.apply(copy);
    expect(FACING[copy.objects[0].rot]).toEqual([1, 0]); // mot spilleren i +x
    expect(level.objects[0].rot).toBe(2); // originalen er urørt
  });

  it('ingenting skjer foran øynene på en, eller før det er tid', () => {
    const level = rooms();
    const shifts = new Shifts(() => 0, [60, 60]);
    walk(shifts, level, east(2.5, 2, 15));
    expect(shifts.pick(level, { x: 15, z: 2.5, yaw: -Math.PI / 2 })).toBeNull(); // ikke tid ennå
    shifts.wait = 0;
    expect(shifts.pick(level, { x: 15, z: 2.5, yaw: Math.PI / 2 })).toBeNull(); // ser rett på alt
  });

  it('bare i Liminal og sterkere – oftere jo sterkere', () => {
    expect(MOODS.normal.shifts).toBeNull();
    expect(MOODS.abandoned.shifts).toBeNull();
    expect(MOODS.uncanny.shifts[1]).toBeLessThan(MOODS.liminal.shifts[1]);
    expect(MOODS.nightmare.shifts[1]).toBeLessThan(MOODS.uncanny.shifts[1]);
  });
});
