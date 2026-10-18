// Dekker (andre etasje) i 3D: platen med gulv oppå og himling under, og kantlisten (fasaden)
// mot lavere naboer. Hjelperen openSpans deler en rutes søyle i etasjer, så vegger og søyler
// i surfaces.js bygges per etasje (og får lys hver for seg). Ren logikk – ingen three.js.
import { TILE, getTile } from '../core/level.js';
import { floorAt, ceilingAt, deckAt, upperAt, SLAB } from '../core/heights.js';

const UP = [0, 1, 0];
const DOWN = [0, -1, 0];

/**
 * Det åpne rommet i rutens søyle: [{ lo, hi, base }] nedenfra (base = der veggens v-koordinat
 * regnes fra, så gulvlister og brystning står på gulvet i hver etasje). Tom for vegg.
 */
export function openSpans(level, x, z, base = floorAt(level, x, z)) {
  if (getTile(level, x, z) === TILE.WALL) return [];
  const fy = floorAt(level, x, z);
  const cy = ceilingAt(level, x, z);
  const d = deckAt(level, x, z);
  return d ? [{ lo: fy, hi: d - SLAB, base }, { lo: d, hi: cy, base: d }] : [{ lo: fy, hi: cy, base }];
}

/** Delene av [y0, y1] som ligger i spennene: [{ lo, hi, base }]. */
export function clipSpans(spans, y0, y1) {
  const out = [];
  for (const s of spans) {
    const lo = Math.max(s.lo, y0);
    const hi = Math.min(s.hi, y1);
    if (hi - lo > 1e-4) out.push({ lo, hi, base: s.base });
  }
  return out;
}

/** Hjørneskygge som i surfaces.js: naboruter som «stenger» rundt punktet. */
function ao(x, z, closes, step) {
  let n = 0;
  for (const [ox, oz] of [
    [-0.25, -0.25],
    [0.25, -0.25],
    [-0.25, 0.25],
    [0.25, 0.25],
  ]) {
    if (closes(Math.floor(x + ox), Math.floor(z + oz))) n++;
  }
  return 1 - n * step;
}

function plate(mesh, cx, cz, y, S, up, closes, step, gain = 1) {
  for (let j = 0; j < S; j++) {
    for (let i = 0; i < S; i++) {
      const [x0, x1, z0, z1] = [cx + i / S, cx + (i + 1) / S, cz + j / S, cz + (j + 1) / S];
      const a = (x, z) => ao(x, z, closes, step) * gain;
      if (up) mesh.quad([x0, y, z0, x0, z0], [x0, y, z1, x0, z1], [x1, y, z1, x1, z1], [x1, y, z0, x1, z0], UP, [a(x0, z0), a(x0, z1), a(x1, z1), a(x1, z0)]);
      else mesh.quad([x0, y, z0, x0, z0], [x1, y, z0, x1, z0], [x1, y, z1, x1, z1], [x0, y, z1, x0, z1], DOWN, [a(x0, z0), a(x1, z0), a(x1, z1), a(x0, z1)]);
    }
  }
}

/**
 * Platen i en rute med dekke: gulv oppå (floorMesh), himling under (ceiling) og kantlist mot
 * naboer som er åpne i platens høyde (wallMesh). `sides` er SIDES fra caps.js.
 */
export function buildDeck(level, cx, cz, { floorMesh, ceiling, wallMesh }, sides, S, ceilingGain) {
  const d = deckAt(level, cx, cz);
  if (!d) return;
  const isWall = (x, z) => getTile(level, x, z) === TILE.WALL;
  // Oppå: skygge mot vegger og mot naboer som er tette eller høyere i dekkets høyde.
  const shut = (x, z) => isWall(x, z) || ceilingAt(level, x, z) < d + 0.5 || upperAt(level, x, z) > d + 0.01;
  plate(floorMesh, cx, cz, d, S, true, shut, 0.12);
  plate(ceiling, cx, cz, d - SLAB, S, false, isWall, 0.1, ceilingGain);
  for (const s of sides) {
    const nx = cx + s.dx;
    const nz = cz + s.dz;
    if (isWall(nx, nz)) continue;
    const L = [cx + s.L[0], cz + s.L[1]];
    const R = [cx + s.R[0], cz + s.R[1]];
    const u = (x, z) => x * s.ux + z * s.uz;
    const n = [-s.n[0], 0, -s.n[2]];
    // Bare der naboen er åpen i platens høyde (ikke over en døråpning eller mot en like høy plate).
    for (const span of clipSpans(openSpans(level, nx, nz), d - SLAB, d)) {
      wallMesh.wall(R[0], R[1], L[0], L[1], n, u(...R), u(...L), span.lo, span.hi, [1, 1], { bottom: false, top: false }, d - 1.6);
    }
  }
}
