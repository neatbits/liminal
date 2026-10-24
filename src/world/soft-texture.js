// A shared grayscale vinyl atlas per shape. Stitch size is measured in metres,
// so beams and pillars have the same seam/thread scale as the little cubes.
import * as THREE from 'three';
import { softPanels, softRadius } from './soft-geometry.js';
import { softProfile } from '../core/soft-forms.js';

const textures = new Map();
const S = 256;

function panel(ctx, width, height, face, radius, form) {
  const pixels = ctx.createImageData(S, S);
  let seed = 1729 + face * 7919;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const value = 234 + (seed >>> 28) * .65 + (face === 2 ? 4 : 0);
    pixels.data.set([value, value, value, 255], i);
  }
  ctx.putImageData(pixels, face % 3 * S, Math.floor(face / 3) * S);
  ctx.save();
  ctx.translate(face % 3 * S + 1, Math.floor(face / 3) * S + 1);
  ctx.scale((S - 2) / width, (S - 2) / height);
  // Soft panel shading at the edge, with a slightly fuller centre.
  for (const vertical of [false, true]) {
    const extent = vertical ? height : width;
    const g = ctx.createLinearGradient(0, 0, vertical ? 0 : width, vertical ? height : 0);
    const rim = Math.min(.2, radius * 1.5 / extent);
    for (const [t, a] of [[0, .26], [rim, .015], [.5, 0], [1 - rim, .015], [1, .26]]) g.addColorStop(t, `rgba(35,27,35,${a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }
  const inset = radius * .8;
  const path = (offset) => {
    ctx.beginPath();
    if ((form === 'ramp' || form === 'steps') && face < 2) {
      softProfile(form, height, width).forEach(([z, y], i) => {
        const x = offset + (z + width / 2) * (1 - 2 * offset / width);
        const yy = height - offset - y * (1 - 2 * offset / height);
        if (i) ctx.lineTo(x, yy); else ctx.moveTo(x, yy);
      });
      ctx.closePath();
    } else if (form === 'cylinder' && (face === 2 || face === 3)) {
      ctx.ellipse(width / 2, height / 2, width / 2 - offset, height / 2 - offset, 0, 0, Math.PI * 2);
    } else if (form === 'cylinder') {
      ctx.moveTo(0, offset); ctx.lineTo(width, offset);
      ctx.moveTo(0, height - offset); ctx.lineTo(width, height - offset);
    } else ctx.roundRect(offset, offset, width - offset * 2, height - offset * 2, radius * .4);
  };
  // Recessed seam, raised piping highlight, and short cream stitch dashes.
  path(inset); ctx.lineWidth = .009; ctx.strokeStyle = 'rgba(35,24,32,.3)'; ctx.stroke();
  path(inset + .005); ctx.lineWidth = .003; ctx.strokeStyle = 'rgba(255,255,247,.42)'; ctx.stroke();
  path(inset + .012); ctx.lineWidth = .0025; ctx.setLineDash([.007, .007]);
  ctx.strokeStyle = 'rgba(255,248,224,.6)'; ctx.stroke(); ctx.setLineDash([]);
  // A sewn care tab on the back: visible when a block is turned or toppled.
  if (face === 5) {
    const x = width * .72, y = height - inset - .034;
    ctx.fillStyle = '#dedccf'; ctx.fillRect(x, y, .043, .027);
    ctx.fillStyle = '#898c89';
    for (let k = 0; k < 3; k++) ctx.fillRect(x + .007, y + .006 + k * .006, .026 - k * .004, .002);
  }
  ctx.restore();
}

export function softTexture(w, h, d, form = 'box') {
  const key = [w, h, d, form].join(':');
  if (textures.has(key)) return textures.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = S * 3; canvas.height = S * 2;
  const ctx = canvas.getContext('2d');
  softPanels(w, h, d).forEach(([width, height], face) => panel(ctx,
    form === 'cylinder' && face === 4 ? Math.PI * w : width, height, face, softRadius(w, h, d), form));
  const texture = new THREE.CanvasTexture(canvas);
  texture.name = `Soft vinyl ${key}`;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  textures.set(key, texture);
  return texture;
}
