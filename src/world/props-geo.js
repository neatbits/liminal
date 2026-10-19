// Enkle former for gjenstandene som bygges i koden (props.js, props-shop.js): bokser og
// sylindre, slått sammen til én geometri per farge/materiale.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Boks med midtpunkt (x, y, z) og størrelse (w, h, d), dreid ry om loddaksen. */
export function box(w, h, d, x, y, z, ry = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  return g;
}

export function cylinder(r, h, x, y, z, seg = 16) {
  const g = new THREE.CylinderGeometry(r, r, h, seg);
  g.translate(x, y, z);
  return g;
}

/** Slår sammen geometriene for hver del: [{ geometry, color, map, unlit }]. */
export function parts(groups) {
  return groups.map(({ geoms, color, map = null, unlit = false }) => {
    const geometry = mergeGeometries(geoms.map((g) => g.toNonIndexed()));
    for (const g of geoms) g.dispose();
    return { geometry, map, arm: null, color: new THREE.Color(color), alphaTest: 0, side: THREE.FrontSide, unlit };
  });
}
