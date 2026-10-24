import { describe, it, expect } from 'vitest';
import { createLevel, TILE, cloneLevel } from '../src/core/level.js';
import { HALF_WALL, halfWallBox, halfWallContains, halfWalls } from '../src/core/half-walls.js';
import { objectFits, objectPose, placeObject } from '../src/core/objects.js';
import { isWalkableCell, resolveSpawn } from '../src/core/spawn.js';
import { levelFromJSON, levelToJSON, encodeLevel, decodeLevel } from '../src/core/serialize.js';
import { History } from '../src/core/history.js';
import { cellHeights, lineOfSight } from '../src/world/lighting.js';
import { moveCircle, resolveCircle, rayDistance } from '../src/world/collision.js';
import { passable, distanceMap } from '../src/world/paths.js';
import { SoftPhysics } from '../src/world/softphysics.js';
import { generateLevel, PRESETS } from '../src/gen/index.js';

function room(rot = 0) {
  const l = createLevel({ w: 16, h: 16, theme: 'backrooms' });
  for (let z = 1; z < 15; z++) for (let x = 1; x < 15; x++) l.tiles[z * l.w + x] = TILE.FLOOR;
  l.objects = [{ id: 'halfwall', x: 7, z: 7, rot }];
  return l;
}

describe('low hall partitions', () => {
  it.each([0, 1, 2, 3])('uses the same thin footprint for rendering, navigation and collision (rotation %i)', rot => {
    const l = room(rot), o = l.objects[0], p = objectPose(l, o), b = halfWallBox(o);
    expect([p.x - p.w / 2, p.z - p.d / 2, p.x + p.w / 2, p.z + p.d / 2]).toEqual(b);
    expect(p.h).toBe(1.1);
    const across = rot & 1, dx = across ? -1 : 0, dz = across ? 0 : -1;
    const [x, z] = moveCircle(l, 7.5 - dx * 2, 7.5 - dz * 2, dx * 4, dz * 4, .3, true, 0);
    expect(across ? x : z).toBeCloseTo(7.5 + HALF_WALL.depth / 2 + .3);
    l.height = 4; // Enough headroom when the player is above the partition.
    expect(resolveCircle(l, 7.5, 7.5, .3, 1.2)).toEqual([7.5, 7.5]);
    expect(rayDistance(l, 7.5 - dx * 2, 7.5 - dz * 2, dx, dz, 4, .01)).toBeCloseTo(1.86, 1);
    for (const k of [-1, 0, 1]) {
      const cx = 7 + (across ? 0 : k), cz = 7 + (across ? k : 0);
      expect(passable(l, cx, cz)).toBe(false);
      expect(isWalkableCell(l, cx, cz)).toBe(false);
    }
    expect(passable(l, 5, 7)).toBe(true);
    expect(halfWallContains(l, 7.5, 8, .3)).toBe(Boolean(across));
    l.spawn = { x: 7.5, z: 7.5, a: 0 };
    const spawn = resolveSpawn(l);
    expect(halfWallContains(l, spawn.x, spawn.z, .3)).toBe(false);
    l.objects = [];
    expect(passable(l, 7, 7)).toBe(true);
  });

  it('blocks low rays in both directions, while sight and light pass over the cap', () => {
    const l = room(), h = cellHeights(l);
    for (const [a, b] of [[5, 10], [10, 5]]) {
      expect(lineOfSight(l, 7.5, a, 7.5, b, h, .5, .5)).toBe(false);
      expect(lineOfSight(l, 7.5, a, 7.5, b, h, 1.7, 1.7)).toBe(true);
      expect(lineOfSight(l, 7.5, a, 7.5, b, h, 1.1, 1.1)).toBe(true);
    }
    // A sloping ray can intersect even if one end is above the partition.
    expect(lineOfSight(l, 7.5, 6, 7.5, 9, h, .2, 1.8)).toBe(false);
    expect(lineOfSight(l, 5.8, 5, 5.8, 10, h, .5, .5)).toBe(true);
    expect(lineOfSight(l, 7.5, 7.5, 7.5, 9, h, .5, .5)).toBe(false);
    // Rays leaving the top surface must not shadow that surface itself.
    expect(lineOfSight(l, 7.5, 7.5, 7.5, 9, h, 1.1, 2.5)).toBe(true);
    // The cap projects past the wallpaper: it must not shadow the whole vertical face.
    for (const dir of [-1, 1]) {
      expect(lineOfSight(l, 7.5, 7.5 + dir * .12, 7.5, 7.5 + dir * 3, h, .6, 2.55)).toBe(true);
    }
    l.floors[7 * l.w + 7] = 10;
    const raised = cellHeights(l);
    expect(halfWalls(l)[0]).toMatchObject({ bottom: 1, top: 2.1 });
    expect(lineOfSight(l, 7.5, 5, 7.5, 10, raised, 1.7, 1.7)).toBe(false);
  });

  it('retains geometry and orientation through JSON, links, clone and undo', async () => {
    const l = room(1), history = new History();
    for (const copy of [cloneLevel(l), levelFromJSON(levelToJSON(l)), await decodeLevel(await encodeLevel(l))]) {
      expect(halfWalls(copy)).toEqual(halfWalls(l));
      expect(copy.objects).toEqual(l.objects);
    }
    history.push(l); placeObject(l, 7, 7, 'halfwall', true);
    expect(halfWalls(l)).toEqual([]);
    history.undo(l); expect(halfWalls(l)).toHaveLength(1);
    history.redo(l); expect(halfWalls(l)).toHaveLength(0);
  });

  it('can be placed by hand, stays centred and rejects uneven floors or intersecting furniture', () => {
    const l = room(); l.objects = [];
    expect(placeObject(l, 7, 7, 'halfwall')).toBe(1);
    const o = l.objects[0];
    l.tiles[6 * l.w + 7] = TILE.WALL;
    expect(objectPose(l, o).z).toBe(7.5);
    expect(objectFits(l, o)).toBe(true);
    l.floors[7 * l.w + 6] = 5;
    expect(objectFits(l, o)).toBe(false);
    l.floors.fill(0); l.objects.push({ id: 'table', x: 7, z: 7, rot: 0 });
    expect(objectPose(l, o).y).toBe(0);
    expect(objectFits(l, o)).toBe(false);
  });

  it('uses the low volume for loose-object physics too', () => {
    const l = room();
    l.objects.push({ id: 'softcube', x: 7, z: 10, rot: 0 });
    const physics = new SoftPhysics(l);
    const hit = physics.world.bodies.find(b => b.mass === 0 && Math.abs(b.position.y - .55) < 1e-6);
    expect(hit?.position.x).toBe(7.5);
    expect(hit?.shapes[0].halfExtents.y).toBe(.55);
  });
});

describe('Level 0 half-wall generation', () => {
  it('adds a few framed openings to the public example', () => {
    const l = PRESETS.find(p => p.id === 'level0').make();
    const walls = l.objects.filter(o => o.id === 'halfwall');
    expect(walls.length).toBeGreaterThanOrEqual(3);
    expect(walls.length).toBeLessThanOrEqual(8);
    for (const o of walls) {
      expect(objectFits(l, o)).toBe(true);
      const [dx, dz] = o.rot & 1 ? [0, 1] : [1, 0];
      for (const k of [-2, 2]) expect(l.tiles[(o.z + k * dz) * l.w + o.x + k * dx]).toBe(TILE.WALL);
      for (const k of [-1, 0, 1]) {
        const i = (o.z + k * dz) * l.w + o.x + k * dx;
        expect(l.tiles[i]).toBe(TILE.FLOOR);
        expect(l.ceilings[i]).toBe(24);
      }
    }
    expect(PRESETS[0].make().objects).toEqual(l.objects);
  });

  it('keeps routes connected across seeds and leaves other themes alone', () => {
    let total = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const l = generateLevel({ theme: 'backrooms', w: 40, h: 36, seed });
      total += l.objects.filter(o => o.id === 'halfwall').length;
      const dist = distanceMap(l, Math.floor(l.spawn.x), Math.floor(l.spawn.z));
      for (let z = 0; z < l.h; z++) for (let x = 0; x < l.w; x++) {
        if (passable(l, x, z)) expect(Number.isFinite(dist[z * l.w + x]), `seed ${seed}: ${x},${z}`).toBe(true);
      }
    }
    expect(total).toBeGreaterThan(12);
    for (const theme of ['pool', 'office', 'mall', 'basement']) {
      expect(generateLevel({ theme, seed: 2 }).objects.some(o => o.id === 'halfwall')).toBe(false);
    }
  });
});
