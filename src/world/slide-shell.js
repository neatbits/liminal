// Renne og rørtak med samme profil langs banen. Taket starter med en bue i ett tverrsnitt,
// i stedet for at sidekantene trekkes sammen til en spiss på toppen av røret.
import { SLIDE } from '../core/slides.js';
import { faceQuad } from './mesher.js';

export const WALL = 0.05;
export const SEGMENTS = 22;
export const TUBE_START = SLIDE.ENTRY + 0.3;
const ROOF_SEGMENTS = 10;
const add = (a, b, k = 1) => a.map((v, i) => v + b[i] * k);
const norm = (v) => {
  const len = Math.hypot(...v) || 1;
  return v.map((c) => c / len);
};
const outward = (f, a) => norm(add(f.side.map((v) => v * Math.sin(a)), f.up, -Math.cos(a)));
const ring = (f, a, r) => add(f.centre, outward(f, a), r);

/** Begge sider av et skallstykke, med glatte normaler for det bakte lyset. */
function panel(out, f0, f1, a0, b0, a1, b1) {
  const corners = [[f0, a0], [f0, b0], [f1, b1], [f1, a1]];
  const dirs = corners.map(([f, a]) => outward(f, a));
  const pts = (r) => corners.map(([f, a]) => ring(f, a, r));
  const mid = norm(dirs.reduce((sum, d) => add(sum, d), [0, 0, 0]));
  faceQuad(out.slideIn, pts(SLIDE.RADIUS), mid.map((v) => -v), undefined, dirs.map((d) => d.map((v) => -v)));
  faceQuad(out.slideOut, pts(SLIDE.RADIUS + WALL), mid, undefined, dirs);
}

/**
 * spans er den åpne rennens profil, også under rørtaket. roofStart er første lukkede ring,
 * eller -1 for åpen renne. Profilens endepunkter deles nøyaktig mellom renne og tak.
 */
export function buildShell(out, frames, spans, roofStart = -1) {
  const R = SLIDE.RADIUS;
  const angle = (i, j) => -spans[i] + 2 * spans[i] * j / SEGMENTS;
  // Bruk nøyaktig samme endevinkler som rennen, uten avrundingsforskjell fra 2π.
  const roofAngle = (i, j) => j === ROOF_SEGMENTS ? angle(i, 0)
    : j === 0 ? angle(i, SEGMENTS) : spans[i] + (2 * Math.PI - 2 * spans[i]) * j / ROOF_SEGMENTS;
  for (let i = 0; i + 1 < frames.length; i++) {
    const [f0, f1] = [frames[i], frames[i + 1]];
    for (let j = 0; j < SEGMENTS; j++) panel(out, f0, f1, angle(i, j), angle(i, j + 1), angle(i + 1, j), angle(i + 1, j + 1));
    if (roofStart >= 0 && i >= roofStart) {
      for (let j = 0; j < ROOF_SEGMENTS; j++) panel(out, f0, f1, roofAngle(i, j), roofAngle(i, j + 1), roofAngle(i + 1, j), roofAngle(i + 1, j + 1));
    } else {
      // Godstykkelsen langs de to frie kantene stopper der røråpningens bue begynner.
      for (const sign of [-1, 1]) {
        const [a0, a1] = [sign * spans[i], sign * spans[i + 1]];
        faceQuad(out.slideOut, [ring(f0, a0, R), ring(f0, a0, R + WALL), ring(f1, a1, R + WALL), ring(f1, a1, R)], norm(add(f0.up, f0.side, sign * 0.3)));
      }
    }
  }
  if (roofStart < 0) return;
  const f = frames[roofStart];
  // Synlig 5 cm kant rundt takbuen, vendt mot inngangen. Selve åpningen forblir fri.
  const front = [f.up[1] * f.side[2] - f.up[2] * f.side[1], f.up[2] * f.side[0] - f.up[0] * f.side[2], f.up[0] * f.side[1] - f.up[1] * f.side[0]];
  for (let j = 0; j < ROOF_SEGMENTS; j++) {
    const [a, b] = [roofAngle(roofStart, j), roofAngle(roofStart, j + 1)];
    faceQuad(out.slideOut, [ring(f, a, R), ring(f, b, R), ring(f, b, R + WALL), ring(f, a, R + WALL)], front);
  }
}
