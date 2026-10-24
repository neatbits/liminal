// Padded vinyl play blocks; shape atlas and geometry are shared across colour variants.
import * as THREE from 'three';
import { OBJECTS } from '../core/objects.js';
import { softGeometry } from './soft-geometry.js';
import { softTexture } from './soft-texture.js';
import { softFormGeometry } from './soft-forms.js';

export const SOFT_COLORS = ['#f2c230', '#f07a3c', '#ef6a5a', '#a597d6', '#7fb8e6', '#3f8fd0', '#f0a0b4', '#7fd1b0'];

/** key = 'soft:<id>:<farge>' */
export function soft(key) {
  const [, id, color] = key.split(':');
  const def = OBJECTS[id], [w, h, d] = def.size;
  return [{ geometry: def.softForm ? softFormGeometry(def.softForm, w, h, d) : softGeometry(w, h, d),
    color: new THREE.Color(SOFT_COLORS[Number(color) % SOFT_COLORS.length]),
    map: softTexture(w, h, d, def.softForm), arm: null, alphaTest: 0, side: THREE.FrontSide, vinyl: true }];
}
