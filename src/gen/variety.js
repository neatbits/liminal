// Variasjon i genererte rom: takhøyden varierer litt fra nivå til nivå innenfor temaet, noen
// bassenghaller i Poolrooms får høyt tak, og bassengene får ulik dybde – grunne plaskebassenger,
// vanlige, med grunn og dyp ende, og en sjelden gang et dypt et. Ren logikk.
import { TILE } from '../core/level.js';
import { floodRegion } from '../core/ops.js';
import { fillZone } from '../core/zones.js';
import { getTheme } from '../core/themes.js';
import { waterCell } from '../core/pillar-water.js';

// Takhøyde (m) per tema; temaer som ikke står her (kjøpesenteret) beholder sin.
export const HEIGHT_RANGES = {
  backrooms: [2.5, 3.1],
  pool: [3.0, 4.2],
  office: [2.5, 2.9],
  garage: [2.4, 2.9],
  hotel: [2.5, 2.9],
  basement: [2.2, 2.6],
  playroom: [3.0, 3.8],
  school: [2.8, 3.3],
  ward: [2.6, 3.0],
};

const round = (v) => Math.round(v * 10) / 10;
const between = (rand, [a, b]) => round(a + rand() * (b - a));

/** Takhøyden for et nytt nivå i temaet (eller temaets standard). */
export function levelHeight(theme, rand) {
  const range = HEIGHT_RANGES[theme];
  return range ? between(rand, range) : getTheme(theme).defaultHeight;
}

/** Sammenhengende bassenger (vannruter) som lister av indekser. */
export function basins(level) {
  const seen = new Uint8Array(level.tiles.length);
  const out = [];
  for (let i = 0; i < level.tiles.length; i++) {
    if (seen[i] || !waterCell(level, i % level.w, Math.floor(i / level.w))) continue;
    const cells = floodRegion(level, i % level.w, Math.floor(i / level.w), (_, j) => waterCell(level, j % level.w, Math.floor(j / level.w)));
    for (const c of cells) seen[c] = 1;
    out.push(cells);
  }
  return out;
}

// Bassengtyper: [navn, vekt]. deep (0–1) gjør de dype bassengene vanligere (stemningen).
const KINDS = [
  ['shallow', 0.2],
  ['normal', 0.45],
  ['sloped', 0.25],
  ['deep', 0.1],
];

function pickKind(rand, deep) {
  const weights = KINDS.map(([k, w]) => (k === 'deep' ? w + deep : k === 'sloped' ? w + deep / 2 : w));
  let r = rand() * weights.reduce((a, b) => a + b, 0);
  for (let k = 0; k < KINDS.length; k++) if ((r -= weights[k]) < 0) return KINDS[k][0];
  return 'normal';
}

/**
 * Gir hvert basseng sin dybde (depths-laget). Ruter som allerede har egen dybde (fontener) og
 * bassenget der en sklie ender (minst 1 m), tas hensyn til. Returnerer typene som ble brukt.
 */
/** Rutene der vannskliene ender (i et basseng). */
function slideEnds(level) {
  return new Set((level.slides ?? []).map((s) => {
    const [x, z] = s.points[s.points.length - 1];
    return Math.floor(z) * level.w + Math.floor(x);
  }));
}

export function poolDepths(level, rand, { deep = 0 } = {}) {
  const ends = slideEnds(level);
  const kinds = [];
  for (const cells of basins(level)) {
    if (cells.some((i) => level.depths[i])) continue;
    let kind = pickKind(rand, deep);
    if (kind === 'shallow' && cells.some((i) => ends.has(i))) kind = 'normal';
    kinds.push(kind);
    if (kind !== 'sloped') {
      const d = between(rand, kind === 'shallow' ? [0.3, 0.5] : kind === 'deep' ? [2.2, 3] : [0.8, 1.3]);
      fillZone(level, 'depth', cells, d);
      continue;
    }
    // Grunn ende og dyp ende langs den lengste siden: bunnen går i små trinn.
    const xs = cells.map((i) => i % level.w);
    const zs = cells.map((i) => Math.floor(i / level.w));
    const alongX = Math.max(...xs) - Math.min(...xs) >= Math.max(...zs) - Math.min(...zs);
    const lo = alongX ? Math.min(...xs) : Math.min(...zs);
    const span = Math.max(1, alongX ? Math.max(...xs) - lo : Math.max(...zs) - lo);
    const flip = rand() < 0.5;
    const [shallow, bottom] = [between(rand, [0.8, 1]), between(rand, [1.8, 2.6])];
    cells.forEach((i, k) => {
      const t = ((alongX ? xs[k] : zs[k]) - lo) / span;
      fillZone(level, 'depth', [i], round(shallow + (bottom - shallow) * (flip ? 1 - t : t)));
    });
  }
  return kinds;
}

/**
 * Høye haller over noen av de store bassengene: rommet rundt bassenget (ruter man når uten å gå
 * gjennom vegg, innenfor bassengets omriss + 3 ruter) får tak på 4,8–6,8 m. Rom med vannsklie har
 * allerede sitt eget høye tak over hele rommet og hoppes over.
 */
export function tallHalls(level, rand, chance = 0.35) {
  const ends = slideEnds(level);
  let n = 0;
  for (const cells of basins(level)) {
    if (cells.length < 30 || rand() >= chance || cells.some((i) => ends.has(i))) continue;
    const xs = cells.map((i) => i % level.w);
    const zs = cells.map((i) => Math.floor(i / level.w));
    const box = [Math.min(...xs) - 3, Math.min(...zs) - 3, Math.max(...xs) + 3, Math.max(...zs) + 3];
    const inside = (i) => {
      const x = i % level.w;
      const z = Math.floor(i / level.w);
      return x >= box[0] && z >= box[1] && x <= box[2] && z <= box[3];
    };
    const room = floodRegion(level, xs[0], zs[0], (t, i) => t !== TILE.WALL && t !== TILE.DOOR && inside(i));
    fillZone(level, 'ceiling', room, between(rand, [4.8, 6.8]));
    n++;
  }
  return n;
}
