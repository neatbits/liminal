import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createLevel, TILE, getTile, WATER_SURFACE } from '../src/core/level.js';
import { deckAt, ceilingAt } from '../src/core/heights.js';
import { mallRoof, roofHeight } from '../src/core/mall-roof.js';
import { fountainJets, fountainDrop } from '../src/core/fountain-jets.js';
import { fountainRimAt } from '../src/core/fountains.js';
import { collectLights } from '../src/world/lighting.js';
import { buildSurfaces } from '../src/world/surfaces.js';
import { buildMallRoof } from '../src/world/mall-roof.js';
import { presetById, generateLevel } from '../src/gen/index.js';
import { mallLayout, MALL_DECK } from '../src/gen/mall.js';
import { labelRegions } from '../src/gen/util.js';
import { levelFromJSON, levelToJSON } from '../src/core/serialize.js';
import { Walker } from '../src/view3d/walker.js';
import { getTheme } from '../src/core/themes.js';

function mesh(data) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(data.pos, 3));
  g.setIndex(data.index);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial());
  m.updateMatrixWorld(true);
  return m;
}

describe('pitched mall skylight', () => {
  it('follows the open atrium and closes both slopes above the original ceiling', () => {
    const l = presetById('mall').make({ seed: 7, layout: 'gallery' }),
      r = mallRoof(l),
      mid = (r.z0 + r.z1) / 2;
    expect(roofHeight(r, r.z0)).toBe(r.base);
    expect(roofHeight(r, r.z1)).toBe(r.base);
    expect(roofHeight(r, mid)).toBeGreaterThan(r.base + 1);
    const { mallRoofGlass: glass, mallRoofFrame: frame, mallRoofGlow: glow } = buildMallRoof(l, null);
    expect(frame.vertexCount).toBeGreaterThan(100);
    expect(glow.vertexCount).toBeGreaterThan(0);
    const roof = mesh(glass),
      ceiling = mesh(buildSurfaces(l, null).ceiling);
    for (let z = r.z0 + 0.4; z < r.z1; z += 1.7) {
      const x = r.x0 + 4.2,
        ray = new THREE.Raycaster(new THREE.Vector3(x, 6, z), new THREE.Vector3(0, 1, 0));
      expect(ray.intersectObject(roof)[0]?.point.y).toBeCloseTo(roofHeight(r, z), 4);
      expect(ray.intersectObject(ceiling)).toHaveLength(0);
    }
    expect(collectLights(l).some(light => light.rgb && light.y > 7)).toBe(true);
    for (const light of collectLights(l).filter(light => !light.object)) {
      if (r.mask[light.cz * l.w + light.cx]) expect(light.y).toBeLessThan(4.4);
    }
  });

  it('preserves the roof across saving and avoids applying it to other themes or low rooms', () => {
    const l = presetById('mall').make({ seed: 7, layout: 'gallery' });
    expect(mallRoof(levelFromJSON(levelToJSON(l)))).toEqual(mallRoof(l));
    expect(mallRoof({ ...l, theme: 'pool' })).toBeNull();
    expect(mallRoof({ ...l, height: 5 })).toBeNull();
    expect(
      Object.values(buildMallRoof({ ...l, theme: 'office' }, null)).every(d => d.vertexCount === 0),
    ).toBe(true);
  });

  it('closes both gable bases with a continuous crossbeam under the glass', () => {
    const l = presetById('mall').make({ seed: 7, layout: 'gallery' }),
      r = mallRoof(l),
      frame = mesh(buildMallRoof(l, null).mallRoofFrame);
    for (const [end, dir] of [
      [r.x0, -1],
      [r.x1, 1],
    ])
      for (let z = r.z0 + 0.2; z < r.z1; z += 0.3) {
        const ray = new THREE.Raycaster(
          new THREE.Vector3(end - dir * 0.5, r.base - 0.04, z),
          new THREE.Vector3(dir, 0, 0),
          0,
          1,
        );
        const hit = ray.intersectObject(frame)[0];
        expect(hit, `end ${end}, z ${z}`).toBeTruthy();
        expect(hit.point.x).toBeCloseTo(end - dir * 0.1, 4);
      }
    expect(buildMallRoof(l, null).mallRoofFrame.pos.every(Number.isFinite)).toBe(true);
  });
});

describe('mall fountain trajectories', () => {
  it('centres one spray in each pool and keeps every arc and landing inside the water', () => {
    const l = presetById('mall').make({ seed: 7, layout: 'gallery' }),
      jets = fountainJets(l);
    expect(jets).toHaveLength(2);
    for (const j of jets) {
      expect(fountainRimAt(l, j.x, j.z)).toBeNull();
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8)
        for (let p = 0; p <= 20; p++) {
          const [x, y, z] = fountainDrop(j, angle, p / 20);
          expect(getTile(l, Math.floor(x), Math.floor(z))).toBe(TILE.WATER);
          expect(fountainRimAt(l, x, z)).toBeNull();
          expect(y).toBeGreaterThanOrEqual(WATER_SURFACE);
          expect(y).toBeLessThan(ceilingAt(l, Math.floor(x), Math.floor(z)));
        }
      expect(fountainDrop(j, 0, 0.5, true)[1]).toBeCloseTo(WATER_SURFACE + 0.02 + j.height);
      expect(fountainDrop(j, 0, 1)[1]).toBeCloseTo(WATER_SURFACE + 0.02);
    }
  });

  it('handles concave water footprints and skips tiny pools and other themes', () => {
    const l = createLevel({ theme: 'mall', w: 16, h: 16, height: 7.8 });
    for (let z = 2; z < 12; z++) for (let x = 2; x < 5; x++) l.tiles[z * 16 + x] = TILE.WATER;
    for (let x = 2; x < 12; x++) for (let z = 9; z < 12; z++) l.tiles[z * 16 + x] = TILE.WATER;
    const [j] = fountainJets(l);
    expect(j).toBeTruthy();
    expect(getTile(l, Math.floor(j.x), Math.floor(j.z))).toBe(TILE.WATER);
    expect(fountainJets({ ...l, theme: 'pool' })).toEqual([]);
    l.tiles.fill(TILE.FLOOR);
    l.tiles[5 * 16 + 5] = TILE.WATER;
    expect(fountainJets(l)).toEqual([]);
  });
});

describe('mall side courts and return arcades', () => {
  it('adds connected perpendicular routes on both storeys without consuming the central atrium', () => {
    const l = presetById('mall').make({ seed: 7, layout: 'gallery' }),
      { shop, atrium } = mallLayout(l.w, l.h);
    expect(labelRegions(l).sizes.length).toBe(1);
    for (const z of [2, l.h - 3])
      for (let x = 2; x < l.w - 2; x++) {
        expect(getTile(l, x, z)).toBe(TILE.FLOOR);
        expect(l.finish[z * l.w + x]).toBe(0);
        expect(deckAt(l, x, z)).toBe(4.4);
      }
    for (const front of [shop + 1, l.h - 2 - shop]) {
      const courts = [];
      for (let x = 5; x < l.w - 5; x++)
        if (getTile(l, x, front) === TILE.FLOOR && !l.meta[front * l.w + x]) courts.push(x);
      expect(courts.length).toBeGreaterThanOrEqual(5);
      for (const x of courts) expect(deckAt(l, x, front)).toBe(4.4);
    }
    expect(deckAt(l, atrium.x0 + 2, atrium.z0 + 1)).toBe(0);
    expect(generateLevel({ theme: 'mall', w: 12, h: 12, seed: 1 }).decks.some(Boolean)).toBe(false);
  });

  it.each([0, MALL_DECK])('keeps the furnished return loop walkable at height %s', floor => {
    const l = presetById('mall').make({ seed: 7, layout: 'gallery' }),
      walker = new Walker(),
      theme = getTheme('mall');
    walker.reset(l, { x: 3.5, z: 2.5, a: -Math.PI / 2 });
    walker.floorY = floor;
    const input = { forward: 1, strafe: 0, running: false, consumeLook: () => [0, 0] };
    const legs = [
      ['x', l.w - 3.5, 1, -Math.PI / 2],
      ['z', l.h - 2.5, 1, Math.PI],
      ['x', 3.5, -1, Math.PI / 2],
      ['z', 2.5, -1, 0],
    ];
    for (const [axis, target, dir, yaw] of legs) {
      walker.yaw = yaw;
      for (let k = 0; k < 1000 && (target - walker[axis]) * dir > 0; k++)
        walker.update(0.05, input, l, theme);
      expect(Math.abs(walker[axis] - target)).toBeLessThan(0.5);
      expect(walker.floorY).toBeCloseTo(floor, 1);
    }
  });
});
