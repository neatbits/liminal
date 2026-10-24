// Beslagene på dørene (world/doors.js): vridere med rosett og nøkkelskilt, runde dørknotter,
// hengsler og sparkeplate – dreid av profiler (lathe) med myke normaler. Ren logikk: lager
// MeshData med bakt lys, som resten av dørene.
import { faceQuad, orientedBox } from './mesher.js';

const SEG = 12;

/**
 * Dreier profilen [[h, r], …] (h langs aksen, r ut fra den) rundt aksen fra origo. b og c står
 * vinkelrett på aksen og på hverandre. Normalene er myke rundt, flate langs profilen.
 */
export function lathe(mesh, origin, axis, b, c, profile, seg = SEG) {
  const at = (h, r, a) => [0, 1, 2].map((k) => origin[k] + axis[k] * h + (b[k] * Math.cos(a) + c[k] * Math.sin(a)) * r);
  for (let i = 0; i + 1 < profile.length; i++) {
    const [h0, r0] = profile[i];
    const [h1, r1] = profile[i + 1];
    const len = Math.hypot(h1 - h0, r1 - r0) || 1;
    const [dh, dr] = [(h1 - h0) / len, (r1 - r0) / len];
    for (let s = 0; s < seg; s++) {
      const a0 = (s / seg) * Math.PI * 2;
      const a1 = ((s + 1) / seg) * Math.PI * 2;
      const n = (a) => [0, 1, 2].map((k) => (b[k] * Math.cos(a) + c[k] * Math.sin(a)) * dh - axis[k] * dr);
      const mid = n((a0 + a1) / 2);
      faceQuad(mesh, [at(h0, r0, a0), at(h0, r0, a1), at(h1, r1, a1), at(h1, r1, a0)], mid, undefined, [n(a0), n(a1), n(a1), n(a0)]);
    }
  }
}

// Profilene, målt fra dørbladet og ut (m).
const ROSE = [[0, 0.027], [0.005, 0.027], [0.008, 0.022], [0.009, 0.011], [0.046, 0.0095], [0.05, 0.011], [0.062, 0.011], [0.064, 0]];
const KEYHOLE = [[0, 0.016], [0.004, 0.016], [0.006, 0.012], [0.0065, 0]];
const KNOB = [[0, 0.03], [0.006, 0.03], [0.01, 0.024], [0.012, 0.011], [0.03, 0.01], [0.037, 0.019], [0.046, 0.026], [0.057, 0.028], [0.067, 0.024], [0.073, 0.014], [0.075, 0]];
const HINGE = [[0, 0], [0.004, 0.011], [0.086, 0.011], [0.09, 0]];

/**
 * Håndtak på begge sider av bladet. o = hengselhjørnet, u = langs bladet (fra hengslet), t = gjennom
 * bladet, thick = bladtykkelsen, s = avstand fra hengslet, y = høyden. kind: 'lever' | 'knob'.
 */
export function handles(mesh, kind, o, u, t, thick, s, y) {
  const up = [0, 1, 0];
  for (const side of [1, -1]) {
    const axis = [t[0] * side, 0, t[1] * side];
    const across = [u[0], 0, u[1]];
    const base = (ds, dy) => [o[0] + u[0] * ds + axis[0] * (thick / 2), y + dy, o[1] + u[1] * ds + axis[2] * (thick / 2)];
    if (kind === 'knob') {
      lathe(mesh, base(s, 0), axis, across, up, KNOB);
      continue;
    }
    lathe(mesh, base(s, 0), axis, across, up, ROSE);
    lathe(mesh, base(s, -0.085), axis, across, up, KEYHOLE);
    // Armen peker mot hengslet: fra rosetten og 13 cm innover, litt avrundet i enden.
    const tv = [axis[0], axis[2]];
    const back = [-u[0], -u[1]];
    const start = [o[0] + u[0] * (s + 0.006), o[1] + u[1] * (s + 0.006)]; // enden skjules i halsen
    const t0 = thick / 2 + 0.046;
    orientedBox(mesh, start, back, 0.124, tv, t0, t0 + 0.017, y - 0.009, y + 0.009);
    const tip = [o[0] + u[0] * (s - 0.118), o[1] + u[1] * (s - 0.118)];
    orientedBox(mesh, tip, back, 0.012, tv, t0 + 0.002, t0 + 0.015, y - 0.012, y + 0.007);
  }
}

/** Tre hengsler på hengselkanten, på siden bladet slår ut mot (sign = ±1 langs t). */
export function hinges(mesh, o, t, thick, sign, fy, height) {
  const x = o[0] + t[0] * sign * (thick / 2 + 0.006);
  const z = o[1] + t[1] * sign * (thick / 2 + 0.006);
  for (const h of [0.2, height / 2, height - 0.29]) lathe(mesh, [x, fy + h, z], [0, 1, 0], [1, 0, 0], [0, 0, 1], HINGE, 8);
}

/** Sparkeplate i stål nederst på begge sider av bladet. */
export function kickPlates(mesh, o, u, w, t, thick, fy) {
  const start = [o[0] + u[0] * 0.03, o[1] + u[1] * 0.03];
  orientedBox(mesh, start, u, w - 0.06, t, thick / 2, thick / 2 + 0.002, fy + 0.04, fy + 0.27);
  orientedBox(mesh, start, u, w - 0.06, t, -thick / 2 - 0.002, -thick / 2, fy + 0.04, fy + 0.27);
}
