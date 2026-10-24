// Vinduer i 3D: lysning (karm) rundt åpningen, glass med himmel og sprosser, og solflekker på
// gulvet. Veggflaten rundt åpningen bygges i surfaces.js. Ren logikk – materialene (himmel og
// sol) lages i build.js.
import { sunPatch, skyOf, FRAME } from '../core/windows.js';
import { windowPanes } from '../core/window-panes.js';
import { getTheme } from '../core/themes.js';
import { MeshData, faceQuad, orientedBox } from './mesher.js';

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
  const style = getTheme(level.theme).window;
  const bars = style?.bars === true;
  const depth = style?.depth ?? DEPTH;
  for (const win of windowPanes(level)) {
    const a = (win.width ?? 1) / 2 - (style?.inset ?? FRAME / 2);
    const [nx, nz] = win.n;
    const [ux, uz] = [-nz, nx];
    const fx = win.x + 0.5 + nx * 0.5;
    const fz = win.z + 0.5 + nz * 0.5;
    // Punkt i åpningen: s langs veggen, d inn i veggen (bort fra rommet), høyde y.
    const P = (s, d, y) => [fx + ux * s - nx * d, y, fz + uz * s - nz * d];
    const { sill, head } = win;
    faceQuad(out.glass, [P(-a, depth, sill), P(a, depth, sill), P(a, depth, head), P(-a, depth, head)], [nx, 0, nz], UV);
    faceQuad(out.frame, [P(-a, 0, sill), P(-a, depth, sill), P(-a, depth, head), P(-a, 0, head)], [ux, 0, uz]);
    faceQuad(out.frame, [P(a, 0, sill), P(a, depth, sill), P(a, depth, head), P(a, 0, head)], [-ux, 0, -uz]);
    faceQuad(out.frame, [P(-a, 0, sill), P(a, 0, sill), P(a, depth, sill), P(-a, depth, sill)], [0, 1, 0]);
    faceQuad(out.frame, [P(-a, 0, head), P(a, 0, head), P(a, depth, head), P(-a, depth, head)], [0, -1, 0]);
    // Tredimensjonal ramme og sprosser; alt samles i én mesh for hele rommet.
    const box = (s0, s1, y0, y1, d0, d1) => orientedBox(out.frame,
      [fx + ux * s0, fz + uz * s0], [ux, uz], s1 - s0, [-nx, -nz], d0, d1, y0, y1);
    const rim = style?.flush ? 0.018 : 0.035;
    const front = style?.flush ? 0 : -0.025;
    box(-a - rim, -a + rim, sill - rim, head + rim, front, 0.025);
    box(a - rim, a + rim, sill - rim, head + rim, front, 0.025);
    box(-a, a, head - rim, head + rim, front, 0.025);
    if (style?.flush) box(-a, a, sill - rim, sill + rim, 0, 0.025);
    else box(-a - 0.06, a + 0.06, sill - 0.055, sill + 0.015, -0.12, depth);
    if (bars) {
      const mid = (sill + head) / 2;
      box(-0.015, 0.015, sill, head, DEPTH - 0.045, DEPTH - 0.01);
      box(-a, a, mid - 0.018, mid + 0.018, DEPTH - 0.045, DEPTH - 0.01);
    }
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
