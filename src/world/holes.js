// Runde hull for stiger mellom etasjer (core/ladders.js): gulvet rundt hullet i etasjen over, og i
// etasjen under himlingen rundt hullet og sjakten gjennom etasjeskillet. Ruten er delt i 16 sektorer med
// hjørnene på 45°, så kanten mot naboene er rett. Ren logikk – MeshData med bakt lys (surfaces.js).
import { faceQuad } from './mesher.js';

const N = 16;

/** Punktet på sirkelen (radius r) og på rutekanten i vinkelen a, rundt midten av ruten (cx, cz). */
function points(cx, cz, r, a) {
  const [c, s] = [Math.cos(a), Math.sin(a)];
  const edge = 0.5 / Math.max(Math.abs(c), Math.abs(s));
  return [[cx + 0.5 + c * r, cz + 0.5 + s * r], [cx + 0.5 + c * edge, cz + 0.5 + s * edge]];
}

/** Flaten mellom hullet og rutekanten i høyden y: gulv (up) eller himling. uv = (x, z) som flatene ellers. */
export function holeRing(mesh, cx, cz, y, r, up) {
  for (let k = 0; k < N; k++) {
    const [a0, a1] = [(k * 2 * Math.PI) / N, ((k + 1) * 2 * Math.PI) / N];
    const [[c0, e0], [c1, e1]] = [points(cx, cz, r, a0), points(cx, cz, r, a1)];
    const p = [c0, c1, e1, e0].map(([x, z]) => [x, y, z]);
    faceQuad(mesh, p, [0, up ? 1 : -1, 0], p.map(([x, , z]) => [x, z]));
  }
}

/** Sjakten (sylinder, vendt innover) gjennom etasjeskillet fra y0 til y1. */
export function holeShaft(mesh, cx, cz, r, y0, y1) {
  for (let k = 0; k < N; k++) {
    const [a0, a1] = [(k * 2 * Math.PI) / N, ((k + 1) * 2 * Math.PI) / N];
    const [[c0], [c1]] = [points(cx, cz, r, a0), points(cx, cz, r, a1)];
    const am = (a0 + a1) / 2;
    const p = [[c0[0], y0, c0[1]], [c1[0], y0, c1[1]], [c1[0], y1, c1[1]], [c0[0], y1, c0[1]]];
    const inward = (a) => [-Math.cos(a), 0, -Math.sin(a)];
    faceQuad(mesh, p, inward(am), [[a0 * r, y0], [a1 * r, y0], [a1 * r, y1], [a0 * r, y1]], [inward(a0), inward(a1), inward(a1), inward(a0)]);
  }
}
