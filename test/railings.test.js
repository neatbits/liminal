import { describe, expect, it } from 'vitest';
import { createLevel, TILE } from '../src/core/level.js';
import { fillTiles, rectIndices } from '../src/core/ops.js';
import { fillZone, zoneLabels, FINISH } from '../src/core/zones.js';
import { placeStairs } from '../src/core/stairs.js';
import { railSides, guardBoxes, GUARD_DROP } from '../src/core/railings.js';
import { levelFromJSON, levelToJSON } from '../src/core/serialize.js';
import { buildRailings } from '../src/world/railings.js';
import { buildSurfaces } from '../src/world/surfaces.js';
import { moveCircle } from '../src/world/collision.js';
import { generateLevel } from '../src/gen/index.js';

// Hall 16 × 8 med en plattform i 1,2 m (x 10–14) og en trapp opp til den langs nordveggen.
function stairsUp() {
  const level = createLevel({ w: 16, h: 8, height: 2.6 });
  fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 14, z1: 6 }), TILE.FLOOR);
  fillZone(level, 'floor', rectIndices(level, { x0: 10, z0: 1, x1: 14, z1: 6 }), 1.2);
  placeStairs(level, [8, 1], [9, 1]);
  return level;
}

const sides = (level, x, z) => railSides(level, x, z).map((r) => `${r.dx},${r.dz}:${r.kind}`);

describe('rekkverk', () => {
  it('trappen får håndlist på veggsiden og vern på den åpne siden', () => {
    const level = stairsUp();
    expect(sides(level, 8, 1).sort()).toEqual(['0,-1:wall', '0,1:guard']);
  });

  it('plattformkanten får vern, men ikke der trappen kommer opp', () => {
    const level = stairsUp();
    expect(sides(level, 10, 3)).toEqual(['-1,0:guard']);
    expect(sides(level, 10, 1)).toEqual([]); // trappen kommer opp her
    expect(sides(level, 12, 3)).toEqual([]);
  });

  it('lave kanter og vanlig gulv får ikke rekkverk', () => {
    const level = stairsUp();
    fillZone(level, 'floor', rectIndices(level, { x0: 10, z0: 1, x1: 14, z1: 6 }), GUARD_DROP - 0.05);
    expect(sides(level, 10, 3)).toEqual([]);
    expect(sides(level, 4, 3)).toEqual([]);
  });

  it('vernet stopper spilleren ved kanten og på siden av trappen', () => {
    const level = stairsUp();
    expect(guardBoxes(level, 10, 3)).toEqual([[10, 3, 10.08, 4]]);
    const [x] = moveCircle(level, 12.5, 3.5, -6, 0, 0.28, true);
    expect(x).toBeCloseTo(10.36, 6);
    const [, z] = moveCircle(level, 8.5, 1.5, 0, 3, 0.28, true);
    expect(z).toBeLessThan(2);
  });

  it('lager håndlist, spiler og stolper', () => {
    const { rail, bars } = buildRailings(stairsUp(), null);
    expect(rail.quadCount).toBeGreaterThan(0);
    expect(bars.quadCount % 6).toBe(0);
    expect(bars.quadCount).toBeGreaterThan(6 * 4);
  });
});

describe('fliser', () => {
  it('males på gulv og trapper, ikke på vann og vegg, og får ingen etikett', () => {
    const level = stairsUp();
    level.tiles[6 * 16 + 3] = TILE.WATER;
    const n = fillZone(level, 'finish', rectIndices(level, { x0: 0, z0: 5, x1: 4, z1: 7 }), 1);
    expect(n).toBe(7); // 2 rader × 4 gulvruter, minus vannruten
    expect(level.finish[5 * 16 + 2]).toBe(FINISH.TILES);
    expect(zoneLabels(level)).toEqual(expect.not.arrayContaining([expect.objectContaining({ layer: 'finish' })]));
  });

  it('flislagte ruter får egne gulv- og veggflater', () => {
    const level = stairsUp();
    fillZone(level, 'finish', rectIndices(level, { x0: 1, z0: 5, x1: 3, z1: 6 }), 1);
    const s = buildSurfaces(level, null, { subdivide: 1 });
    expect(s.tileFloor.quadCount).toBe(6);
    expect(s.tileWall.quadCount).toBeGreaterThan(0);
  });

  it('lagres og leses igjen, og kjelleren får et bad', () => {
    const level = stairsUp();
    fillZone(level, 'finish', rectIndices(level, { x0: 1, z0: 5, x1: 3, z1: 6 }), 1);
    const back = levelFromJSON(JSON.parse(JSON.stringify(levelToJSON(level))));
    expect(Array.from(back.finish)).toEqual(Array.from(level.finish));
    const basement = generateLevel({ theme: 'basement', w: 40, h: 30, seed: 3 });
    expect(basement.finish.some((v) => v === FINISH.TILES)).toBe(true);
  });
});
