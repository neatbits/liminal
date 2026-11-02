// Innredning av enkle former (core/object-catalog-rooms.js), forsiden mot +z og bunnen i y = 0:
// nattbord, toalett, vask, vaskemaskin, kopimaskin, arkivhyller, heisdører og rammen til glassvegger.
import { box, cylinder, parts } from './props-geo.js';
import { HALF_WALL, GLASS_WALL } from '../core/half-walls.js';

const WHITE = '#e8e8e2';
const STEEL = '#9aa0a4';
const DARK = '#2c2e31';

export function nightstand() {
  const [w, h, d] = [0.46, 0.55, 0.42];
  return parts([
    { color: '#5a3a22', geoms: [box(w, 0.42, d, 0, 0.34, 0), box(w + 0.02, 0.025, d + 0.02, 0, h - 0.0125, 0),
      ...[-1, 1].flatMap((x) => [-1, 1].map((z) => box(0.04, 0.13, 0.04, x * (w / 2 - 0.03), 0.065, z * (d / 2 - 0.03))))] },
    { color: '#6d4a2e', geoms: [box(w - 0.05, 0.16, 0.012, 0, 0.44, d / 2 + 0.002), box(w - 0.05, 0.16, 0.012, 0, 0.25, d / 2 + 0.002)] },
    { color: '#c9a45a', geoms: [box(0.08, 0.012, 0.02, 0, 0.44, d / 2 + 0.015), box(0.08, 0.012, 0.02, 0, 0.25, d / 2 + 0.015)] },
  ]);
}

/** Firkanten på lagerveggen i Noclip: en tegnet ramme som en dør, med skrå streker innenfor (som kritt eller tusj). */
export function noclipmark() {
  const [w, h, t] = [1, 2.1, 0.035];
  const lines = [box(w, t, 0.01, 0, t / 2, 0), box(w, t, 0.01, 0, h - t / 2, 0), box(t, h, 0.01, -w / 2 + t / 2, h / 2, 0), box(t, h, 0.01, w / 2 - t / 2, h / 2, 0)];
  const len = Math.hypot(w - 2 * t, w - 2 * t);
  for (let y = 0.1 + w / 2; y <= h - w / 2 - 0.05; y += 0.24) lines.push(box(len, t * 0.8, 0.01, 0, 0, 0).rotateZ(Math.PI / 4).translate(0, y, 0.001));
  return parts([{ color: '#2e2b27', geoms: lines }]);
}

/** Et mørkt vindu inn til et rom uten lys: brun karm og nesten svart glass (hallene i Level 0). */
export function darkwindow() {
  const [w, h] = [1.6, 1.05];
  return parts([
    { color: '#4a3c2c', geoms: [box(w, 0.07, 0.08, 0, 0.035, 0), box(w, 0.07, 0.08, 0, h - 0.035, 0), box(0.07, h, 0.08, -w / 2 + 0.035, h / 2, 0), box(0.07, h, 0.08, w / 2 - 0.035, h / 2, 0)] },
    { color: '#1b1d1f', geoms: [box(w - 0.12, h - 0.12, 0.01, 0, h / 2, -0.01)] },
    { color: '#6b7275', geoms: [box(w - 0.1, 0.03, 0.06, 0, 0.05, 0.03)] },
  ]);
}

/** Ventil i gulvet: en flat, mørk rist. */
export function floorvent() {
  const slats = Array.from({ length: 5 }, (_, k) => box(0.26, 0.006, 0.012, 0, 0.009, -0.05 + k * 0.025));
  return parts([
    { color: '#3a3833', geoms: [box(0.3, 0.006, 0.14, 0, 0.003, 0)] },
    { color: '#6a665c', geoms: slats },
  ]);
}

/** Speilet over vasken på bad og toaletter (vasken selv er en modell). */
export function mirror() {
  return parts([
    { color: '#aebabd', geoms: [box(0.52, 0.72, 0.012, 0, 0.38, 0.004)] },
    { color: DARK, geoms: [box(0.56, 0.76, 0.008, 0, 0.38, -0.006)] },
  ]);
}

export function copier() {
  return parts([
    { color: '#d4d3cc', geoms: [box(0.8, 0.86, 0.68, 0, 0.47, 0), box(0.8, 0.14, 0.62, 0, 0.98, -0.03)] },
    { color: '#6c7074', geoms: [box(0.72, 0.03, 0.56, 0, 1.065, -0.03), box(0.74, 0.012, 0.012, 0, 0.24, 0.345), box(0.74, 0.012, 0.012, 0, 0.44, 0.345), box(0.74, 0.012, 0.012, 0, 0.64, 0.345)] },
    { color: DARK, geoms: [box(0.7, 0.04, 0.6, 0, 0.02, 0), box(0.3, 0.06, 0.15, 0.2, 1.1, 0.24)] },
    { color: '#79c2a0', unlit: true, geoms: [box(0.1, 0.03, 0.005, 0.2, 1.115, 0.318)] },
  ]);
}

export function archiveshelf() {
  const [w, h, d] = [1.9, 2.05, 0.5];
  const levels = [0.1, 0.5, 0.9, 1.3, 1.7];
  const cardboard = [[], []];
  levels.forEach((y, k) => {
    for (let i = 0; i < 5; i++) {
      if ((k * 3 + i * 7) % 6 === 5) continue; // noen hull
      const lean = ((k * 5 + i * 3) % 4) * 0.02;
      cardboard[(k + i) % 2].push(box(0.32, 0.26 + lean, 0.36, -0.72 + i * 0.36, y + 0.15 + lean / 2, 0));
    }
  });
  return parts([
    { color: '#5d6266', geoms: [...[-1, 1].flatMap((x) => [-1, 1].map((z) => box(0.04, h, 0.04, x * (w / 2 - 0.02), h / 2, z * (d / 2 - 0.02)))),
      ...levels.map((y) => box(w, 0.025, d, 0, y, 0))] },
    { color: '#a58a60', geoms: cardboard[0] },
    { color: '#8f7650', geoms: cardboard[1] },
  ]);
}

export function elevator() {
  const [w, h] = [1.7, 2.22];
  return parts([
    { color: '#6e7377', geoms: [box(0.12, h, 0.08, -w / 2 + 0.06, h / 2, 0), box(0.12, h, 0.08, w / 2 - 0.06, h / 2, 0), box(w, 0.14, 0.08, 0, h - 0.07, 0)] },
    { color: '#a5abae', geoms: [box(0.72, 2.06, 0.03, -0.365, 1.03, 0.005), box(0.72, 2.06, 0.03, 0.365, 1.03, 0.005)] },
    { color: DARK, geoms: [box(0.012, 2.06, 0.034, 0, 1.03, 0.006), box(w - 0.24, 0.02, 0.09, 0, 0.01, 0.01)] },
    { color: '#ffb35a', unlit: true, geoms: [box(0.2, 0.05, 0.005, 0, h - 0.07, 0.042)] },
  ]);
}

/** Rammen; selve glasset tegnes av world/glass-walls.js (gjennomsiktig, tegnes for seg). */
export function glasswall() {
  const { width: w } = HALF_WALL;
  const { height: h, depth: d } = GLASS_WALL;
  return parts([{ color: '#7b8186', geoms: [
    box(w, 0.08, d, 0, 0.04, 0), box(w, 0.05, d, 0, h - 0.025, 0),
    ...[-1.47, -0.5, 0.5, 1.47].map((x) => box(0.05, h, d, x, h / 2, 0)),
  ] }]);
}
