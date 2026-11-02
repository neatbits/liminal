import { describe, expect, it } from 'vitest';
import { createLevel, TILE, LIGHT } from '../src/core/level.js';
import { fillRect } from '../src/gen/util.js';
import { ceilingAt } from '../src/core/heights.js';
import { insertStorey, emptyStorey, storeyLevel, storeyElevations } from '../src/core/storeys.js';
import { walkLevels } from '../src/core/stairwells.js';
import { LADDER, HOLE_R, isLadder, ladders, ladderProblem, toggleLadder } from '../src/core/ladders.js';
import { levelFromJSON, levelToJSON } from '../src/core/serialize.js';

const W = 12;
const at = (x, z) => z * W + x;

/** To etasjer (12 × 10): et rom x 1–10, z 1–8 i begge; vegg i etasje 1 langs z = 0. */
function building() {
  const room = createLevel({ theme: 'office', w: W, h: 10, height: 3 });
  fillRect(room, 1, 1, 10, 8, TILE.FLOOR);
  const upper = emptyStorey(room);
  fillRect(upper, 1, 1, 10, 8, TILE.FLOOR);
  insertStorey(room, 1, upper);
  return room;
}

describe('stiger mellom etasjer', () => {
  it('settes på en gulvrute under etasjen over, helst mot en vegg, snus ved nytt klikk og fjernes', () => {
    const room = building();
    expect(toggleLadder(room, 0, 4, 1)).toEqual({ changed: true, problem: null });
    expect(isLadder(room, at(4, 1))).toBe(true);
    // Stigen står med ryggen mot veggen i z = 0, og man går av og på mot rommet (z + 1).
    expect(ladders(room)).toEqual([{ i: at(4, 1), x: 4, z: 1, dir: [0, 1] }]);
    expect(ladderProblem(room, 0, 4, 1, 0)).toMatch(/step off/); // mot veggen: der oppe er det vegg også
  });

  it('er fortsatt en stige med fliser på bare den ene siden (et bad eller «Make it wrong»), utenfor kjøpesenteret', () => {
    const room = building();
    toggleLadder(room, 0, 4, 3);
    room.finish[at(4, 2)] = 1; // fliser på den ene siden, teppe på den andre: slik ser en butikkfront ut
    expect(isLadder(room, at(4, 3))).toBe(true);
    expect(walkLevels(room).levels[0].ladders).toHaveLength(1);
  });

  it('peker der man kan gå av øverst, og gir en forklaring når det ikke går', () => {
    const room = building();
    storeyLevel(room, 1).tiles[at(4, 0)] = TILE.FLOOR; // gulv over veggen: der kan man gå av
    expect(toggleLadder(room, 0, 4, 1).changed).toBe(true);
    expect(ladders(room)[0].dir).toEqual([0, 1]); // ryggen mot veggen
    const seen = new Set();
    for (let k = 0; k < 4; k++) { // snus til alle retningene som får plass, og rundt igjen
      seen.add(String(ladders(room)[0].dir));
      expect(toggleLadder(room, 0, 4, 1).changed).toBe(true);
    }
    expect(seen.size).toBe(4); // også mot z − 1 nå (gulv over veggen der oppe)
    expect(toggleLadder(room, 0, 4, 1, true)).toEqual({ changed: true, problem: null });
    expect(room.meta[at(4, 1)] & LADDER).toBe(0);
    expect(toggleLadder(room, 1, 4, 4).problem).toMatch(/add one with \+ Floor/); // øverste etasje
    expect(toggleLadder(room, 0, 0, 4).problem).toMatch(/floor cell/); // vegg
    storeyLevel(room, 1).tiles.fill(TILE.WALL);
    expect(toggleLadder(room, 0, 4, 4).problem).toMatch(/floor above/);
  });

  it('lager det runde hullet der oppe og åpningen gjennom etasjeskillet når etasjene bygges', () => {
    const room = building();
    toggleLadder(room, 0, 5, 4);
    const { dir } = ladders(room)[0];
    const exit = at(5 + dir[0], 4 + dir[1]);
    storeyLevel(room, 1).objects = [{ id: 'pottedplant', x: 5 + dir[0], z: 4 + dir[1], rot: 0 }];
    const gap = storeyElevations(room)[1];
    const { levels: [lower, upper] } = walkLevels(room);
    expect(upper.tiles[at(5, 4)]).toBe(TILE.WALL); // hullet: ikke til å gå på
    expect(upper.seams.hole.get(at(5, 4))).toEqual({ y: 0, r: HOLE_R }); // gulvet rundt hullet
    expect(upper.tiles[exit]).toBe(TILE.FLOOR);
    expect(upper.objects).toEqual([]); // ingenting står der man går av
    expect(ceilingAt(lower, 5, 4)).toBeCloseTo(gap + 3);
    expect(lower.lights[at(5, 4)]).toBe(LIGHT.NONE);
    expect(lower.seams.clip.get(at(5, 4))).toEqual({ y: 3, keep: [0, 0] }); // over himlingen: den runde sjakten
    expect(lower.seams.hatch.get(at(5, 4))).toEqual({ y0: 3, y1: gap, r: HOLE_R });
    expect(lower.ladders).toEqual([{ i: at(5, 4), x: 5, z: 4, dir, gap, k: 0 }]);
    expect(upper.holes).toEqual(lower.ladders);
    expect(room.storeys[0].tiles[at(5, 4)]).toBe(TILE.FLOOR); // rommet selv er urørt
  });

  it('veggene ved siden av stigen vokser ikke opp i etasjen over', async () => {
    const { capHeight } = await import('../src/world/caps.js');
    const { SLAB } = await import('../src/core/heights.js');
    const room = building();
    room.tiles[at(6, 4)] = room.tiles[at(4, 4)] = TILE.WALL; // vegg rett ved siden av, gulv over den
    toggleLadder(room, 0, 5, 4);
    const gap = storeyElevations(room)[1];
    const { levels: [lower, upper] } = walkLevels(room);
    expect(ceilingAt(lower, 5, 4)).toBeGreaterThan(gap); // åpningen går opp i etasjen over …
    for (const x of [4, 6]) expect(capHeight(lower, x, 4)).toBeLessThanOrEqual(gap - SLAB + 1e-9); // … men ikke veggene
    expect(upper.capMax).toBeUndefined(); // øverste etasje: som før
  });

  it('lagres med rommet', () => {
    const room = building();
    toggleLadder(room, 0, 5, 4);
    const back = levelFromJSON(JSON.parse(JSON.stringify(levelToJSON(room))));
    expect(ladders(back)).toEqual(ladders(room));
  });
});

describe('runde hull i 3D', () => {
  it('gulvet rundt hullet dekker ruten utenfor sirkelen, og sjakten står på sirkelen', async () => {
    const { MeshData } = await import('../src/world/mesher.js');
    const { holeRing, holeShaft } = await import('../src/world/holes.js');
    const ring = new MeshData(null);
    holeRing(ring, 5, 4, 0, HOLE_R, true);
    let area = 0;
    for (let k = 0; k < ring.index.length; k += 3) {
      const [a, b, c] = [0, 1, 2].map((j) => ring.index[k + j] * 3).map((o) => [ring.pos[o], ring.pos[o + 2]]);
      area += Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
    }
    expect(area).toBeCloseTo(1 - Math.PI * HOLE_R * HOLE_R, 1); // ruten minus hullet (16-kant)
    for (let k = 0; k < ring.pos.length; k += 3) {
      expect(ring.pos[k]).toBeGreaterThanOrEqual(5 - 1e-9);
      expect(ring.pos[k]).toBeLessThanOrEqual(6 + 1e-9);
    }
    const shaft = new MeshData(null);
    holeShaft(shaft, 5, 4, HOLE_R, 3, 3.3);
    for (let k = 0; k < shaft.pos.length; k += 3) expect(Math.hypot(shaft.pos[k] - 5.5, shaft.pos[k + 2] - 4.5)).toBeCloseTo(HOLE_R, 6);
  });
});
