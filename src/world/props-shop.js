// Butikkinnredning for kjøpesenteret, bygget av enkle former: tomme hyllereoler (tosidige, midt i
// rommet), tomme veggreoler og en butikkskranke med kasseapparat. Forsiden mot +z.
import { box, parts } from './props-geo.js';

const METAL = '#d8d8d2';
const DARK = '#4a4c4e';

/** Tosidig hyllereol, 2 × 0,9 m, 1,6 m høy: midtplate, fire tomme hyller på hver side. */
export function shelf() {
  const W = 2;
  const shelves = [];
  for (const y of [0.12, 0.5, 0.88, 1.26]) for (const s of [-1, 1]) shelves.push(box(W, 0.03, 0.38, 0, y, s * 0.23));
  return parts([
    { color: METAL, geoms: [box(W, 1.6, 0.05, 0, 0.8, 0), ...shelves] },
    { color: DARK, geoms: [box(0.05, 1.62, 0.9, -W / 2, 0.81, 0), box(0.05, 1.62, 0.9, W / 2, 0.81, 0), box(W, 0.1, 0.86, 0, 0.05, 0)] },
  ]);
}

/** Veggreol, 2 × 0,45 m, 2 m høy: bakplate og fem tomme hyller. */
export function wallshelf() {
  const W = 2;
  const shelves = [0.15, 0.55, 0.95, 1.35, 1.75].map((y) => box(W - 0.08, 0.03, 0.4, 0, y, 0.02));
  return parts([
    { color: METAL, geoms: [box(W, 2, 0.04, 0, 1, -0.205), ...shelves] },
    { color: DARK, geoms: [box(0.04, 2, 0.45, -W / 2 + 0.02, 1, 0), box(0.04, 2, 0.45, W / 2 - 0.02, 1, 0)] },
  ]);
}

/** Butikkskranke, 1,8 × 0,7 m: disk med lys front, benkeplate og et kasseapparat. */
export function counter() {
  return parts([
    { color: '#e8e2d2', geoms: [box(1.8, 0.95, 0.66, 0, 0.475, 0)] },
    { color: '#6b5a48', geoms: [box(1.86, 0.05, 0.72, 0, 0.975, 0)] },
    { color: '#2c2d2f', geoms: [box(0.4, 0.14, 0.32, 0.45, 1.07, -0.08), box(0.3, 0.16, 0.04, 0.45, 1.2, -0.2), box(1.8, 0.08, 0.05, 0, 0.04, 0.31)] },
  ]);
}
