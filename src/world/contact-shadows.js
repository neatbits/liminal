import * as THREE from 'three';
import { SHADOW_KINDS, shadowAlpha, contactShadowPlan } from '../core/contact-shadows.js';

// One small shared atlas for solid bases, round pots and furniture legs.
let atlas;
function shadowAtlas() {
  if (atlas) return atlas;
  const size = 64,
    data = new Uint8Array(size * size * SHADOW_KINDS.length * 4);
  SHADOW_KINDS.forEach((kind, row) => {
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const i = ((row * size + y) * size + x) * 4;
        data[i + 3] = Math.round(
          shadowAlpha(kind, ((x + 0.5) / size) * 2 - 1, ((y + 0.5) / size) * 2 - 1) * 255,
        );
      }
  });
  atlas = new THREE.DataTexture(data, size, size * SHADOW_KINDS.length);
  atlas.magFilter = THREE.LinearFilter;
  atlas.minFilter = THREE.LinearMipmapLinearFilter;
  atlas.generateMipmaps = true;
  atlas.needsUpdate = true;
  return atlas;
}

export function contactShadows(level, poseOf, owned) {
  const material = new THREE.MeshBasicMaterial({
    map: shadowAtlas(),
    transparent: true,
    depthWrite: false,
    color: 0x000000,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  owned.push(material);
  return o => {
    const plan = contactShadowPlan(level, o, poseOf);
    if (!plan) return null;
    const { x, z, y, box, patches, kind } = plan,
      pos = [],
      uv = [],
      indices = [];
    const row = SHADOW_KINDS.indexOf(kind);
    for (const [x0, z0, x1, z1] of patches) {
      const base = pos.length / 3;
      for (const [px, pz] of [
        [x0, z0],
        [x0, z1],
        [x1, z1],
        [x1, z0],
      ]) {
        pos.push(px - x, 0, pz - z);
        uv.push((px - box[0]) / (box[2] - box[0]), (row + (pz - box[1]) / (box[3] - box[1])) / 3);
      }
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices);
    owned.push(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'contactShadow';
    mesh.position.set(x, y + 0.004, z);
    return mesh;
  };
}
