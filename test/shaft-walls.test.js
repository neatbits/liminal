import { describe, expect, it } from 'vitest';
import { createLevel, TILE } from '../src/core/level.js';
import { fillRect } from '../src/gen/util.js';
import { placeStairs } from '../src/core/stairs.js';
import { ceilingAt, floorAt } from '../src/core/heights.js';
import { insertStorey, copyStorey } from '../src/core/storeys.js';
import { THROUGH, walkLevels } from '../src/core/stairwells.js';
import { SIDES } from '../src/world/caps.js';
import { MeshData } from '../src/world/mesher.js';
import { THICK, shaftWall, buildEntrance } from '../src/world/shaft-walls.js';
import { stairWallSpans } from '../src/world/stairs.js';
import { openSpans } from '../src/world/decks.js';

const W = 12;
const at = (x, z) => z * W + x;
const side = (dx, dz) => SIDES.find((s) => s.dx === dx && s.dz === dz);

/** To etasjer (12 × 10) med en trapp opp fra x 3–6 (z 4) og reposet i (7, 4). */
function building(theme = 'pool') {
  const room = createLevel({ theme, w: W, h: 10, height: 3 });
  fillRect(room, 1, 1, 10, 8, TILE.FLOOR);
  insertStorey(room, 1, copyStorey(room, 0));
  placeStairs(room, [3, 4], [6, 4], 1);
  for (let x = 3; x <= 6; x++) room.meta[at(x, 4)] |= THROUGH;
  return room;
}

describe('veggene rundt en sjakt i etasjen over', () => {
  it('flytter veggen THICK ut fra sjakten, med endeflate mot reposet og forlenget rundt hjørnet', () => {
    const { levels: [, upper] } = walkLevels(building());
    expect(upper.seams.shaft.has(at(4, 4))).toBe(true);
    const mid = shaftWall(upper, 4, 3, side(0, 1));
    expect(mid.L[1]).toBeCloseTo(4 - THICK);
    expect(mid.caps).toEqual([]);
    const top = shaftWall(upper, 6, 3, side(0, 1)); // ved reposet (7, 4)
    expect(top.caps).toHaveLength(1);
    expect(top.caps[0].n).toEqual([1, 0, 0]);
    const foot = shaftWall(upper, 3, 3, side(0, 1)); // utvendig hjørne ved foten av trappen
    expect(foot.extR).toBe(THICK);
    expect(foot.R[0]).toBeCloseTo(3 - THICK);
    expect(shaftWall(upper, 8, 3, side(0, 1))).toBeNull(); // vanlig vegg
  });

  it('gir inngangen fra reposet en bue i en like tykk vegg opp til taket', () => {
    const { levels: [, upper] } = walkLevels(building());
    const mesh = new MeshData(null);
    buildEntrance(mesh, upper, 7, 4);
    expect(mesh.vertexCount).toBeGreaterThan(0);
    const ceil = ceilingAt(upper, 7, 4);
    for (let k = 0; k < mesh.pos.length; k += 3) {
      const [x, y, z] = mesh.pos.slice(k, k + 3);
      expect(x).toBeGreaterThanOrEqual(7 - THICK - 1e-6); // innenfor sjakten, forsiden i grensen
      expect(x).toBeLessThanOrEqual(7 + 1e-6);
      expect(y).toBeGreaterThanOrEqual(1.9);
      expect(y).toBeLessThanOrEqual(ceil + 1e-6);
      expect(z).toBeGreaterThanOrEqual(4 - 1e-6);
      expect(z).toBeLessThanOrEqual(5 + 1e-6);
    }
    const none = new MeshData(null);
    buildEntrance(none, upper, 8, 4);
    expect(none.vertexCount).toBe(0);
  });
});

describe('veggen langs en trapp', () => {
  it('regner v fra foten av trappen, med gulvlisten på hvert trinn', () => {
    const level = building();
    const fy = floorAt(level, 5, 4);
    const spans = stairWallSpans(level, 5, 4, openSpans(level, 5, 4), { split: false, skirt: 0.1 });
    expect(spans).toEqual([{ lo: fy, hi: fy + 0.1, base: fy }, { lo: fy + 0.1, hi: expect.any(Number), base: 0 }]);
    expect(stairWallSpans(level, 5, 4, openSpans(level, 5, 4), { split: false, skirt: 0 }).map((s) => s.base)).toEqual([0]);
    const plain = openSpans(level, 5, 4);
    expect(stairWallSpans(level, 5, 4, plain, { split: true, skirt: 0.1 })).toBe(plain); // brystningen følger trinnene
    expect(stairWallSpans(level, 8, 4, plain, { split: false, skirt: 0.1 })).toBe(plain); // ikke trapp
  });
});
