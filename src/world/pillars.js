// Pillar walls share room materials and baked lighting, with smooth cylinder normals.
import { pillarInfo } from '../core/pillars.js';
import { faceQuad, heightLevels } from './mesher.js';

export function buildPillar(mesh, level, x, z, y0, y1, base = y0) {
  const p = pillarInfo(level, x, z);
  const r = p.radius;
  if (!p.round) {
    const faces = [
      [[1, 0, 0], [p.x + r, p.z + r], [p.x + r, p.z - r]],
      [[-1, 0, 0], [p.x - r, p.z - r], [p.x - r, p.z + r]],
      [[0, 0, 1], [p.x - r, p.z + r], [p.x + r, p.z + r]],
      [[0, 0, -1], [p.x + r, p.z - r], [p.x - r, p.z - r]],
    ];
    for (const [n, a, b] of faces) {
      const u = ([x, z]) => x * n[2] - z * n[0];
      mesh.wall(...a, ...b, n, u(a), u(b), y0, y1, [1, 1], undefined, base);
    }
    return;
  }
  const segments = r >= 1 ? 48 : 32;
  const ys = heightLevels(y0, y1);
  // Whole texture repeats meet at the seam; texel density stays close to the flat walls.
  const repeat = Math.max(1, Math.round(2 * Math.PI * r));
  for (let j = 0; j < segments; j++) {
    const a = (j / segments) * Math.PI * 2, b = ((j + 1) / segments) * Math.PI * 2;
    const na = [Math.cos(a), 0, Math.sin(a)], nb = [Math.cos(b), 0, Math.sin(b)];
    const A = [p.x + r * na[0], p.z + r * na[2]], B = [p.x + r * nb[0], p.z + r * nb[2]];
    const u = (j / segments) * repeat, v = ((j + 1) / segments) * repeat;
    for (let k = 0; k < ys.length - 1; k++) {
      const lo = ys[k], hi = ys[k + 1];
      const ao0 = k === 0 ? 0.78 : 1, ao1 = k === ys.length - 2 ? 0.85 : 1;
      faceQuad(
        mesh,
        [[A[0], lo, A[1]], [B[0], lo, B[1]], [B[0], hi, B[1]], [A[0], hi, A[1]]],
        na,
        [[u, lo - base], [v, lo - base], [v, hi - base], [u, hi - base]],
        [na, nb, nb, na],
        [ao0, ao0, ao1, ao1],
      );
    }
  }
}
