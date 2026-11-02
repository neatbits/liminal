import { describe, expect, it } from 'vitest';
import { createLevel, resizeLevel, TILE, LIGHT } from '../src/core/level.js';
import { fillRect } from '../src/gen/util.js';
import { insertStorey, emptyStorey, storeyLevel, copyStorey } from '../src/core/storeys.js';
import { walkLevels } from '../src/core/stairwells.js';
import { levelToJSON, levelFromJSON } from '../src/core/serialize.js';
import { History } from '../src/core/history.js';
import { ceilingAt, floorAt } from '../src/core/heights.js';
import { footprint, elevatorStops, elevatorProblem, toggleElevator, elevatorAt } from '../src/core/elevators.js';

/** Et bygg med `n` etasjer, gulv nesten overalt i hver. */
function building(n = 2, w = 16, h = 12) {
  const room = createLevel({ theme: 'office', w, h });
  fillRect(room, 1, 1, w - 2, h - 2, TILE.FLOOR);
  for (let k = 1; k < n; k++) {
    const s = emptyStorey(room);
    fillRect(s, 1, 1, w - 2, h - 2, TILE.FLOOR);
    insertStorey(room, k, s);
  }
  return room;
}

const at = (level, [x, z]) => level.tiles[z * level.w + x];

describe('heiser', () => {
  it('en sjakt på 4 × 4: vogn på 2 × 2, dobbel dør mot reposet og vegg rundt', () => {
    const f = footprint({ x: 4, z: 3, dir: 2 }); // døren mot sør
    expect(f.all).toHaveLength(16);
    expect(f.car).toHaveLength(4);
    expect(f.door).toHaveLength(2);
    expect(f.ring).toHaveLength(10);
    for (const [, z] of f.door) expect(z).toBe(6);
    for (const [, z] of f.landing) expect(z).toBe(7);
  });

  it('verktøyet legger heisen rundt ruten man klikker, og stopper i etasjene med gulv foran dørene', () => {
    const room = building(3);
    expect(toggleElevator(room, 6, 5)).toEqual({ changed: true, problem: null });
    const [e] = room.elevators;
    expect(elevatorAt(room, 6, 5)).toBe(e);
    expect(elevatorStops(room, e)).toEqual([0, 1, 2]);
    // Klikk igjen: snus. Høyreklikk: borte.
    expect(toggleElevator(room, 6, 5).changed).toBe(true);
    expect(room.elevators[0].dir).not.toBe(e.dir);
    toggleElevator(room, 6, 5, true);
    expect(room.elevators).toEqual([]);
  });

  it('sier fra når den ikke får plass', () => {
    expect(elevatorProblem(building(1), { x: 4, z: 4, dir: 0 })).toMatch(/Floor/);
    const room = building(2);
    expect(elevatorProblem(room, { x: 13, z: 4, dir: 0 })).toMatch(/4 × 4/);
    fillRect(storeyLevel(room, 1), 1, 1, 14, 10, TILE.WALL);
    expect(elevatorProblem(room, { x: 4, z: 4, dir: 0 })).toMatch(/two floors/);
    expect(toggleElevator(room, 5, 5).problem).toMatch(/two floors/);
    const ok = building(2);
    toggleElevator(ok, 4, 4);
    expect(elevatorProblem(ok, { ...ok.elevators[0], x: ok.elevators[0].x + 2 })).toMatch(/in the way/);
  });

  it('i etasjene slik de bygges: vognen er gulv med lavt tak og ustabilt lys, døren er en åpning, rundt er vegg', () => {
    const room = building(2);
    toggleElevator(room, 6, 5);
    const e = room.elevators[0];
    const f = footprint(e);
    const { levels } = walkLevels(room);
    for (const [k, level] of levels.entries()) {
      expect(level.lifts).toHaveLength(1);
      expect(level.lifts[0]).toMatchObject({ id: 0, k, stops: [0, 1], floor: 0 });
      for (const c of f.car) expect(at(level, c)).toBe(TILE.FLOOR);
      for (const c of f.door) expect(at(level, c)).toBe(TILE.FLOOR);
      for (const c of f.ring) expect(at(level, c)).toBe(TILE.WALL);
      expect(ceilingAt(level, ...f.car[0])).toBeCloseTo(2.4);
      expect(ceilingAt(level, ...f.door[0])).toBeCloseTo(2.1);
      expect(f.car.filter(([x, z]) => level.lights[z * level.w + x] === LIGHT.FLICKER)).toHaveLength(1);
    }
    expect(at(storeyLevel(room, 0), f.ring[0])).toBe(TILE.FLOOR); // selve rommet er urørt
  });

  it('vognen står i høyde med et hevet repos, og sjakten er massiv i en etasje den ikke stopper i', () => {
    const room = building(3);
    toggleElevator(room, 6, 5);
    const f = footprint(room.elevators[0]);
    const mid = storeyLevel(room, 1);
    for (const [x, z] of f.landing) mid.tiles[z * mid.w + x] = TILE.WALL;
    const top = storeyLevel(room, 2);
    for (const [x, z] of f.landing) top.floors[z * top.w + x] = 4;
    const { levels } = walkLevels(room);
    expect(levels[1].lifts).toEqual([]);
    for (const c of f.all) expect(at(levels[1], c)).toBe(TILE.WALL);
    expect(levels[2].lifts[0]).toMatchObject({ floor: 0.4, stops: [0, 2] });
    expect(floorAt(levels[2], ...f.car[0])).toBeCloseTo(0.4);
  });

  it('lagres i rommet og følger med i JSON, størrelsesendring og angre – ikke i kopierte etasjer', () => {
    const room = building(2);
    const history = new History();
    history.push(room, 'all');
    toggleElevator(room, 6, 5);
    const back = levelFromJSON(JSON.parse(JSON.stringify(levelToJSON(room))));
    expect(back.elevators).toEqual(room.elevators);
    expect(back.storeys[0].elevators).toBeUndefined();
    const bigger = resizeLevel(room, 20, 16);
    expect(bigger.elevators[0]).toEqual({ ...room.elevators[0], x: room.elevators[0].x + 2, z: room.elevators[0].z + 2 });
    const corner = building(2);
    toggleElevator(corner, 2, 2);
    expect(resizeLevel(corner, 10, 8).elevators).toEqual([]); // ville stukket ut av kartet
    expect(copyStorey(room, 0).elevators).toBeUndefined();
    history.undo(room);
    expect(room.elevators).toBeUndefined();
    history.redo(room);
    expect(room.elevators).toHaveLength(1);
  });

  it('i 3D: paneler inne, karm og knapper; dørbladene glir inn i veggen; én lampe per etasje over døren og inne', async () => {
    const { MeshData } = await import('../src/world/mesher.js');
    const { buildLifts, liftLeaves, liftLamps } = await import('../src/world/lifts.js');
    const room = building(3);
    toggleElevator(room, 6, 5);
    const level = walkLevels(room).levels[1];
    const mesh = new MeshData();
    buildLifts(level, mesh);
    expect(mesh.quadCount).toBeGreaterThan(30);
    const [lift] = level.lifts;
    const f = footprint(room.elevators[0]);
    const leaves = liftLeaves(lift, () => new MeshData());
    expect(leaves).toHaveLength(2);
    for (const { mesh: m, slide } of leaves) {
      expect(Math.hypot(...slide)).toBeCloseTo(0.96);
      for (let i = 0; i < m.pos.length; i += 3) { // lukket: i døråpningen
        expect(f.door.some(([x, z]) => m.pos[i] >= x - 1e-6 && m.pos[i] <= x + 1 + 1e-6 && m.pos[i + 2] >= z - 1e-6 && m.pos[i + 2] <= z + 1 + 1e-6)).toBe(true);
      }
    }
    const lamps = liftLamps(lift);
    expect(lamps.sign).toHaveLength(3);
    expect(lamps.panel).toHaveLength(3);
    const inCar = ([x, , z]) => f.car.some(([cx, cz]) => x >= cx && x <= cx + 1 && z >= cz && z <= cz + 1);
    expect(lamps.panel.every(inCar)).toBe(true);
    expect(inCar(lamps.call)).toBe(false);
  });

  it('nøytral innvendig: lyset uten temaets farge, kledd helt inne, og temaets armatur tegnes ikke i vognen', async () => {
    const { neutralField, luma } = await import('../src/world/lifts.js');
    const { collectLights } = await import('../src/world/lighting.js');
    const warm = { sample: () => [0.9, 0.7, 0.3, 0.1, 0, 0, 0] };
    const [r, g, b, f0] = neutralField(warm).sample(0, 0, 0, 0, 1, 0);
    expect(r).toBe(g);
    expect(g).toBe(b);
    expect(r).toBeCloseTo(luma(0.9, 0.7, 0.3));
    expect(f0).toBe(0.1);
    const room = building(2);
    toggleElevator(room, 6, 5);
    const level = walkLevels(room).levels[0];
    const [lamp] = level.lifts.map((l) => l.lamp);
    const bare = collectLights(level).filter((l) => l.bare);
    expect(bare.map((l) => [l.cx, l.cz])).toEqual([lamp]);
  });

  it('ugyldige heiser i en fil hoppes over', () => {
    const json = levelToJSON(building(2));
    json.elevators = [[4, 4, 0], [5, 5, 1], [-1, 2, 0], [40, 2, 0], [8, 2, 7], 'x'];
    expect(levelFromJSON(json).elevators).toEqual([{ x: 4, z: 4, dir: 0 }]);
  });
});
