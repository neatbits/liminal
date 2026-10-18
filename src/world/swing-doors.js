// Dører som kan åpnes og lukkes mens man går: hvert dørblad er et eget objekt som dreies om
// hengslet. Lyset er bakt i stillingen dørbladet hadde da rommet ble bygget.
import * as THREE from 'three';
import { leafPose } from '../core/doors.js';
import { toGeometry } from './materials.js';

const SPEED = 2.6; // rad/s

/** Vinkelen til dørbladet sett ovenfra (atan2 av retningen fra hengslet). */
const angleOf = (info) => {
  const { u } = leafPose(info);
  return Math.atan2(u[1], u[0]);
};
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * @param list `swing` fra buildDoors
 * @returns {{ group, set(i, state), update(dt), dispose() }}
 */
export function createSwingDoors(list, leafMaterial, knobMaterial) {
  const group = new THREE.Group();
  const doors = new Map();
  const geometries = [];
  for (const d of list) {
    const pivot = new THREE.Group();
    pivot.position.set(d.hinge[0], 0, d.hinge[1]);
    for (const [data, material] of [
      [d.leaf, leafMaterial],
      [d.knob, knobMaterial],
    ]) {
      const g = toGeometry(data);
      g.translate(-d.hinge[0], 0, -d.hinge[1]);
      geometries.push(g);
      pivot.add(new THREE.Mesh(g, material));
    }
    group.add(pivot);
    doors.set(d.i, { pivot, info: d.info, base: angleOf(d.info), target: 0 });
  }
  return {
    group,
    /** Dreier dør nr. i (rute-indeks) mot en ny tilstand (DOOR). */
    set(i, state) {
      const d = doors.get(i);
      // rotation.y = θ dreier retningen φ til φ − θ: fra bygget stilling til den nye.
      if (d) d.target = wrap(d.base - angleOf({ ...d.info, state }));
    },
    update(dt) {
      for (const d of doors.values()) {
        const diff = d.target - d.pivot.rotation.y;
        if (Math.abs(diff) < 1e-4) continue;
        d.pivot.rotation.y += Math.sign(diff) * Math.min(Math.abs(diff), SPEED * dt);
      }
    },
    dispose() {
      for (const g of geometries) g.dispose();
    },
  };
}
