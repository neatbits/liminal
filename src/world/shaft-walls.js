// Veggene rundt en sjakt i etasjen over (trapperom og sklier ned, core/storey-seams.js). Innsiden av
// sjakten er veggene i etasjen under, som går opp gjennom etasjeskillet; uten mer ville veggen mellom
// sjakten og rommet der oppe vært uendelig tynn. Her flyttes etasjen overs veggflater THICK ut i rommet,
// med endeflater der veggen slutter, og inngangen fra åpningen (reposet, toppen av sklien) får en bue
// i en like tykk vegg. Kollisjonen er uendret (rutekanten). Ren logikk: MeshData (surfaces.js).
import { TILE, ARCH_TOP, getTile } from '../core/level.js';
import { floorAt, ceilingAt } from '../core/heights.js';
import { faceQuad } from './mesher.js';
import { archCurve, buildArch } from './arches.js';

export const THICK = 0.1;

const shaftAt = (level, x, z) => getTile(level, x, z) === TILE.WALL && !!level.seams?.shaft?.has(z * level.w + x);

/**
 * Veggen på side s av rute (cx, cz) når naboen er sjakt: { L, R, extL, extR, caps }, ellers null.
 * L/R er flyttet THICK inn i ruten og forlenget THICK der sjakten har et utvendig hjørne; caps er
 * endeflatene der den tykke veggen slutter ({ A, B, n }).
 */
export function shaftWall(level, cx, cz, s) {
  if (!shaftAt(level, cx + s.dx, cz + s.dz)) return null;
  const wall = (x, z) => getTile(level, x, z) === TILE.WALL;
  const [dx, dz, ux, uz] = [s.dx, s.dz, s.ux, s.uz];
  const out = { L: [cx + s.L[0] - THICK * dx, cz + s.L[1] - THICK * dz], R: [cx + s.R[0] - THICK * dx, cz + s.R[1] - THICK * dz], extL: 0, extR: 0, caps: [] };
  for (const sign of [-1, 1]) {
    const E = sign < 0 ? [cx + s.L[0], cz + s.L[1]] : [cx + s.R[0], cz + s.R[1]];
    const [nx, nz] = [cx + sign * ux, cz + sign * uz]; // naboen langs veggen
    const [sx, sz] = [nx + dx, nz + dz]; // ruten ved siden av sjakten
    if (wall(nx, nz)) continue; // innvendig hjørne: naboens vegg tar resten
    const open = level.seams.open.get(sz * level.w + sx);
    const entrance = open && open[0] === -sign * ux && open[1] === -sign * uz;
    if (entrance || (wall(sx, sz) && !shaftAt(level, sx, sz))) {
      out.caps.push({ A: E, B: [E[0] - THICK * dx, E[1] - THICK * dz], n: [sign * ux || 0, 0, sign * uz || 0] });
    } else if (!wall(sx, sz)) {
      // Utvendig hjørne: begge flatene forlenges, så de møtes.
      if (sign < 0) (out.extL = THICK), (out.L = [out.L[0] - THICK * ux, out.L[1] - THICK * uz]);
      else (out.extR = THICK), (out.R = [out.R[0] + THICK * ux, out.R[1] + THICK * uz]);
    }
  }
  return out;
}

/** Bygger den tykke veggen fra shaftWall i spennene (openSpans). */
export function buildShaftWall(mesh, t, s, spans, uL, uR, ends) {
  const du = uR - uL;
  for (const sp of spans) {
    mesh.wall(t.L[0], t.L[1], t.R[0], t.R[1], s.n, uL - t.extL * du, uR + t.extR * du, sp.lo, sp.hi, ends, undefined, sp.base);
    for (const { A, B, n } of t.caps) {
      const p = [[A[0], sp.lo, A[1]], [B[0], sp.lo, B[1]], [B[0], sp.hi, B[1]], [A[0], sp.hi, A[1]]];
      faceQuad(mesh, p, n, [[0, sp.lo - sp.base], [THICK, sp.lo - sp.base], [THICK, sp.hi - sp.base], [0, sp.hi - sp.base]]);
    }
  }
}

/**
 * Inngangen fra åpningen (x, z) inn i sjakten (`level.seams.open`): en bue i en THICK tykk vegg
 * opp til taket, innenfor sjakten, så forsiden flukter med endene av sjaktveggene.
 */
export function buildEntrance(mesh, level, x, z) {
  const toward = level.seams?.open.get(z * level.w + x);
  if (!toward) return;
  const fy = floorAt(level, x, z);
  const ceil = ceilingAt(level, x, z);
  const pz = toward[0] === 0;
  const forward = (pz ? toward[1] : toward[0]) > 0;
  const plane = (pz ? z : x) + (forward ? 1 : 0); // grensen mot sjakten
  const p0 = forward ? plane : plane - THICK;
  const a0 = pz ? x : z;
  const shape = { info: { pz, a0, p0 }, ...archCurve(fy, Math.min(ceil, fy + ARCH_TOP)), depth: THICK };
  buildArch(mesh, shape);
  if (ceil - shape.top < 1e-3) return;
  // Veggfeltet over buen, opp til taket, på begge sider.
  const at = (a, y, p) => (pz ? [a, y, p] : [p, y, a]);
  for (const side of [-1, 1]) {
    const p = side < 0 ? p0 : p0 + THICK;
    const n = pz ? [0, 0, side] : [side, 0, 0];
    const u = (a) => a * (pz ? side : -side);
    const face = [at(a0, shape.top, p), at(a0 + 1, shape.top, p), at(a0 + 1, ceil, p), at(a0, ceil, p)];
    faceQuad(mesh, face, n, [[u(a0), shape.top - fy], [u(a0 + 1), shape.top - fy], [u(a0 + 1), ceil - fy], [u(a0), ceil - fy]]);
  }
}
