import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { batchMeshes } from '../src/world/object-batches.js';

function part(material, light = 0.5) {
  const g = new THREE.BoxGeometry(0.4, 0.6, 0.3);
  g.deleteAttribute('uv');
  const count = g.attributes.position.count;
  g.setAttribute('aLight', new THREE.BufferAttribute(new Float32Array(count * 3).fill(light), 3));
  return new THREE.Mesh(g, material);
}

function item(parent, x, z, rot, ...meshes) {
  const g = new THREE.Group();
  g.position.set(x, 0.2, z);
  g.rotation.y = rot;
  g.add(...meshes);
  parent.add(g);
  return g;
}

/** Verdenspunktene til en mesh, slik sjekkene leser dem. */
function worldPoints(mesh) {
  mesh.updateWorldMatrix(true, false);
  const a = mesh.geometry.attributes.position, p = new THREE.Vector3(), out = [];
  for (let i = 0; i < a.count; i++) out.push(p.fromBufferAttribute(a, i).applyMatrix4(mesh.matrixWorld).toArray().map((v) => +v.toFixed(5)));
  return out;
}

describe('faste gjenstander tegnes samlet', () => {
  it('slår sammen like materialer per gruppe, med samme verdenspunkter, normaler og lys', () => {
    const root = new THREE.Group(), objects = new THREE.Group();
    root.position.set(1, 0, 0);
    root.add(objects);
    const wood = new THREE.MeshBasicMaterial(), metal = new THREE.MeshBasicMaterial();
    const a = part(wood, 0.2), b = part(wood, 0.7), c = part(metal), far = part(wood);
    item(objects, 3, 4, 0.5, a, c);
    item(objects, 6, 2, -1.2, b);
    item(objects, 70, 70, 0, far); // en annen gruppe
    root.updateMatrixWorld(true);
    const before = [a, b, c, far].map(worldPoints);
    const normal = new THREE.Vector3().fromBufferAttribute(b.geometry.attributes.normal, 0).transformDirection(b.matrixWorld);

    const batches = batchMeshes([a, b, c, far], objects);
    expect(batches).toHaveLength(1); // bare de to wood-delene i samme gruppe; metal og far står alene
    const [batch] = batches;
    expect(batch.material).toBe(wood);
    expect(batch.parent).toBe(objects);
    expect(batch.geometry.attributes.position.count).toBe(48);
    expect(batch.geometry.index.count).toBe(72);
    // De skjulte delene peker inn i den samlede geometrien og gir de samme verdenspunktene.
    expect([a, b].map((m) => m.visible)).toEqual([false, false]);
    expect([c, far].map((m) => m.visible)).toEqual([true, true]);
    expect(a.geometry.attributes.position.array.buffer).toBe(batch.geometry.attributes.position.array.buffer);
    expect([a, b, c, far].map(worldPoints)).toEqual(before);
    const merged = batch.geometry.attributes;
    expect(merged.aLight.getX(0)).toBeCloseTo(0.2);
    expect(merged.aLight.getX(24)).toBeCloseTo(0.7);
    const n = new THREE.Vector3().fromBufferAttribute(merged.normal, 24).transformDirection(objects.matrixWorld);
    expect(n.distanceTo(normal)).toBeLessThan(1e-6);
    // Den samlede meshen tegner de samme punktene som de to delene gjorde.
    batch.updateWorldMatrix(true, false);
    const p = new THREE.Vector3().fromBufferAttribute(merged.position, 30).applyMatrix4(batch.matrixWorld);
    expect(p.toArray().map((v) => +v.toFixed(5))).toEqual(before[1][6]);
    expect(a.geometry.boundingBox).not.toBeNull();
  });

  it('holder gjennomsiktige materialer utenfor, unntatt de som ikke avhenger av rekkefølge', () => {
    const objects = new THREE.Group();
    const glass = new THREE.MeshBasicMaterial({ transparent: true });
    const shadow = new THREE.MeshBasicMaterial({ transparent: true });
    const meshes = [part(glass), part(glass), part(shadow), part(shadow)];
    meshes.forEach((m, i) => item(objects, i, 0, 0, m));
    const batches = batchMeshes(meshes, objects, { orderFree: [shadow] });
    expect(batches.map((b) => b.material)).toEqual([shadow]);
    expect(meshes.map((m) => m.visible)).toEqual([true, true, false, false]);
  });

  it('bruker 32-bits indekser når den samlede meshen har mange punkter', () => {
    const objects = new THREE.Group(), stone = new THREE.MeshBasicMaterial();
    const meshes = Array.from({ length: 2 }, () => new THREE.Mesh(new THREE.SphereGeometry(0.2, 256, 140), stone));
    meshes.forEach((m, i) => item(objects, i, 0, 0, m));
    const [batch] = batchMeshes(meshes, objects);
    expect(batch.geometry.attributes.position.count).toBeGreaterThan(65535);
    expect(batch.geometry.index.array).toBeInstanceOf(Uint32Array);
    expect(batch.geometry.index.getX(batch.geometry.index.count - 1)).toBeLessThan(batch.geometry.attributes.position.count);
    expect(batch.geometry.index.getX(batch.geometry.index.count - 1)).toBeGreaterThan(65535);
  });
});
