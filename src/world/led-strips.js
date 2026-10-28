// LED-striper i 3D: tynne selvlysende remser under taket (flatene fra core/leds.js), én mesh per
// farge. Remsene vender inn i rommet (FrontSide), så de forsvinner med veggen i dukkehuset.
import * as THREE from 'three';
import { LED_COLORS, LED_GAP, LED_STRIP, ledFaces } from '../core/leds.js';

const INSET = 0.006; // ut fra veggen, mot z-fighting

/** Hjørnene i remsen på veggruten (x, z) mot naboen i retning (dx, dz), mot klokka sett fra rommet. */
function quad({ x, z, dx, dz, ceil }) {
  const y1 = ceil - LED_GAP;
  const y0 = y1 - LED_STRIP;
  if (dx) {
    const px = dx > 0 ? x + 1 + INSET : x - INSET;
    const [a, b] = dx > 0 ? [z + 1, z] : [z, z + 1];
    return [px, y0, a, px, y0, b, px, y1, b, px, y1, a];
  }
  const pz = dz > 0 ? z + 1 + INSET : z - INSET;
  const [a, b] = dz > 0 ? [x, x + 1] : [x + 1, x];
  return [a, y0, pz, b, y0, pz, b, y1, pz, a, y1, pz];
}

export function buildLedStrips(level) {
  const group = new THREE.Group();
  const byColor = new Map();
  for (const face of ledFaces(level)) {
    if (!byColor.has(face.color)) byColor.set(face.color, []);
    byColor.get(face.color).push(quad(face));
  }
  const strips = [];
  for (const [color, quads] of byColor) {
    const verts = quads.flat();
    const index = [];
    for (let k = 0; k < quads.length; k++) index.push(4 * k, 4 * k + 1, 4 * k + 2, 4 * k, 4 * k + 2, 4 * k + 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geometry.setIndex(index);
    const base = new THREE.Color(LED_COLORS[color]);
    const material = new THREE.MeshBasicMaterial({ color: base.clone() });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'ledStrip';
    group.add(mesh);
    strips.push({ geometry, material, base });
  }
  return {
    group,
    /** Strømmen (0–1): remsene slukner med resten av lyset ved strømbrudd. */
    update(power = 1) {
      for (const s of strips) s.material.color.copy(s.base).multiplyScalar(0.04 + 0.96 * power);
    },
    dispose() {
      for (const s of strips) {
        s.geometry.dispose();
        s.material.dispose();
      }
    },
  };
}
