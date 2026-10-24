import { describe, it, expect } from 'vitest';
import * as CANNON from 'cannon-es';
import { createLevel, TILE, setTile, cloneLevel, resizeLevel } from '../src/core/level.js';
import { pillarInfo, pillarContains, setPillar, PILLAR_DIAMETERS } from '../src/core/pillars.js';
import { levelFromJSON, levelToJSON, encodeLevel, decodeLevel } from '../src/core/serialize.js';
import { History } from '../src/core/history.js';
import { isWalkableCell, resolveSpawn } from '../src/core/spawn.js';
import { objectFits } from '../src/core/objects.js';
import { passable } from '../src/world/paths.js';
import { resolveCircle, moveCircle, rayDistance } from '../src/world/collision.js';
import { MeshData } from '../src/world/mesher.js';
import { buildPillar } from '../src/world/pillars.js';
import { buildSurfaces } from '../src/world/surfaces.js';
import { SoftPhysics } from '../src/world/softphysics.js';
import { collectLights } from '../src/world/lighting.js';
import { generateLevel } from '../src/gen/index.js';
import { paintAt, applyRect, toolById } from '../src/editor/tools.js';

function room(theme = 'pool') {
  const l = createLevel({ theme, w: 16, h: 16, height: 6 });
  for (let z = 1; z < 15; z++) for (let x = 1; x < 15; x++) l.tiles[z * 16 + x] = TILE.FLOOR;
  return l;
}

describe('round Poolrooms pillars', () => {
  it('uses circles for existing Poolrooms pillars and retains other themes’ square columns', () => {
    for (const theme of ['pool', 'mall', 'office']) {
      const l = room(theme);
      setTile(l, 7, 7, TILE.PILLAR);
      expect(pillarInfo(l, 7, 7)).toEqual({ x: 7.5, z: 7.5, radius: 0.25, round: theme === 'pool' });
    }
  });
  it.each(PILLAR_DIAMETERS)(
    'keeps diameter %sm through save/share, clone, resize and undo',
    async diameter => {
      const l = room(),
        history = new History();
      history.push(l);
      expect(setPillar(l, 7, 7, diameter)).toBe(1);
      for (const copy of [
        cloneLevel(l),
        levelFromJSON(levelToJSON(l)),
        await decodeLevel(await encodeLevel(l)),
      ]) {
        expect(pillarInfo(copy, 7, 7)?.radius).toBe(diameter / 2);
      }
      expect(pillarInfo(resizeLevel(l, 18, 18), 8, 8)?.radius).toBe(diameter / 2);
      history.undo(l);
      expect(pillarInfo(l, 7, 7)).toBeNull();
      history.redo(l);
      expect(pillarInfo(l, 7, 7)?.radius).toBe(diameter / 2);
      setTile(l, 7, 7, TILE.FLOOR);
      expect(l.meta[7 * 16 + 7]).toBe(0);
    },
  );
  it('allows walking around the curved corner and pushes radially in every direction', () => {
    const l = room();
    setPillar(l, 7, 7);
    expect(resolveCircle(l, 7.9, 7.9, 0.3)).toEqual([7.9, 7.9]);
    for (const diameter of PILLAR_DIAMETERS) {
      setPillar(l, 7, 7, diameter);
      for (let i = 0; i < 16; i++) {
        const a = (i * Math.PI) / 8,
          r = diameter / 2 + 0.2;
        const [x, z] = resolveCircle(l, 7.5 + Math.cos(a) * r, 7.5 + Math.sin(a) * r, 0.3);
        expect(Math.hypot(x - 7.5, z - 7.5)).toBeCloseTo(diameter / 2 + 0.3, 8);
      }
      const [x, z] = resolveCircle(l, 7.5, 7.5, 0.3);
      expect(Math.hypot(x - 7.5, z - 7.5)).toBeCloseTo(diameter / 2 + 0.3, 8);
    }
  });
  it('blocks a wide pillar in adjacent cells, including long movements and camera rays', () => {
    const l = room();
    setPillar(l, 7, 7, 3);
    expect(pillarContains(l, 6.1, 7.5)).toBe(true);
    const [x] = moveCircle(l, 4, 7.5, 8, 0, 0.3);
    expect(x).toBeCloseTo(5.7, 6);
    expect(rayDistance(l, 4, 7.5, 1, 0)).toBeGreaterThanOrEqual(2);
    expect(rayDistance(l, 4, 7.5, 1, 0)).toBeLessThanOrEqual(2.100001);
    expect(isWalkableCell(l, 6, 7)).toBe(false);
    expect(passable(l, 6, 7)).toBe(false);
    l.spawn = { x: 6.5, z: 7.5, a: 0 };
    const spawn = resolveSpawn(l);
    expect(pillarContains(l, spawn.x, spawn.z, 0.3)).toBe(false);
    expect(objectFits(l, { id: 'pottedplant', x: 6, z: 7, rot: 0 })).toBe(false);
  });
  it('does not insert broad columns across walls, doorways or nearby columns', () => {
    const l = room();
    setTile(l, 6, 6, TILE.WALL);
    expect(setPillar(l, 7, 7, 3)).toBe(0);
    setTile(l, 6, 6, TILE.FLOOR);
    expect(setPillar(l, 7, 7, 3)).toBe(1);
    expect(setPillar(l, 10, 7, 3)).toBe(0);
    expect(setPillar(l, 1, 7, 3)).toBe(0);
    expect(setPillar(l, 7, 7, 3)).toBe(0);
  });
  it('retains square collision at edges and corners in other themes', () => {
    const l = room('office');
    setPillar(l, 7, 7, 2);
    expect(resolveCircle(l, 6.5, 7.5, 0.3)).toEqual([6.2, 7.5]);
    const [x, z] = resolveCircle(l, 6.4, 6.4, 0.3);
    expect(Math.hypot(x - 6.5, z - 6.5)).toBeCloseTo(0.3, 8);
  });
  it('paints, resizes and erases columns through the pillar tool', () => {
    const l = room(),
      tool = { ...toolById('pillar'), diameter: 3 };
    expect(paintAt(l, tool, 7, 7, 1, false)).toBe(1);
    expect(pillarInfo(l, 7, 7)?.radius).toBe(1.5);
    expect(applyRect(l, { ...tool, diameter: 1 }, { x0: 7, z0: 7, x1: 7, z1: 7 }, false)).toBe(1);
    expect(pillarInfo(l, 7, 7)?.radius).toBe(0.5);
    paintAt(l, tool, 7, 7, 1, true);
    expect(pillarInfo(l, 7, 7)).toBeNull();
  });
  it('builds cylindrical walls with outward winding, continuous UVs and smooth lighting normals', () => {
    const l = room();
    setPillar(l, 7, 7, 3);
    const normals = [],
      m = new MeshData({
        sample: (x, y, z, nx, ny, nz) => {
          normals.push([x, z, nx, nz]);
          return [1, 1, 1, 0, 0, 0, 0];
        },
      });
    buildPillar(m, l, 7, 7, 0, 6);
    for (let i = 0; i < m.pos.length; i += 3)
      expect(Math.hypot(m.pos[i] - 7.5, m.pos[i + 2] - 7.5)).toBeCloseTo(1.5, 8);
    for (const [x, z, nx, nz] of normals) {
      expect(nx).toBeCloseTo((x - 7.5) / 1.5, 8);
      expect(nz).toBeCloseTo((z - 7.5) / 1.5, 8);
    }
    const uvU = m.uv.filter((_, i) => i % 2 === 0);
    expect(Math.max(...uvU)).toBe(9);
    for (let i = 0; i < m.index.length; i += 3) {
      const [a, b, c] = m.index.slice(i, i + 3).map(k => m.pos.slice(k * 3, k * 3 + 3));
      const ux = b[0] - a[0],
        uy = b[1] - a[1],
        uz = b[2] - a[2],
        vx = c[0] - a[0],
        vy = c[1] - a[1],
        vz = c[2] - a[2];
      expect((uy * vz - uz * vy) * (a[0] - 7.5) + (ux * vy - uy * vx) * (a[2] - 7.5)).toBeGreaterThan(0);
    }
    l.decks[7 * 16 + 7] = 30;
    const walls = buildSurfaces(l, null).wall.pos;
    expect(walls.some((v, i) => i % 3 === 1 && v === 3)).toBe(true);
  });
  it('uses full-height round colliders for loose objects', () => {
    const l = room();
    setPillar(l, 7, 7, 3);
    l.objects = [{ id: 'playball', x: 4, z: 7, rot: 0 }];
    const phys = new SoftPhysics(l),
      body = phys.world.bodies.find(b => b.shapes[0] instanceof CANNON.Cylinder);
    expect(body).toBeDefined();
    body.updateAABB();
    expect(body.aabb.lowerBound.x).toBeCloseTo(6);
    expect(body.aabb.upperBound.x).toBeCloseTo(9);
    expect(body.aabb.lowerBound.y).toBeCloseTo(0);
    expect(body.aabb.upperBound.y).toBeCloseTo(6);
  });
  it('omits ceiling fixtures that would be hidden inside a wide column', () => {
    const l = room();
    setPillar(l, 7, 7, 3);
    l.lights[7 * 16 + 6] = 1;
    l.lights[7 * 16 + 4] = 1;
    const lights = collectLights(l);
    expect(lights.some(light => light.cx === 6 && light.cz === 7)).toBe(false);
    expect(lights.some(light => light.cx === 4 && light.cz === 7)).toBe(true);
  });
  it('generates broad columns in spacious halls without furnishing inside them', () => {
    const diameters = new Set();
    for (const seed of [3, 7, 11, 21]) {
      const l = generateLevel({ theme: 'pool', w: 64, h: 52, seed });
      for (let i = 0; i < l.tiles.length; i++)
        if (l.tiles[i] === TILE.PILLAR) diameters.add(pillarInfo(l, i % l.w, Math.floor(i / l.w)).radius * 2);
      for (const o of l.objects) expect(objectFits(l, o)).toBe(true);
      expect(pillarContains(l, l.spawn.x, l.spawn.z, 0.3)).toBe(false);
    }
    expect(diameters.has(3)).toBe(true);
    expect(diameters.size).toBeGreaterThan(1);
  });
});
