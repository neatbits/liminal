import { describe, expect, it } from 'vitest';
import { createLevel, TILE, getTile } from '../src/core/level.js';
import { fillTiles, rectIndices } from '../src/core/ops.js';
import { FACING, objectFits, objectGround, walkBlockers } from '../src/core/objects.js';
import { depthAt, groundAt } from '../src/core/heights.js';
import { generateLevel } from '../src/gen/index.js';
import { basins } from '../src/gen/variety.js';
import { Walker } from '../src/view3d/walker.js';
import { STEP_UP } from '../src/world/collision.js';

const TOP = 0.835;
const still = { forward: 0, strafe: 0, running: false, consumeLook: () => [0, 0] };

// Gulv i x 1–12, z 1–8, basseng i x 5–12, z 2–7, og et stupebrett i (4, 4) som peker mot +x.
function pool() {
  const level = createLevel({ w: 14, h: 10, theme: 'pool' });
  fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 12, z1: 8 }), TILE.FLOOR);
  fillTiles(level, rectIndices(level, { x0: 5, z0: 2, x1: 12, z1: 7 }), TILE.WATER);
  level.objects = [{ id: 'divingboard', x: 4, z: 4, rot: 3 }];
  return level;
}

describe('stupebrett', () => {
  it('står med foten på kanten og brettet ute over vannet', () => {
    const level = pool();
    expect(objectFits(level, level.objects[0])).toBe(true);
    // Tuppen (ca. 4 m ut fra ruten) er over vannet, bakenden på gulvet.
    expect(objectGround(level, 8.8, 4.5).y).toBeCloseTo(TOP, 5);
    expect(getTile(level, 8, 4)).toBe(TILE.WATER);
    expect(objectGround(level, 4.6, 4.5).y).toBeCloseTo(TOP, 5); // rett foran trinnet
  });

  it('gangflaten: trinn bak, flatt ut til tuppen, og ingenting ved siden av', () => {
    const level = pool();
    const back = 4.5 + 1.9 - 5.195 / 2; // bakenden
    expect(objectGround(level, back + 0.3, 4.5).y).toBeCloseTo(TOP / 2, 3); // halvveis opp trinnet
    expect(objectGround(level, 7, 4.5 + 0.5)).toBeNull(); // utenfor stripen
    expect(objectGround(level, 7, 4.5, 0.4)).toBeNull(); // for høyt å nå fra gulvet
    expect(objectGround(level, 7, 4.5).spring).toBe(true);
  });

  it('er en hindring fra gulvet og vannet, men ikke når man står på det', () => {
    const level = pool();
    expect(walkBlockers(level, 6, 4, 0, STEP_UP, 1.75).length).toBe(1);
    expect(walkBlockers(level, 6, 4, TOP, STEP_UP, 1.75).length).toBe(0);
    // Den nederste delen av trinnet kommer man opp på.
    const [box] = walkBlockers(level, 4, 4, 0, STEP_UP, 1.75);
    expect(box[0]).toBeGreaterThan(4.5 + 1.9 - 5.195 / 2);
  });

  it('man kan gå ut på brettet, falle i vannet med et plask – og hoppe høyere fra brettet', () => {
    const level = pool();
    const theme = { sound: { step: 'tile' }, tiles: {} };
    const w = new Walker();
    w.reset(level, { x: 5, z: 4.5, a: -Math.PI / 2 }); // på brettet, med blikket mot +x
    w.floorY = TOP;
    for (let i = 0; i < 60; i++) w.update(1 / 60, still, level, theme);
    expect(w.floorY).toBeCloseTo(TOP, 3); // står støtt
    w.update(1 / 60, { ...still, jumping: true }, level, theme);
    expect(w.vy).toBeGreaterThan(5); // stupebrettet gir ekstra fart
    let splash = 0;
    for (let i = 0; i < 300; i++) {
      w.update(1 / 60, { ...still, forward: 1 }, level, theme);
      splash = Math.max(splash, w.splash);
      w.splash = 0;
    }
    expect(w.x).toBeGreaterThan(9.1); // forbi tuppen
    expect(splash).toBeGreaterThan(2);
    expect(w.floorY).toBeCloseTo(groundAt(level, w.x, w.z), 3); // på bunnen av bassenget
  });

  it('på gulvet er hoppet vanlig, og man lander igjen', () => {
    const level = pool();
    const w = new Walker();
    w.reset(level, { x: 2.5, z: 7.5, a: 0 });
    w.update(1 / 60, { ...still, jumping: true }, level, { sound: { step: 'tile' } });
    expect(w.vy).toBeGreaterThan(3);
    expect(w.vy).toBeLessThan(4);
    for (let i = 0; i < 120; i++) w.update(1 / 60, still, level, { sound: { step: 'tile' } });
    expect(w.vy).toBe(0);
    expect(w.floorY).toBeCloseTo(0, 5);
  });

  it('Poolrooms får brett ved noen bassenger, pekende rett ut over vannet, og dypt vann der man lander', () => {
    let boards = 0;
    let withBoard = 0;
    let large = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const level = generateLevel({ theme: 'pool', seed });
      const list = level.objects.filter((o) => o.id === 'divingboard');
      boards += list.length;
      for (const o of list) {
        const [dx, dz] = FACING[o.rot];
        expect(getTile(level, o.x, o.z)).toBe(TILE.FLOOR);
        for (let k = 1; k <= 6; k++) expect(getTile(level, o.x + dx * k, o.z + dz * k)).toBe(TILE.WATER);
        expect(depthAt(level, o.x + dx * 4, o.z + dz * 4)).toBeGreaterThanOrEqual(2.8);
      }
      for (const cells of basins(level)) {
        if (cells.length < 30) continue;
        large++;
        const set = new Set(cells);
        const here = list.filter((o) => set.has((o.z + FACING[o.rot][1]) * level.w + o.x + FACING[o.rot][0]));
        expect(here.length).toBeLessThanOrEqual(2);
        if (here.length) withBoard++;
      }
    }
    expect(boards).toBeGreaterThan(0);
    expect(withBoard).toBeLessThan(large); // ikke alle bassenger
  });
});
