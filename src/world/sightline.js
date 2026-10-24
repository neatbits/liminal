// Siktlinjer i rutenettet for lysbakingen (lighting.js), lyden og monsteret: gulv-/takhøyder per
// rute, dekkeplater, lukkede dører og halvvegger. Ren logikk (ingen DOM/three.js).
import { TILE, inBounds } from '../core/level.js';
import { ceilingAt, floorAt, deckAt, SLAB } from '../core/heights.js';
import { closedDoorFaces } from '../core/doors.js';
import { halfWalls, halfWallOccludes } from '../core/half-walls.js';

const EPS = 1e-3;
const LIP = 0.15; // slingringsmonn mot gulvet, så kanten over vannflaten ikke skygger vannet
const NUDGE = 1e-4;

/**
 * Gulv- og takhøyde per rute (vegger er ubegrenset – de stopper siktlinjen uansett), dekkeplater
 * (slab = toppen, 0 = ingen) og rutekanter som stenges av lukkede dører (se closedDoorFaces).
 */
export function cellHeights(level) {
  const n = level.w * level.h;
  const floor = new Float32Array(n);
  const ceil = new Float32Array(n);
  const slab = new Float32Array(n);
  let decks = false;
  for (let i = 0; i < n; i++) {
    const x = i % level.w;
    const z = (i / level.w) | 0;
    const wall = level.tiles[i] === TILE.WALL;
    floor[i] = wall ? -Infinity : floorAt(level, x, z);
    ceil[i] = wall ? Infinity : ceilingAt(level, x, z);
    slab[i] = wall ? 0 : deckAt(level, x, z);
    if (slab[i]) decks = true;
  }
  return { floor, ceil, slab: decks ? slab : null, faces: closedDoorFaces(level), halfWalls: halfWalls(level) };
}

const fits = (heights, i, y) => y <= heights.ceil[i] + EPS && y >= heights.floor[i] - LIP;

/** Går linjestykket (høyde ya → yb) inne i ruten gjennom dekkeplaten der? */
function throughSlab(heights, i, ya, yb) {
  const top = heights.slab?.[i];
  if (!top || i < 0) return false;
  return Math.max(ya, yb) > top - SLAB + EPS && Math.min(ya, yb) < top - EPS;
}

/**
 * Siktlinje i rutenettet (DDA). Startruten og målruten sjekkes ikke for vegg.
 * Med `heights` (cellHeights) og høydene y0/y1 i endepunktene må linjen dessuten gå under
 * taket og over gulvet i begge ruter der den krysser en rutegrense, og ikke gjennom en
 * lukket dør.
 */
export function lineOfSight(level, x0, z0, x1, z1, heights = null, y0 = 0, y1 = 0) {
  if (halfWallOccludes(heights?.halfWalls ?? halfWalls(level), x0, y0, z0, x1, y1, z1)) return false;
  const { w, h, tiles } = level;
  let cx = Math.floor(x0);
  let cz = Math.floor(z0);
  const ex = Math.floor(x1);
  const ez = Math.floor(z1);
  const dx = x1 - x0;
  const dz = z1 - z0;
  const stepX = dx > 0 ? 1 : -1;
  const stepZ = dz > 0 ? 1 : -1;
  const tdx = dx !== 0 ? Math.abs(1 / dx) : Infinity;
  const tdz = dz !== 0 ? Math.abs(1 / dz) : Infinity;
  let tmx = dx !== 0 ? (dx > 0 ? cx + 1 - x0 : x0 - cx) * tdx : Infinity;
  let tmz = dz !== 0 ? (dz > 0 ? cz + 1 - z0 : z0 - cz) * tdz : Infinity;
  const slabs = heights?.slab ? heights : null;
  const yAt = (t) => y0 + (y1 - y0) * t;
  let tIn = 0; // der linjen gikk inn i ruten den er i nå
  for (let guard = 0; guard < 4096; guard++) {
    const prev = inBounds(level, cx, cz) ? cz * w + cx : -1;
    let t;
    // Kantene som krysses (se closedDoorFaces): forrige rutes og den nye rutens.
    let fPrev;
    let fNext;
    if (Math.min(tmx, tmz) > 1) return !(slabs && throughSlab(slabs, prev, yAt(tIn), y1));
    if (tmx < tmz) {
      t = tmx;
      cx += stepX;
      tmx += tdx;
      fPrev = stepX > 0 ? 8 : 4;
      fNext = 12 - fPrev;
    } else {
      t = tmz;
      cz += stepZ;
      tmz += tdz;
      fPrev = stepZ > 0 ? 2 : 1;
      fNext = 3 - fPrev;
    }
    if (slabs && throughSlab(slabs, prev, yAt(tIn), yAt(t))) return false;
    tIn = t;
    const end = cx === ex && cz === ez;
    if (cx < 0 || cz < 0 || cx >= w || cz >= h) return end;
    const i = cz * w + cx;
    if (!end && tiles[i] === TILE.WALL) return false;
    if (heights) {
      const y = y0 + (y1 - y0) * t;
      if (!fits(heights, i, y) || (prev >= 0 && !fits(heights, prev, y))) return false;
      if (heights.faces[i] & fNext || (prev >= 0 && heights.faces[prev] & fPrev)) return false;
    }
    if (end) return !(slabs && throughSlab(slabs, i, yAt(t), y1));
  }
  return true;
}

/**
 * Punkter på en rutegrense (hjørner av gulv og tak) hører til den åpne ruten de faktisk
 * ligger i høydemessig. Skyver punktet et hårsbredd inn i den ruten, så taket i et høyt
 * rom ikke regnes som inne i nabosonen med lavere tak.
 */
export function settle(level, heights, x, z, y) {
  const fx = Math.floor(x);
  const fz = Math.floor(z);
  if (x !== fx && z !== fz) return [x, z];
  const ox = x === fx ? [0, -1] : [0];
  const oz = z === fz ? [0, -1] : [0];
  for (const ax of ox) {
    for (const az of oz) {
      const cx = fx + ax;
      const cz = fz + az;
      if (!inBounds(level, cx, cz)) continue;
      const i = cz * level.w + cx;
      if (level.tiles[i] !== TILE.WALL && fits(heights, i, y)) return [x + ax * NUDGE, z + az * NUDGE];
    }
  }
  return [x, z];
}
