// Trapper i 3D: trinn (inntrinn og opptrinn i gulvmaterialet) og overflatehøyden langs
// kantene, som surfaces.js bruker til sidene av trapper og hevede gulv. Ren logikk.
import { TILE, getTile } from '../core/level.js';
import { STEP_RISE, stairSpan, floorAt } from '../core/heights.js';
import { waterCell } from '../core/pillar-water.js';
import { isRamp } from '../core/ramps.js';
import { faceQuad } from './mesher.js';

/** Trinnene i en trapperute: n trinn, h(k) = høyden på trinn k (det øverste er toppen). En rampe har ingen trinn. */
export function stepProfile(level, x, z) {
  const { bottom, top, dir } = stairSpan(level, x, z);
  const n = isRamp(level, x, z) ? 1 : Math.max(1, Math.round((top - bottom) / STEP_RISE));
  return { bottom, top, dir, n, h: (k) => bottom + ((top - bottom) * (k + 1)) / n };
}

/** Hvor langt (0–1) et punkt ligger langs trappen, regnet fra bakkanten. */
export function alongStair(dir, x, z, px, pz) {
  const fx = px - x;
  const fz = pz - z;
  return dir[0] ? (dir[0] > 0 ? fx : 1 - fx) : dir[1] > 0 ? fz : 1 - fz;
}

/** Overflaten i ruten ved punktet: trinnhøyden i trapper, vannkanten (0) for basseng. */
export function surfaceHeight(level, x, z, px, pz) {
  const t = getTile(level, x, z);
  if (waterCell(level, x, z)) return 0; // også søyler i vann: ellers får de en firkantet sjakt rundt seg
  if (t !== TILE.STAIRS) return floorAt(level, x, z);
  const p = stepProfile(level, x, z);
  const a = alongStair(p.dir, x, z, px, pz);
  if (isRamp(level, x, z)) return p.bottom + (p.top - p.bottom) * Math.min(1, Math.max(0, a)); // jevnt opp
  if (a < 0.01) return p.bottom; // bakkanten: første opptrinn tegnes av trinnene selv
  return p.h(Math.min(p.n - 1, Math.floor(a * p.n)));
}

/** Rutekantene der trinnene skifter høyde, som andeler 0–1 langs kanten L → R. */
export function stepBreaks(level, x, z, L, R) {
  if (getTile(level, x, z) !== TILE.STAIRS || isRamp(level, x, z)) return [];
  const { dir, n } = stepProfile(level, x, z);
  const ex = R[0] - L[0];
  const ez = R[1] - L[1];
  if (ex * dir[0] + ez * dir[1] === 0) return []; // kanten går på tvers av trappen
  const forward = ex * dir[0] + ez * dir[1] > 0;
  const out = [];
  for (let k = 1; k < n; k++) out.push(forward ? k / n : 1 - k / n);
  return out;
}

/** Inntrinn og opptrinn for trapperuten (x, z); for en rampe én skrå flate. */
export function buildSteps(mesh, level, x, z) {
  const { dir, n, bottom, top, h } = stepProfile(level, x, z);
  const P = (t, s, y) => {
    if (dir[0] > 0) return [x + t, y, z + s];
    if (dir[0] < 0) return [x + 1 - t, y, z + s];
    if (dir[1] > 0) return [x + s, y, z + t];
    return [x + s, y, z + 1 - t];
  };
  if (isRamp(level, x, z)) {
    const rise = top - bottom;
    const len = Math.hypot(1, rise);
    const slope = [P(0, 0, bottom), P(1, 0, top), P(1, 1, top), P(0, 1, bottom)];
    faceQuad(mesh, slope, [(-dir[0] * rise) / len, 1 / len, (-dir[1] * rise) / len], slope.map((p) => [p[0], p[2]]));
    return;
  }
  const back = [-dir[0], 0, -dir[1]];
  let prev = bottom;
  for (let k = 0; k < n; k++) {
    const t0 = k / n;
    const t1 = (k + 1) / n;
    const y = h(k);
    const riser = [P(t0, 0, prev), P(t0, 1, prev), P(t0, 1, y), P(t0, 0, y)];
    faceQuad(mesh, riser, back, riser.map((p) => [dir[0] ? p[2] : p[0], p[1]]));
    const tread = [P(t0, 0, y), P(t1, 0, y), P(t1, 1, y), P(t0, 1, y)];
    faceQuad(mesh, tread, [0, 1, 0], tread.map((p) => [p[0], p[2]]));
    prev = y;
  }
}

/**
 * Veggspennene i en trapperute (openSpans), med v regnet fra foten av trappen: da går flisene og
 * tapeten i ett langs hele trappen (og opp gjennom et trapperom) i stedet for å hoppe på hvert trinn.
 * Gulvlisten (`skirt`, m) følger fortsatt trinnene. Temaer med brystning (wall2) beholder v fra
 * ruten, så delelinjen følger trinnene.
 */
export function stairWallSpans(level, x, z, spans, { split, skirt }) {
  if (split || getTile(level, x, z) !== TILE.STAIRS) return spans;
  const { dir } = stairSpan(level, x, z);
  let [fx, fz] = [x, z];
  for (let k = 0; k < level.w + level.h; k++) {
    const [bx, bz] = [fx - dir[0], fz - dir[1]];
    if (getTile(level, bx, bz) !== TILE.STAIRS || stairSpan(level, bx, bz).dir !== dir) break;
    [fx, fz] = [bx, bz];
  }
  const foot = stairSpan(level, fx, fz).bottom;
  // En rampe har ingen trinn å følge: en gulvlist i trinn per rute ble sagtenner over den skrå flaten.
  const list = isRamp(level, x, z) ? 0 : skirt;
  return spans.flatMap((sp, k) => {
    if (k) return [sp];
    const cut = Math.min(sp.hi, sp.lo + list);
    return [...(list > 0 ? [{ lo: sp.lo, hi: cut, base: sp.base }] : []), { lo: cut, hi: sp.hi, base: foot }].filter((p) => p.hi - p.lo > 1e-4);
  });
}

/** Siden av en rampe langs løpet: en skrå flate fra naboens gulv opp til rampen (ellers ville den blitt trappetrinn). */
export function rampSide(mesh, level, cx, cz, nx, nz, s, L, R) {
  if (!isRamp(level, cx, cz)) return false;
  const { dir } = stairSpan(level, cx, cz);
  if (s.dx * dir[0] + s.dz * dir[1] !== 0) return false; // for- og bakkanten: som før
  const inner = (p) => [p[0] - s.dx * 1e-3, p[1] - s.dz * 1e-3];
  // Naboens høyde i hver ende: ved siden av en annen bane i samme rampe er den lik vår hele veien (målt bare på midten
  // ble det en loddrett kile i den øvre halvdelen av hver rute – mørke striper i brede ramper).
  const [tl, tr] = [L, R].map((p) => surfaceHeight(level, nx, nz, p[0] + s.dx * 1e-3, p[1] + s.dz * 1e-3));
  const [hl, hr] = [[L, tl], [R, tr]].map(([p, t]) => Math.max(t, surfaceHeight(level, cx, cz, ...inner(p))));
  if (hl <= tl + 1e-4 && hr <= tr + 1e-4) return true;
  const u = (x, z) => x * s.ux + z * s.uz;
  const quad = [[R[0], tr, R[1]], [L[0], tl, L[1]], [L[0], hl, L[1]], [R[0], hr, R[1]]];
  faceQuad(mesh, quad, [-s.n[0], 0, -s.n[2]], quad.map((p) => [u(p[0], p[2]), p[1]]));
  return true;
}
