// Buede døråpninger (DOOR_ARCH i core/doors.js): taket i åpningen står i toppen av buen
// (ceilingAt), og under det lages buens underside – en sylinderflate gjennom åpningen – og
// veggfeltene mellom buen og toppen på begge sider. Veggene på sidene av åpningen går opp til
// toppen, men over vederlaget ligger de bak buen. Ren logikk: MeshData med bakt lys, i
// veggmaterialet (surfaces.js).
import { ceilingAt, floorAt } from '../core/heights.js';
import { doorInfo } from '../core/doors.js';
import { faceQuad } from './mesher.js';

export const SPRING = 2.0; // m over gulvet der buen begynner (vederlaget)
const MIN_RISE = 0.12; // lavt tak: buen blir flatere, men aldri helt flat
const SEGMENTS = 12;
const STRIPS = 4; // undersiden delt gjennom åpningen, så lyset glir fra veggfeltene og innover
const VAULT_SHADE = 0.75; // lyset midt i buen i forhold til kantene
const VAULT_V = 1; // teksturhøyden undersiden får (m): ren tapet, ikke gulvlist

/**
 * Buen i (x, z), eller null: vederlaget (spring), toppen (top), og sirkelen gjennom begge
 * vederlag og toppen – en halvsirkel når det er plass, ellers et flatere segment.
 */
export function archShape(level, x, z) {
  const info = doorInfo(level, x, z);
  if (!info?.arch || info.oneSided) return null;
  const fy = floorAt(level, x, z);
  const top = ceilingAt(level, x, z);
  const spring = Math.min(fy + SPRING, top - MIN_RISE);
  const rise = top - spring;
  const radius = (0.25 + rise * rise) / (2 * rise);
  return { info, fy, spring, top, rise, radius, cy: top - radius, half: Math.asin(Math.min(1, 0.5 / radius)) };
}

/** Punkter langs buen fra a0 til a0 + 1: [a, y, na, ny], der (na, ny) er normalen inn mot åpningen. */
export function archPoints(shape, n = SEGMENTS) {
  const { info, radius, cy, half } = shape;
  const out = [];
  for (let k = 0; k <= n; k++) {
    const phi = -half + (2 * half * k) / n;
    const s = Math.sin(phi);
    const c = Math.cos(phi);
    out.push([info.a0 + 0.5 + radius * s, cy + radius * c, -s, -c]);
  }
  return out;
}

/** Buens underside og veggfeltene over den, i lokale akser (a langs veggen, p gjennom åpningen). */
export function buildArch(mesh, shape) {
  const { info, fy, top } = shape;
  const { p0, pz } = info;
  const at = (a, y, p) => (pz ? [a, y, p] : [p, y, a]);
  const dir = (na, ny, np) => (pz ? [na, ny, np] : [np, ny, na]);
  const pts = archPoints(shape);
  // Undersiden vender ned og får lite direkte lys, så den ville blitt flekkete. I stedet får den
  // lyset fra veggfeltene ved begge kanter (rommene på hver side), blandet gjennom åpningen og litt
  // mørkere midt i – samme lys som feltene ved kantene, så det blir ingen søm.
  const field = mesh.field;
  const vault = field && {
    sample(x, y, z) {
      const a = pz ? x : z;
      const t = (pz ? z : x) - p0;
      const A = field.sample(...at(a, y, p0), ...dir(0, 0, -1));
      const B = field.sample(...at(a, y, p0 + 1), ...dir(0, 0, 1));
      const k = VAULT_SHADE + (1 - VAULT_SHADE) * Math.abs(2 * t - 1);
      return A.map((v, i) => (v * (1 - t) + B[i] * t) * k);
    },
  };
  let arc = 0;
  for (let k = 0; k < pts.length - 1; k++) {
    const [a1, y1, na1, ny1] = pts[k];
    const [a2, y2, na2, ny2] = pts[k + 1];
    const len = Math.hypot(a2 - a1, y2 - y1);
    const mid = dir((na1 + na2) / 2, (ny1 + ny2) / 2, 0);
    mesh.field = vault;
    for (let j = 0; j < STRIPS; j++) {
      const [t0, t1] = [j / STRIPS, (j + 1) / STRIPS];
      const quad = [at(a1, y1, p0 + t0), at(a2, y2, p0 + t0), at(a2, y2, p0 + t1), at(a1, y1, p0 + t1)];
      // v midt på veggen (VAULT_V): nederst i veggteksturen er gulvlisten malt.
      faceQuad(mesh, quad, mid, [[arc, VAULT_V + t0], [arc + len, VAULT_V + t0], [arc + len, VAULT_V + t1], [arc, VAULT_V + t1]]);
    }
    mesh.field = field;
    arc += len;
    // Veggfeltet mellom buen og toppen, på begge sider. u følger nabovegens retning (SIDES i caps.js).
    for (const s of [-1, 1]) {
      const p = s < 0 ? p0 : p0 + 1;
      const u = (a) => a * (pz ? s : -s);
      const face = [at(a1, y1, p), at(a2, y2, p), at(a2, top, p), at(a1, top, p)];
      faceQuad(mesh, face, dir(0, 0, s), [[u(a1), y1 - fy], [u(a2), y2 - fy], [u(a2), top - fy], [u(a1), top - fy]]);
    }
  }
}
