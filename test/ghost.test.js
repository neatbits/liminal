import { beforeAll, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GHOST, ghostPose, ghostClothTime } from '../src/core/ghost.js';
import { Monster3D } from '../src/view3d/monster.js';

const ai = { x: 4, y: 0, z: 6, state: 'hunt', visible: true },
  player = { x: 4, z: 10 };
let bytes;
beforeAll(() => {
  bytes = readFileSync(`models/${GHOST.file}.glb`);
});
const load = () =>
  new GLTFLoader()
    .setMeshoptDecoder(MeshoptDecoder)
    .parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');

describe('floating ghost replacement', () => {
  it('ships a compact animated model and credits its original author', async () => {
    expect(bytes.length).toBeLessThan(1024 * 1024);
    const license = readFileSync(`3dmodels/${GHOST.file}/license.txt`, 'utf8');
    for (const key of ['title', 'author', 'source', 'authorUrl'])
      expect(license).toContain(GHOST.attribution[key]);
    expect(license).toContain('CC-BY-4.0');
    const gltf = await load(),
      mesh = gltf.scene.getObjectsByProperty('isMesh', true)[0];
    expect(gltf.animations).toHaveLength(1);
    expect(mesh.geometry.morphAttributes.position).toHaveLength(16);
    expect(mesh.geometry.index.count / 3).toBeLessThan(15000);
    mesh.geometry.dispose();
    mesh.material.dispose();
  });
  it('keeps a gentle hover over raised floors and always faces the player', () => {
    for (let t = 0; t < 30; t += 0.05) {
      const p = ghostPose(t, { ...ai, y: 4.4 }, player);
      expect(p.y).toBeGreaterThan(4.54);
      expect(p.y + GHOST.height).toBeLessThan(6.42);
      expect(p.x).toBe(ai.x);
      expect(p.z).toBe(ai.z);
      expect(p.yaw).toBeCloseTo(GHOST.turn);
    }
    expect(ghostPose(0, ai, { x: 8, z: 6 }).yaw).toBeCloseTo(Math.PI / 2 + GHOST.turn);
  });
  it('keeps the cloth loop within the upright poses and reverses smoothly', () => {
    for (let t = 0; t < 120; t += 0.037) {
      expect(ghostClothTime(t)).toBeGreaterThanOrEqual(0);
      expect(ghostClothTime(t)).toBeLessThanOrEqual(0.125);
      expect(Math.abs(ghostClothTime(t + 0.001) - ghostClothTime(t))).toBeLessThan(0.00012);
    }
    expect(ghostClothTime(GHOST.clothPeriod)).toBeCloseTo(0);
    expect(ghostClothTime(GHOST.clothPeriod / 2)).toBeCloseTo(0.125);
  });
  it('remains upright and above the floor over repeated loops, long frames and reappearance', async () => {
    const ghost = new Monster3D({ load });
    await ghost.load();
    try {
      for (let i = 0; i < 160; i++) {
        ghost.update(i % 17 === 0 ? 5 : 0.11, ai, player, 0.1);
        ghost.group.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(ghost.model, true);
        expect(box.getSize(new THREE.Vector3()).y).toBeGreaterThan(1.6);
        expect(box.min.y).toBeGreaterThan(0.1);
      }
      ghost.update(20, { ...ai, visible: false }, player, 1);
      ghost.update(0, ai, player, 0.1);
      ghost.group.updateMatrixWorld(true);
      expect(
        new THREE.Box3().setFromObject(ghost.model, true).getSize(new THREE.Vector3()).y,
      ).toBeGreaterThan(1.6);
    } finally {
      ghost.dispose();
    }
  });
  it('loads once on demand, animates the cloth, and freezes when dt is zero', async () => {
    const fetch = vi.fn(load),
      ghost = new Monster3D({ load: fetch });
    expect(fetch).not.toHaveBeenCalled();
    expect(ghost.group.visible).toBe(false);
    const ready = ghost.load();
    expect(ghost.load()).toBe(ready);
    expect(await ready).toBe(true);
    ghost.update(0, ai, player, 0.1);
    ghost.group.updateMatrixWorld(true);
    expect(new THREE.Box3().setFromObject(ghost.model, true).getSize(new THREE.Vector3()).y).toBeGreaterThan(
      0.9,
    );
    const mesh = ghost.model.getObjectsByProperty('isMesh', true)[0],
      before = [...mesh.morphTargetInfluences];
    ghost.update(0.5, ai, player, 0.1);
    expect(mesh.morphTargetInfluences).not.toEqual(before);
    const position = ghost.group.position.toArray(),
      weights = [...mesh.morphTargetInfluences];
    ghost.update(0, ai, player, 0.1);
    expect(ghost.group.position.toArray()).toEqual(position);
    expect(mesh.morphTargetInfluences).toEqual(weights);
    expect(fetch).toHaveBeenCalledTimes(1);
    ghost.update(0.5, { ...ai, visible: false }, player, 1);
    expect(ghost.group.visible).toBe(false);
    const dispose = vi.spyOn(mesh.geometry, 'dispose');
    ghost.dispose();
    ghost.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
  });
  it('releases a model that finishes loading after disposal', async () => {
    let finish;
    const ghost = new Monster3D({ load: () => new Promise(r => (finish = r)) }),
      ready = ghost.load();
    ghost.dispose();
    const gltf = await load(),
      mesh = gltf.scene.getObjectsByProperty('isMesh', true)[0];
    const disposed = vi.spyOn(mesh.geometry, 'dispose');
    finish(gltf);
    expect(await ready).toBe(false);
    expect(disposed).toHaveBeenCalledOnce();
    expect(ghost.model).toBeNull();
  });
});
