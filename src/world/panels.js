// Lyspaneler i 3D: en selvlysende flate like under taket i hver rute med panel (core/panels.js),
// én mesh per paneltype. Flaten vender ned (FrontSide), så den forsvinner med taket i dukkehuset.
import * as THREE from 'three';
import { PANEL_COLORS, PANEL_INSET, panelCells } from '../core/panels.js';

const GLOW = 0.9; // under 1: et stort panelfelt skal ikke blomstre over hele bildet

export function buildPanels(level) {
  const group = new THREE.Group();
  const byType = new Map();
  for (const cell of panelCells(level)) {
    if (!byType.has(cell.type)) byType.set(cell.type, []);
    byType.get(cell.type).push(cell);
  }
  const panels = [];
  for (const [type, cells] of byType) {
    const verts = [];
    const index = [];
    cells.forEach(({ x, z, ceil }, k) => {
      const y = ceil - PANEL_INSET;
      verts.push(x, y, z, x + 1, y, z, x + 1, y, z + 1, x, y, z + 1);
      index.push(4 * k, 4 * k + 1, 4 * k + 2, 4 * k, 4 * k + 2, 4 * k + 3); // normal ned
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geometry.setIndex(index);
    const base = new THREE.Color(PANEL_COLORS[type].hex).multiplyScalar(GLOW);
    const material = new THREE.MeshBasicMaterial({ color: base.clone() });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'ceilingPanel';
    group.add(mesh);
    panels.push({ geometry, material, base });
  }
  const tintColor = new THREE.Color();
  return {
    group,
    /** Strømmen (0–1) og lysfargen (core/tints.js), som armaturene. */
    update(power = 1, tint = [1, 1, 1]) {
      tintColor.setRGB(tint[0], tint[1], tint[2]);
      for (const p of panels) p.material.color.copy(p.base).multiply(tintColor).multiplyScalar(0.04 + 0.96 * power);
    },
    dispose() {
      for (const p of panels) {
        p.geometry.dispose();
        p.material.dispose();
      }
    },
  };
}
