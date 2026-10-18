// Vinduer i 3D: lysning (karm) rundt åpningen, glass med himmel og sprosser, og solflekker på
// gulvet. Veggflaten rundt åpningen bygges i surfaces.js. Ren logikk – materialene (himmel og
// sol) lages i build.js.
import { windows, sunPatch, skyOf, FRAME } from '../core/windows.js';
import { MeshData, faceQuad } from './mesher.js';

const DEPTH = 0.14; // hvor langt inn i veggen glasset sitter
const UV = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

/** @returns {{ glass, frame, sun }} MeshData: glass og sol uten bakt lys, karmen med. */
export function buildWindows(level, field) {
  const out = { glass: new MeshData(null), frame: new MeshData(field), sun: new MeshData(null) };
  const sky = skyOf(level);
  const a = 0.5 - FRAME / 2;
  for (const win of windows(level)) {
    const [nx, nz] = win.n;
    const [ux, uz] = [-nz, nx];
    const fx = win.x + 0.5 + nx * 0.5;
    const fz = win.z + 0.5 + nz * 0.5;
    // Punkt i åpningen: s langs veggen, d inn i veggen (bort fra rommet), høyde y.
    const P = (s, d, y) => [fx + ux * s - nx * d, y, fz + uz * s - nz * d];
    const { sill, head } = win;
    faceQuad(out.glass, [P(-a, DEPTH, sill), P(a, DEPTH, sill), P(a, DEPTH, head), P(-a, DEPTH, head)], [nx, 0, nz], UV);
    faceQuad(out.frame, [P(-a, 0, sill), P(-a, DEPTH, sill), P(-a, DEPTH, head), P(-a, 0, head)], [ux, 0, uz]);
    faceQuad(out.frame, [P(a, 0, sill), P(a, DEPTH, sill), P(a, DEPTH, head), P(a, 0, head)], [-ux, 0, -uz]);
    faceQuad(out.frame, [P(-a, 0, sill), P(a, 0, sill), P(a, DEPTH, sill), P(-a, DEPTH, sill)], [0, 1, 0]);
    faceQuad(out.frame, [P(-a, 0, head), P(a, 0, head), P(a, DEPTH, head), P(-a, DEPTH, head)], [0, -1, 0]);
    const patch = sunPatch(level, win, sky.sun);
    if (patch) {
      const y = win.floor + 0.004;
      const pts = patch.points.map(([x, z]) => [x, y, z]);
      faceQuad(out.sun, pts, [0, 1, 0], [
        [0, 0],
        [1, 0],
        [1, patch.top],
        [0, patch.top],
      ]);
    }
  }
  return out;
}
