import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { halfwall } from '../src/world/props-half-wall.js';
import { HALF_WALL } from '../src/core/half-walls.js';

describe('half-wall surfaces', () => {
  it('has wallpaper on both sides, a solid wooden cap and an open sightline above it', () => {
    const requested = [], parts = halfwall('halfwall:backrooms', tex => { requested.push(tex); return null; });
    expect(requested).toEqual(['wallpaperYellow']);
    const meshes = parts.map(p => new THREE.Mesh(p.geometry, new THREE.MeshBasicMaterial()));
    const group = new THREE.Group(); group.add(...meshes); group.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(group), size = bounds.getSize(new THREE.Vector3());
    expect(size.x).toBeCloseTo(HALF_WALL.width);
    expect(size.y).toBeCloseTo(HALF_WALL.height);
    expect(size.z).toBeCloseTo(HALF_WALL.depth);
    for (const dir of [-1, 1]) for (const x of [-1.4, 0, 1.4]) {
      const ray = new THREE.Raycaster(new THREE.Vector3(x, .6, dir * 2), new THREE.Vector3(0, 0, -dir));
      expect(ray.intersectObjects(meshes)[0]?.object).toBe(meshes[0]);
      ray.ray.origin.y = 1.7;
      expect(ray.intersectObjects(meshes)).toHaveLength(0);
    }
    const down = new THREE.Raycaster(new THREE.Vector3(0, 2, 0), new THREE.Vector3(0, -1, 0));
    const cap = down.intersectObjects(meshes)[0];
    expect(cap.object).toBe(meshes[1]);
    expect(cap.point.y).toBeCloseTo(1.1);
    expect(parts[0].geometry.attributes.position.count).toBeGreaterThan(200);
    for (const mesh of meshes) { mesh.geometry.dispose(); mesh.material.dispose(); }
  });
});
