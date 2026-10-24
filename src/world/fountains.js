// Sammenhengende steinkant rundt dekorbassengene, med en smal messinglist mot vannet.
// Kanten holder seg innenfor vannrutene, så gangarealet rundt bassenget er uendret.
import { TILE } from '../core/level.js';
import { FOUNTAIN_RIM, fountainRimAt } from '../core/fountains.js';
import { MeshData, faceQuad } from './mesher.js';

export function buildFountains(level, field) {
  const out = { fountainStone: new MeshData(field), fountainTrim: new MeshData(field) };
  if (level.theme !== 'mall') return out;
  const { width: w, height: y, bottom } = FOUNTAIN_RIM;
  const cuts = [0, w, 1 - w, 1];
  const rim = (x, z) => fountainRimAt(level, x, z) !== null;
  const quad = (mesh, points, n, wall = false) => faceQuad(mesh, points, n,
    points.map((p) => wall ? [n[0] ? p[2] : p[0], p[1]] : [p[0], p[2]]));
  for (let i = 0; i < level.tiles.length; i++) {
    if (level.tiles[i] !== TILE.WATER) continue;
    const x = i % level.w, z = Math.floor(i / level.w);
    // 3 × 3 delruter lar to kanter møtes uten overlappende hjørner eller doble toppflater.
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
      const [x0, x1, z0, z1] = [x + cuts[a], x + cuts[a + 1], z + cuts[b], z + cuts[b + 1]];
      const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      if (!rim(mx, mz)) continue;
      quad(out.fountainStone, [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], [0, 1, 0]);
      const sides = [
        { p: [[x0, z0], [x0, z1]], n: [-1, 0, 0], outside: [x0 - 0.001, mz] },
        { p: [[x1, z0], [x1, z1]], n: [1, 0, 0], outside: [x1 + 0.001, mz] },
        { p: [[x0, z0], [x1, z0]], n: [0, 0, -1], outside: [mx, z0 - 0.001] },
        { p: [[x0, z1], [x1, z1]], n: [0, 0, 1], outside: [mx, z1 + 0.001] },
      ];
      for (const { p: [A, B], n, outside } of sides) {
        if (rim(...outside)) continue;
        const wall = (y0, y1, offset = 0) => [[A[0] + n[0] * offset, y0, A[1] + n[2] * offset],
          [B[0] + n[0] * offset, y0, B[1] + n[2] * offset],
          [B[0] + n[0] * offset, y1, B[1] + n[2] * offset], [A[0] + n[0] * offset, y1, A[1] + n[2] * offset]];
        quad(out.fountainStone, wall(bottom, y), n, true);
        quad(out.fountainTrim, wall(0.035, 0.05, 0.001), n, true);
      }
    }
  }
  return out;
}
