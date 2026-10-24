import { mallRoof, roofHeight } from '../core/mall-roof.js';
import { MeshData, faceQuad } from './mesher.js';
import { beam } from './railings.js';

export function buildMallRoof(level, field) {
  const out = {
    mallRoofGlass: new MeshData(null),
    mallRoofFrame: new MeshData(field),
    mallRoofGlow: new MeshData(null),
  };
  const r = mallRoof(level);
  if (!r) return out;
  const P = (x, z) => [x, roofHeight(r, z), z];
  const mid = (r.z0 + r.z1) / 2;
  const inside = (x, z) => r.mask[Math.floor(z) * level.w + Math.floor(x)] === 1;
  for (let z = r.z0; z < r.z1; z++)
    for (let x = r.x0; x < r.x1; x++) {
      if (!inside(x + 0.5, z + 0.5)) continue;
      const cuts = [z, ...(mid > z && mid < z + 1 ? [mid] : []), z + 1];
      for (let k = 0; k < cuts.length - 1; k++) {
        const a = cuts[k], b = cuts[k + 1];
        faceQuad(
          out.mallRoofGlass,
          [P(x, a), P(x + 1, a), P(x + 1, b), P(x, b)],
          [0, -1, 0],
          [[x / 8, a / 6], [(x + 1) / 8, a / 6], [(x + 1) / 8, b / 6], [x / 8, b / 6]],
        );
      }
      // Glass gables close the raised roof where the ordinary ceiling ends.
      for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        if (inside(x + 0.5 + dx, z + 0.5 + dz)) continue;
        const a = dx ? [x + (dx > 0 ? 1 : 0), z] : [x, z + (dz > 0 ? 1 : 0)];
        const b = dx ? [a[0], z + 1] : [x + 1, a[1]];
        if (roofHeight(r, a[1]) + roofHeight(r, b[1]) <= 2 * r.base + 0.001) continue;
        faceQuad(
          out.mallRoofGlass,
          [[a[0], r.base, a[1]], [b[0], r.base, b[1]], P(...b), P(...a)],
          [-dx, 0, -dz],
        );
      }
    }
  const ribs = [];
  for (let x = r.x0; x < r.x1; x += 3) ribs.push(x);
  ribs.push(r.x1);
  for (const x of ribs) {
    beam(out.mallRoofFrame, P(x, r.z0), P(x, mid), 0.14, 0.18);
    beam(out.mallRoofFrame, P(x, mid), P(x, r.z1), 0.14, 0.18);
  }
  // Close each triangular gable at ceiling height, joining both sloping rafters.
  for (const x of [r.x0, r.x1]) {
    beam(out.mallRoofFrame, [x, r.base, r.z0 - 0.08], [x, r.base, r.z1 + 0.08], 0.2, 0.24);
  }
  for (const z of [r.z0, mid, r.z1]) beam(out.mallRoofFrame, P(r.x0, z), P(r.x1, z), 0.1, 0.14);
  for (let z = r.z0 + 2; z < r.z1; z += 2)
    if (Math.abs(z - mid) > 0.1) beam(out.mallRoofFrame, P(r.x0, z), P(r.x1, z), 0.035, 0.055);
  for (const z of [r.z0, r.z1])
    beam(out.mallRoofGlow, [r.x0, r.base - 0.04, z], [r.x1, r.base - 0.04, z], 0.035, 0.035);
  return out;
}
