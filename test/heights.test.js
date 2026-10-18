import { describe, expect, it } from 'vitest';
import { createLevel, setTile, TILE } from '../src/core/level.js';
import { fillTiles, rectIndices } from '../src/core/ops.js';
import { ceilingAt, floorAt, topFloorAt, groundAt, edgeHeight, stairSpan, STAIR_RISE } from '../src/core/heights.js';
import { placeStairs, removeStairs, stairCells } from '../src/core/stairs.js';
import { fillZone, zoneLabels } from '../src/core/zones.js';
import { DOOR, doorInfo, setDoor } from '../src/core/doors.js';
import { levelFromJSON, levelToJSON } from '../src/core/serialize.js';
import { levelStats } from '../src/core/stats.js';

// Hall 14 × 8 (x 1–12, z 1–6) med 2,4 m tak.
function hall() {
  const level = createLevel({ w: 14, h: 8, height: 2.4 });
  fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 12, z1: 6 }), TILE.FLOOR);
  return level;
}

describe('gulvhøyder', () => {
  it('hevet gulv gir takhøyde over seg, og dører står på sitt gulv', () => {
    const level = hall();
    fillZone(level, 'floor', rectIndices(level, { x0: 8, z0: 1, x1: 12, z1: 6 }), 1.2);
    expect(floorAt(level, 9, 3)).toBe(1.2);
    expect(ceilingAt(level, 9, 3)).toBeCloseTo(1.2 + 2.1, 6); // 2,4 m tak er for lavt
    expect(ceilingAt(level, 3, 3)).toBe(2.4);
    fillZone(level, 'floor', rectIndices(level, { x0: 1, z0: 1, x1: 12, z1: 6 }), 0);
    expect(floorAt(level, 9, 3)).toBe(0);
  });

  it('gulvsoner gjelder ikke vann', () => {
    const level = hall();
    setTile(level, 4, 4, TILE.WATER);
    expect(fillZone(level, 'floor', [4 * 14 + 4], 1)).toBe(0);
    expect(floorAt(level, 4, 4)).toBe(-0.7);
    expect(topFloorAt(level, 4, 4)).toBe(0);
  });

  it('nøkkeltallene viser gulvspennet', () => {
    const level = hall();
    fillZone(level, 'floor', rectIndices(level, { x0: 8, z0: 1, x1: 12, z1: 6 }), 1.5);
    expect(levelStats(level).floor).toEqual([0, 1.5]);
  });
});

describe('trapper', () => {
  it('trappeløpet følger den dominerende retningen og bredden', () => {
    const { dir, rows } = stairCells([2, 3], [6, 4], 2);
    expect(dir).toEqual([1, 0]);
    expect(rows).toHaveLength(5);
    expect(rows[0]).toEqual([
      [2, 3],
      [2, 4],
    ]);
  });

  it('en trapp mot vegg stiger STAIR_RISE per rute (trapp til ingensteds)', () => {
    const level = hall();
    expect(placeStairs(level, [8, 3], [12, 3])).toBe(5);
    const s = stairSpan(level, 12, 3);
    expect(s.top).toBeCloseTo(5 * STAIR_RISE, 6);
    expect(s.dir).toEqual([1, 0]);
    expect(stairSpan(level, 8, 3).bottom).toBe(0);
    expect(floorAt(level, 10, 3)).toBeCloseTo(2 * STAIR_RISE, 6);
    expect(ceilingAt(level, 12, 3)).toBeCloseTo(3 + 2.1, 6);
  });

  it('en trapp stiger til et høyere repos, også når den dras ovenfra og ned', () => {
    const level = hall();
    fillZone(level, 'floor', rectIndices(level, { x0: 10, z0: 1, x1: 12, z1: 6 }), 1.2);
    placeStairs(level, [9, 3], [6, 3]); // fra reposet og ned
    expect(stairSpan(level, 9, 3)).toMatchObject({ top: 1.2, dir: [1, 0] });
    expect(stairSpan(level, 6, 3).bottom).toBe(0);
    expect(edgeHeight(level, 9, 3, 1, 0)).toBe(1.2);
    expect(edgeHeight(level, 9, 3, -1, 0)).toBeCloseTo(0.9, 6);
  });

  it('bakken stiger jevnt gjennom trappen', () => {
    const level = hall();
    placeStairs(level, [8, 3], [9, 3]);
    expect(groundAt(level, 8.0, 3.5)).toBeCloseTo(0, 6);
    expect(groundAt(level, 8.5, 3.5)).toBeCloseTo(0.3, 6);
    expect(groundAt(level, 9.99, 3.5)).toBeCloseTo(1.2, 1);
  });

  it('en døråpning på toppen får trappens høyde og blir en vanlig dør', () => {
    const level = hall();
    // Vegg z = 0 er yttervegg; lag en tykk vegg i z = 6 med åpning i (3, 6).
    fillTiles(level, rectIndices(level, { x0: 1, z0: 6, x1: 12, z1: 6 }), TILE.WALL);
    setDoor(level, 3, 6, DOOR.CLOSED);
    placeStairs(level, [3, 2], [3, 5]);
    expect(floorAt(level, 3, 6)).toBeCloseTo(4 * STAIR_RISE, 6);
    expect(doorInfo(level, 3, 6)).toMatchObject({ oneSided: true, closet: false, side: -1 });
    expect(ceilingAt(level, 3, 6)).toBeCloseTo(4 * STAIR_RISE + 2.1, 6);
    expect(zoneLabels(level).filter((l) => l.layer === 'floor')).toHaveLength(0);
  });

  it('viskelæret gjør trappen om til gulv igjen', () => {
    const level = hall();
    placeStairs(level, [8, 3], [10, 3]);
    expect(removeStairs(level, [8, 3], [12, 3])).toBe(3);
    expect(level.tiles[3 * 14 + 9]).toBe(TILE.FLOOR);
    expect(floorAt(level, 9, 3)).toBe(0);
  });

  it('trapper og gulvhøyder lagres og leses igjen', () => {
    const level = hall();
    fillZone(level, 'floor', rectIndices(level, { x0: 11, z0: 1, x1: 12, z1: 6 }), 1.8);
    placeStairs(level, [8, 3], [10, 3]);
    const back = levelFromJSON(JSON.parse(JSON.stringify(levelToJSON(level))));
    expect(Array.from(back.tiles)).toEqual(Array.from(level.tiles));
    expect(Array.from(back.floors)).toEqual(Array.from(level.floors));
    expect(stairSpan(back, 10, 3)).toEqual(stairSpan(level, 10, 3));
  });
});
