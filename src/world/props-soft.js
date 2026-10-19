// Myke lekeklosser (lekerommet): skumgummi trukket med stoff i lyse farger, med en mørkere søm
// langs kantene. Størrelsen kommer fra katalogen, fargen fra varianten (v).
import * as THREE from 'three';
import { OBJECTS } from '../core/objects.js';
import { box, parts } from './props-geo.js';

export const SOFT_COLORS = ['#f2c230', '#f07a3c', '#ef6a5a', '#a597d6', '#7fb8e6', '#3f8fd0', '#f0a0b4', '#7fd1b0'];

let fabric = null;
/** Fint, strikket stoff (gråtoner – fargen legges på i materialet), med mørk søm i kanten. */
function fabricTexture() {
  if (fabric) return fabric;
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#eeeeee';
  ctx.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 3) for (let x = (y / 3) % 2; x < S; x += 2) {
    ctx.fillStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.05})`;
    ctx.fillRect(x, y, 1, 2);
  }
  // Sømmen: mørkere og litt avrundet mot kanten av hver flate.
  const g = ctx.createLinearGradient(0, 0, S, 0);
  for (const [at, a] of [[0, 0.32], [0.06, 0], [0.94, 0], [1, 0.32]]) g.addColorStop(at, `rgba(0,0,0,${a})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const v = ctx.createLinearGradient(0, 0, 0, S);
  for (const [at, a] of [[0, 0.32], [0.06, 0], [0.94, 0], [1, 0.32]]) v.addColorStop(at, `rgba(0,0,0,${a})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, S, S);
  fabric = new THREE.CanvasTexture(c);
  fabric.colorSpace = THREE.SRGBColorSpace;
  return fabric;
}

/** key = 'soft:<id>:<farge>' */
export function soft(key) {
  const [, id, color] = key.split(':');
  const [w, h, d] = OBJECTS[id].size;
  return parts([{ color: SOFT_COLORS[Number(color) % SOFT_COLORS.length], map: fabricTexture(), geoms: [box(w, h, d, 0, h / 2, 0)] }]);
}
