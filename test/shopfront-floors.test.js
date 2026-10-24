import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createLevel, TILE } from '../src/core/level.js';
import { FINISH } from '../src/core/zones.js';
import { SHOPFRONT } from '../src/core/shopfronts.js';
import { SLAB } from '../src/core/heights.js';
import { buildShopfronts } from '../src/world/shopfronts.js';
import { buildSurfaces } from '../src/world/surfaces.js';

const DECK = 4.4;
function fixture(n, door = false) {
  const l = createLevel({ theme: 'mall', w: 12, h: 12, height: 7.8 });
  for (let z = 1; z < 11; z++)
    for (let x = 1; x < 11; x++) {
      const i = z * l.w + x;
      l.tiles[i] = z === 5 ? TILE.WALL : TILE.FLOOR;
      l.finish[i] = (z - 5) * n < 0 ? FINISH.TILES : 0;
      l.decks[i] = 44;
    }
  for (let x = 4; x <= 6; x++) l.meta[5 * l.w + x] = SHOPFRONT;
  if (door) {
    l.tiles[5 * l.w + 5] = TILE.DOOR;
    l.meta[5 * l.w + 5] = 1;
  }
  return l;
}

function geometry(level) {
  const data = { ...buildSurfaces(level, null), ...buildShopfronts(level, null) };
  const group = new THREE.Group();
  for (const key of [
    ...['floor', 'tileFloor', 'shopFloor', 'shopCeiling', 'shopReveal', 'shopFascia', 'shopFrame'],
    ...Object.keys(data).filter(k => k.startsWith('shopFloor_')),
  ]) {
    const d = data[key],
      g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(d.pos, 3));
    g.setIndex(d.index);
    const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial());
    mesh.name = key;
    group.add(mesh);
  }
  group.updateMatrixWorld(true);
  return group;
}

function cast(group, from, to) {
  const origin = new THREE.Vector3(...from),
    target = new THREE.Vector3(...to);
  return new THREE.Raycaster(origin, target.sub(origin).normalize()).intersectObject(group, true)[0];
}

describe('opaque storey boundaries at mall glazing', () => {
  it.each([-1, 1])('closes both window recess ends towards gallery normal %s', n => {
    const group = geometry(fixture(n));
    for (const floor of [0, DECK])
      for (const dx of [-1, 1]) {
        const edge = dx < 0 ? 4 : 7;
        const hit = cast(
          group,
          [edge - dx * 0.6, floor + 1.65, 5.5 - n],
          [edge + dx * 0.2, floor + 0.7, 5.5],
        );
        expect(hit?.object.name).toBe('shopReveal');
        expect(hit.point.y).toBeGreaterThan(floor);
        const reverse = cast(group, [edge + dx * 0.2, floor + 1.5, 5.5], [edge - dx * 0.2, floor + 1.5, 5.5]);
        expect(reverse?.object.name).toBe('shopReveal');
        expect(reverse.point.x).toBeCloseTo(edge + dx * 0.04);
      }
    // The slab's exposed edge must also close the 30 cm gap between storeys.
    for (const dx of [-1, 1]) {
      const edge = dx < 0 ? 4 : 7,
        y = DECK - SLAB / 2;
      expect(cast(group, [edge - dx * 0.5, y, 5.5], [edge + dx * 0.5, y, 5.5])?.object.name).toBe(
        'shopReveal',
      );
    }
  });

  it.each([-1, 1])('covers the whole window floor and an upper door threshold for normal %s', n => {
    const group = geometry(fixture(n, true));
    for (const x of [4.1, 4.8, 5.1, 5.8, 6.1, 6.8])
      for (const z of [5.1, 5.8]) {
        const hit = cast(group, [x, 6, z], [x, 0, z]);
        expect(hit?.point.y).toBeCloseTo(DECK);
      }
    const soffit = cast(group, [5.5, 3.8, 5.5], [5.5, 7, 5.5]);
    expect(soffit?.point.y).toBeCloseTo(DECK - SLAB);
    expect(cast(group, [5.5, 1.5, 4.5], [5.5, 1.5, 6.5])).toBeUndefined();
    // Glazing beside a door needs a reveal above its opening, but keeps the door passable.
    expect(cast(group, [4.5, 5, 5.5], [5.5, 5, 5.5])?.object.name).toBe('shopReveal');
  });

  it.each([-1, 1])('closes both display-bay panels beside an open entrance for normal %s', n => {
    const l = fixture(n);
    l.tiles[5 * l.w + 5] = TILE.FLOOR;
    const group = geometry(l);
    for (const floor of [0, DECK])
      for (const dx of [-1, 1]) {
        const edge = dx < 0 ? 5 : 6;
        // Looking out through the glass, and back from inside the walkable entrance.
        const fromBay = cast(group, [edge + dx * 0.3, floor + 1.5, 5.5], [edge - dx * 0.3, floor + 1.5, 5.5]);
        const fromDoor = cast(
          group,
          [edge - dx * 0.3, floor + 1.5, 5.5],
          [edge + dx * 0.3, floor + 1.5, 5.5],
        );
        expect(fromBay?.object.name).toBe('shopReveal');
        expect(fromDoor?.object.name).toBe('shopReveal');
        expect(Math.abs(fromBay.point.x - fromDoor.point.x)).toBeCloseTo(0.04);
      }
    expect(cast(group, [5.5, 1.5, 4], [5.5, 1.5, 7])).toBeUndefined();
    expect(cast(group, [5.5, 5.9, 4], [5.5, 5.9, 7])).toBeUndefined();
  });
});
