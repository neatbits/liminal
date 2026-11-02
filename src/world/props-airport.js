// Flyplassterminalen av enkle former (core/object-catalog-airport.js), forsiden mot +z og bunnen i y = 0: avgangstavle på
// fot, bagasjebånd, kø-sperre, innsjekkingsskranke med vekt og bagasjetralle. Tekst er bare lysende streker (ingen skrift).
import { box, cylinder, parts } from './props-geo.js';

const STEEL = '#9ea5aa';
const DARK = '#24272b';

/** Avgangstavle på to stolper: svart skjerm med rader av gule «tekstlinjer», noen røde (forsinket). */
export function fids() {
  const [w, h, y] = [1.4, 0.82, 1.85];
  const amber = [];
  const red = [];
  for (let r = 0; r < 7; r++) {
    const ry = y + h / 2 - 0.1 - r * 0.1;
    [[0.36, -0.46], [0.22, -0.12], [0.3, 0.2], [0.14, 0.5]].forEach(([len, x], c) => {
      const cut = ((r * 5 + c * 3) % 4) * 0.03;
      (c === 3 && r % 3 !== 1 ? red : amber).push(box(len - cut, 0.035, 0.005, x + (len - cut) / 2 - 0.12, ry, 0.046));
    });
  }
  return parts([
    { color: STEEL, geoms: [box(0.07, y + h / 2, 0.07, -0.55, (y + h / 2) / 2, -0.05), box(0.07, y + h / 2, 0.07, 0.55, (y + h / 2) / 2, -0.05), box(1.3, 0.04, 0.3, 0, 0.02, -0.05)] },
    { color: DARK, geoms: [box(w + 0.06, h + 0.06, 0.09, 0, y, 0)] },
    { color: '#0b0c0e', geoms: [box(w, h, 0.01, 0, y, 0.045)] },
    { color: '#ffbe4a', unlit: true, geoms: amber },
    { color: '#ff5a46', unlit: true, geoms: red },
  ]);
}

/** Bagasjebånd: en lang løkke med avrundede ender, metallkant og en midtøy – og én koffert som ingen hentet. */
export function carousel() {
  const [L, W] = [3.6, 2.4];
  const end = (r, h, y, x) => cylinder(r, h, x, y, 0, 24);
  return parts([
    { color: '#3b3f44', geoms: [box(L, 0.42, W, 0, 0.21, 0), end(W / 2, 0.42, 0.21, -L / 2), end(W / 2, 0.42, 0.21, L / 2)] },
    { color: '#5d6267', geoms: [box(L, 0.04, W - 0.1, 0, 0.44, 0), end(W / 2 - 0.05, 0.04, 0.44, -L / 2), end(W / 2 - 0.05, 0.04, 0.44, L / 2)] },
    { color: STEEL, geoms: [box(L, 0.3, 0.9, 0, 0.6, 0), end(0.45, 0.3, 0.6, -L / 2), end(0.45, 0.3, 0.6, L / 2)] },
    { color: '#7b2f2a', geoms: [box(0.5, 0.26, 0.3, 0.9, 0.59, 0.8)] },
  ]);
}

/** Kø-sperre: to stolper med fot og et blått bånd imellom. */
export function stanchion() {
  const posts = [-0.45, 0.45].flatMap((x) => [cylinder(0.025, 0.95, x, 0.475, 0, 10), cylinder(0.15, 0.03, x, 0.015, 0, 16)]);
  return parts([
    { color: STEEL, geoms: posts },
    { color: '#2a4f9a', geoms: [box(0.88, 0.05, 0.012, 0, 0.9, 0)] },
  ]);
}

/** Innsjekkingsskranke: disk med skjerm og et lite bagasjebånd med vekt ved siden av. */
export function checkin() {
  return parts([
    { color: '#d8dadb', geoms: [box(1.8, 1.05, 0.8, -0.4, 0.525, 0), box(1.84, 0.04, 0.86, -0.4, 1.07, 0)] },
    { color: '#4a6d8f', geoms: [box(1.8, 0.16, 0.01, -0.4, 0.86, 0.405)] },
    { color: DARK, geoms: [box(0.4, 0.3, 0.04, -0.4, 1.28, -0.2), box(0.08, 0.14, 0.08, -0.4, 1.15, -0.22), box(0.75, 0.22, 0.9, 0.9, 0.11, 0)] },
    { color: '#6a6f74', geoms: [box(0.7, 0.03, 0.86, 0.9, 0.24, 0)] },
    { color: '#79c2a0', unlit: true, geoms: [box(0.34, 0.22, 0.005, -0.4, 1.28, -0.178)] },
  ]);
}

/** Bagasjetralle: rammen, en skrå bunnplate og håndtaket bak. */
export function luggagecart() {
  return parts([
    { color: STEEL, geoms: [box(0.03, 0.95, 0.03, -0.27, 0.48, -0.42), box(0.03, 0.95, 0.03, 0.27, 0.48, -0.42), box(0.6, 0.04, 0.04, 0, 0.94, -0.44),
      box(0.03, 0.03, 0.9, -0.27, 0.18, 0), box(0.03, 0.03, 0.9, 0.27, 0.18, 0)] },
    { color: '#7e858a', geoms: [box(0.56, 0.02, 0.85, 0, 0.2, 0.02)] },
    { color: DARK, geoms: [-1, 1].flatMap((x) => [-1, 1].map((z) => cylinder(0.06, 0.04, 0, 0, 0, 10).rotateZ(Math.PI / 2).translate(x * 0.25, 0.06, z * 0.38))) },
  ]);
}
