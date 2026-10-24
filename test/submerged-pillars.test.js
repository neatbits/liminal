import { describe, it, expect } from 'vitest';
import { BufferGeometry, Float32BufferAttribute, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { createLevel, TILE, setTile } from '../src/core/level.js';
import { setPillar, pillarInfo, PILLAR_DIAMETERS } from '../src/core/pillars.js';
import { submergedPillar, waterCell } from '../src/core/pillar-water.js';
import { floorAt, groundAt, depthAt, pillarBottom } from '../src/core/heights.js';
import { buildSurfaces } from '../src/world/surfaces.js';
import { buildWaterData } from '../src/world/water/geometry.js';
import { resolveCircle } from '../src/world/collision.js';
import { levelFromJSON, levelToJSON } from '../src/core/serialize.js';
import { paintAt, toolById } from '../src/editor/tools.js';
import { paintZone } from '../src/core/zones.js';
import { basins } from '../src/gen/variety.js';

function pool() {
  const l = createLevel({ theme: 'pool', w: 16, h: 16 });
  for (let z = 1; z < 15; z++)
    for (let x = 1; x < 15; x++) {
      const i = z * l.w + x;
      l.tiles[i] = TILE.WATER;
      l.depths[i] = 14;
    }
  return l;
}
const mesh = data => {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(data.pos, 3));
  g.setIndex(data.index);
  return new Mesh(g, new MeshBasicMaterial());
};

describe('round columns below the waterline', () => {
  it.each(PILLAR_DIAMETERS)(
    'continues the %sm cylinder down to the basin floor without a square plinth',
    diameter => {
      const l = pool(),
        before = buildWaterData(l).vertexCount;
      setPillar(l, 7, 7, diameter);
      expect(submergedPillar(l, 7, 7)).toBe(true);
      expect(floorAt(l, 7, 7)).toBe(-1.4);
      expect(buildWaterData(l).vertexCount).toBe(before);
      const surfaces = buildSurfaces(l, null),
        meshes = ['wall', 'basin', 'floor'].map(k => mesh(surfaces[k]));
      try {
        for (let i = 0; i < 16; i++) {
          const a = (i * Math.PI) / 8,
            dx = Math.cos(a),
            dz = Math.sin(a);
          for (const y of [-0.7, 0.7]) {
            const ray = new Raycaster(new Vector3(7.5 + dx * 2, y, 7.5 + dz * 2), new Vector3(-dx, 0, -dz));
            const hit = ray.intersectObjects(meshes)[0];
            expect(hit, `angle ${i}, height ${y}`).toBeDefined();
            expect(Math.hypot(hit.point.x - 7.5, hit.point.z - 7.5)).toBeCloseTo(diameter / 2, 5);
          }
        }
      } finally {
        for (const m of meshes) {
          m.geometry.dispose();
          m.material.dispose();
        }
      }
    },
  );
  it.each(PILLAR_DIAMETERS)('builds no square shaft around the %sm column cell, facing either way', diameter => {
    const l = pool();
    setPillar(l, 7, 7, diameter);
    const r = diameter / 2;
    for (const key of ['wall', 'basin', 'floor']) {
      const { pos, index } = buildSurfaces(l, null)[key];
      for (let t = 0; t < index.length; t += 3) {
        const v = [0, 1, 2].map(k => index[t + k] * 3);
        const ys = v.map(i => pos[i + 1]);
        if (Math.max(...ys) - Math.min(...ys) < 0.01) continue; // horizontal
        const cx = v.reduce((s, i) => s + pos[i], 0) / 3 - 7.5,
          cz = v.reduce((s, i) => s + pos[i + 2], 0) / 3 - 7.5;
        const d = Math.hypot(cx, cz);
        if (d < r + 1) expect(d, `${key} face at ${cx.toFixed(2)}, ${cz.toFixed(2)}`).toBeCloseTo(r, 1);
      }
    }
  });
  it.each([2, 3])('takes the %sm cylinder down to deeper water around its cell, without a square shaft', diameter => {
    const l = pool();
    l.depths.fill(30);
    setPillar(l, 7, 7, diameter);
    l.depths[7 * l.w + 7] = 14; // the column cell itself is shallower than the water around it
    expect(floorAt(l, 7, 7)).toBe(-1.4);
    expect(pillarBottom(l, 7, 7)).toBe(-3);
    const surfaces = buildSurfaces(l, null),
      meshes = ['wall', 'basin'].map(k => mesh(surfaces[k]));
    try {
      for (let i = 0; i < 16; i++) {
        const a = (i * Math.PI) / 8,
          dx = Math.cos(a),
          dz = Math.sin(a);
        for (const y of [-2.8, -2, -0.7]) {
          const ray = new Raycaster(new Vector3(7.5 + dx * 3, y, 7.5 + dz * 3), new Vector3(-dx, 0, -dz));
          const hit = ray.intersectObjects(meshes)[0];
          expect(hit, `angle ${i}, height ${y}`).toBeDefined();
          expect(Math.hypot(hit.point.x - 7.5, hit.point.z - 7.5)).toBeCloseTo(diameter / 2, 5);
        }
      }
    } finally {
      for (const m of meshes) {
        m.geometry.dispose();
        m.material.dispose();
      }
    }
    const dry = createLevel({ theme: 'pool', w: 16, h: 16 });
    dry.tiles[7 * 16 + 7] = TILE.FLOOR;
    setPillar(dry, 7, 7, diameter);
    expect(pillarBottom(dry, 7, 7)).toBe(0);
  });
  it('recognises columns in older rooms and inherits local pool depth', () => {
    const l = pool();
    setTile(l, 7, 7, TILE.PILLAR);
    l.depths[7 * l.w + 7] = 0;
    const old = levelFromJSON(levelToJSON(l));
    expect(submergedPillar(old, 7, 7)).toBe(true);
    expect(depthAt(old, 7, 7)).toBe(1.4);
    expect(floorAt(old, 7, 7)).toBe(-1.4);
    expect(groundAt(old, 7.1, 7.1)).toBe(-1.4);
    expect(resolveCircle(old, 7.1, 7.1, 0.28, -1.4)).toEqual([7.1, 7.1]);
  });
  it('retains the underwater base and diameter through resizing, saving and erasing', () => {
    const l = pool(),
      tool = { ...toolById('pillar'), diameter: 0.5 };
    paintAt(l, tool, 7, 7, 1, false);
    paintAt(l, { ...tool, diameter: 2 }, 7, 7, 1, false);
    const copy = levelFromJSON(levelToJSON(l));
    expect(pillarInfo(copy, 7, 7).radius).toBe(1);
    expect(waterCell(copy, 7, 7)).toBe(true);
    paintAt(copy, tool, 7, 7, 1, true);
    expect(copy.tiles[7 * 16 + 7]).toBe(TILE.WATER);
    expect(floorAt(copy, 7, 7)).toBe(-1.4);
  });
  it('includes the column cell when editing basin depth and detecting connected pools', () => {
    const l = pool();
    setPillar(l, 7, 7);
    expect(basins(l)).toHaveLength(1);
    expect(basins(l)[0]).toContain(7 * 16 + 7);
    expect(paintZone(l, 'depth', [[7, 7]], 2)).toBe(1);
    expect(floorAt(l, 7, 7)).toBe(-2);
    const dry = createLevel({ theme: 'pool', w: 16, h: 16 });
    dry.tiles[7 * 16 + 7] = TILE.FLOOR;
    setPillar(dry, 7, 7);
    expect(submergedPillar(dry, 7, 7)).toBe(false);
    expect(floorAt(dry, 7, 7)).toBe(0);
  });
});
