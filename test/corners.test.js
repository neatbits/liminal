import { describe, expect, it } from 'vitest';
import { createLevel, setTile, TILE } from '../src/core/level.js';
import { fillTiles, rectIndices } from '../src/core/ops.js';
import { CORNER, cornerShape, pickCorner, setCorner, openPoint } from '../src/core/corners.js';
import { levelToJSON, levelFromJSON } from '../src/core/serialize.js';
import { resolveCircle } from '../src/world/collision.js';
import { buildSurfaces } from '../src/world/surfaces.js';
import { generateLevel, presetById } from '../src/gen/index.js';

// Rom med gulv i x 1–8, z 1–6, og en frittstående veggrute i (4, 3).
function room() {
  const level = createLevel({ w: 10, h: 8 });
  fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 8, z1: 6 }), TILE.FLOOR);
  setTile(level, 4, 3, TILE.WALL);
  return level;
}

describe('skrå og avrundede hjørner', () => {
  it('innvendig hjørne: gulvruten får en veggkile mot hjørnet', () => {
    const level = room();
    expect(pickCorner(level, 1, 1, 0, 0)).toBe(0); // nordvest: vegg i nord og vest
    expect(setCorner(level, 1, 1, CORNER.ANGLED, 0.1, 0.1)).toBe(1);
    const s = cornerShape(level, 1, 1);
    expect(s.own).toBe(TILE.FLOOR);
    expect(s.boundary).toEqual([[2, 1], [1, 2]]);
    expect(s.solid).toEqual([[1, 1], [2, 1], [1, 2]]);
  });

  it('utvendig hjørne: veggruten åpnes, avrundet rundt det motsatte hjørnet', () => {
    const level = room();
    expect(setCorner(level, 4, 3, CORNER.ROUND, 0.9, 0.9)).toBe(1); // sørøst
    const s = cornerShape(level, 4, 3);
    expect(s.own).toBe(TILE.WALL);
    expect(s.k).toBe(2);
    for (const [x, z] of s.boundary) expect(Math.hypot(x - 4, z - 3)).toBeCloseTo(1, 6);
  });

  it('bare der det er et hjørne; formen forsvinner når rommet endres', () => {
    const level = room();
    expect(pickCorner(level, 6, 5)).toBe(-1);
    expect(setCorner(level, 6, 5, CORNER.ANGLED)).toBe(0);
    setCorner(level, 1, 1, CORNER.ANGLED, 0, 0);
    setTile(level, 1, 0, TILE.FLOOR); // veggen i nord er borte
    expect(cornerShape(level, 1, 1)).toBeNull();
    setTile(level, 1, 0, TILE.WALL);
    expect(cornerShape(level, 1, 1)).not.toBeNull();
    setTile(level, 1, 1, TILE.WATER); // ny rutetype nullstiller
    expect(level.corners[1 * 10 + 1]).toBe(0);
  });

  it('man går ikke inn i kilen, men kan gå inn i det åpnede hjørnet', () => {
    const level = room();
    setCorner(level, 1, 1, CORNER.ANGLED, 0, 0);
    const [x, z] = resolveCircle(level, 1.3, 1.3, 0.28);
    expect((x + z - 3) / Math.SQRT2).toBeGreaterThanOrEqual(0.28 - 1e-6);
    setCorner(level, 4, 3, CORNER.ROUND, 0.9, 0.9);
    const [ax, az] = resolveCircle(level, 4.9, 3.9, 0.28);
    expect(Math.floor(ax)).toBe(4); // fortsatt inne i veggruten
    expect(Math.hypot(ax - 4, az - 3)).toBeGreaterThanOrEqual(1.28 - 1e-6);
    expect(openPoint(level, 4.9, 3.9)).not.toEqual([4.9, 3.9]); // lyset regnes fra gulvet ved siden av
  });

  it('veggene følger formen', () => {
    const plain = buildSurfaces(room(), null).wall.vertexCount;
    const level = room();
    setCorner(level, 1, 1, CORNER.ROUND, 0, 0);
    setCorner(level, 4, 3, CORNER.ANGLED, 0, 0);
    const shaped = buildSurfaces(level, null);
    expect(shaped.wall.vertexCount).toBeGreaterThan(plain);
  });

  it('lagres med rommet', () => {
    const level = room();
    setCorner(level, 1, 1, CORNER.ROUND, 0, 0);
    setCorner(level, 4, 3, CORNER.ANGLED, 0.9, 0.1);
    const back = levelFromJSON(levelToJSON(level));
    expect(Array.from(back.corners)).toEqual(Array.from(level.corners));
    expect(cornerShape(back, 4, 3).k).toBe(1);
  });

  it('genererte rom får noen hjørner (gyldige og uten gjenstander i kilene), eksemplene ingen', () => {
    let shaped = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const level = generateLevel({ theme: seed % 2 ? 'pool' : 'backrooms', seed });
      for (let i = 0; i < level.corners.length; i++) {
        if (!level.corners[i]) continue;
        const [x, z] = [i % level.w, Math.floor(i / level.w)];
        expect(cornerShape(level, x, z)).not.toBeNull();
        shaped++;
      }
    }
    expect(shaped).toBeGreaterThan(10);
    expect(presetById('pools').make().corners.every((v) => v === 0)).toBe(true);
  });

  it.each([['innvendig skrått', 1, 1, CORNER.ANGLED], ['innvendig avrundet', 1, 1, CORNER.ROUND], ['utvendig skrått', 4, 3, CORNER.ANGLED], ['utvendig avrundet', 4, 3, CORNER.ROUND]])(
    '%s hjørne: gulvet har samme skygge som nabogulvet der de møtes (ingen skjøt)',
    (_, x, z, kind) => {
      const level = room();
      expect(setCorner(level, x, z, kind, x === 1 ? 0.1 : 0.9, x === 1 ? 0.1 : 0.9)).toBe(1);
      for (const S of [1, 2, 4]) {
        const { floor } = buildSurfaces(level, null, { subdivide: S });
        const seen = new Map();
        for (let v = 0; v < floor.vertexCount; v++) {
          const key = [floor.pos[v * 3], floor.pos[v * 3 + 2]].map((c) => c.toFixed(4)).join();
          const light = floor.light[v * 3];
          if (seen.has(key)) expect(light, `S=${S} at ${key}`).toBeCloseTo(seen.get(key), 6);
          else seen.set(key, light);
        }
        // Ved den formede veggen (mellom endene) mørkner gulvet like mye som ved en vanlig vegg.
        const { boundary } = cornerShape(level, x, z);
        const onWall = (px, pz) => boundary.slice(0, -1).some(([ax, az], i) => {
          const [bx, bz] = boundary[i + 1];
          const cross = (bx - ax) * (pz - az) - (bz - az) * (px - ax);
          const along = ((px - ax) * (bx - ax) + (pz - az) * (bz - az)) / ((bx - ax) ** 2 + (bz - az) ** 2);
          return Math.abs(cross) < 1e-6 && along > 1e-6 && along < 1 - 1e-6;
        });
        for (const [key, light] of seen) if (onWall(...key.split(',').map(Number))) expect(light, key).toBeLessThanOrEqual(0.76 + 1e-6);
      }
    },
  );
});
