// Skrå og avrundede hjørner (laget `corners`). En gulvrute med vegg på to sider som møtes i et hjørne
// (innvendig hjørne), eller en veggrute med gulv på to slike sider (utvendig hjørne), kan få hjørnet
// skåret på skrå (45°) eller rundet av. Grensen går fra det ene nabohjørnet (A) til det andre (B):
// rett (skrått) eller som en kvart sirkel om det motsatte hjørnet (Q). Delen mot hjørnet (K) får
// naboenes type – gulvruten får en veggkile, veggruten blir åpen. Ren logikk.
import { TILE, getTile, inBounds } from './level.js';
import { floorAt, ceilingAt, deckAt } from './heights.js';

export const CORNER = Object.freeze({ NONE: 0, ANGLED: 1, ROUND: 2 });

// Hjørnene i ruten: 0 = (0, 0), 1 = (1, 0), 2 = (1, 1), 3 = (0, 1). Sidene som møtes i hjørne k.
const CORNERS = [[0, 0], [1, 0], [1, 1], [0, 1]];
const SIDES = [[[-1, 0], [0, -1]], [[0, -1], [1, 0]], [[1, 0], [0, 1]], [[0, 1], [-1, 0]]];
const ARC = 8; // biter i buen

const encode = (kind, k) => (kind ? (kind - 1) * 4 + k + 1 : 0);
const decode = (v) => ({ kind: Math.floor((v - 1) / 4) + 1, k: (v - 1) % 4 });

/** Kan hjørne k i ruten (x, z) formes? Gir høydene { fy, cy } og typene, eller null. */
function fits(level, x, z, k) {
  const own = getTile(level, x, z);
  if (own !== TILE.FLOOR && own !== TILE.WALL) return null;
  const flank = own === TILE.FLOOR ? TILE.WALL : TILE.FLOOR;
  const [[ax, az], [bx, bz]] = SIDES[k];
  if (getTile(level, x + ax, z + az) !== flank || getTile(level, x + bx, z + bz) !== flank) return null;
  // Naborutene på hjørnesidene kan ikke selv være formet (da ville det blitt et hull uten vegg imellom).
  if (level.corners[(z + az) * level.w + x + ax] || level.corners[(z + bz) * level.w + x + bx]) return null;
  if (own === TILE.FLOOR) {
    if (deckAt(level, x, z)) return null;
    return { own, flank, fy: floorAt(level, x, z), cy: ceilingAt(level, x, z) };
  }
  // Veggrute: ikke vinduer, og de to gulvrutene må ha samme gulv og tak (ingen dekker).
  if (level.meta[z * level.w + x] & 1) return null;
  const [p, q] = [[x + ax, z + az], [x + bx, z + bz]];
  if (deckAt(level, ...p) || deckAt(level, ...q)) return null;
  const fy = floorAt(level, ...p);
  const cy = ceilingAt(level, ...p);
  if (Math.abs(floorAt(level, ...q) - fy) > 1e-3 || Math.abs(ceilingAt(level, ...q) - cy) > 1e-3) return null;
  if (Math.abs(floorAt(level, x, z) - fy) > 1e-3) return null; // man går på veggrutens gulv i den åpne delen
  return { own, flank, fy, cy };
}

/**
 * Formen i ruten (x, z), eller null (ingen, eller ugyldig etter at rommet er endret):
 * { k, kind, own, flank, fy, cy, boundary: [[x, z], …] fra A til B, near: polygonet mot hjørnet,
 *   far: polygonet mot det motsatte hjørnet, solid: det av dem som er vegg, open: det som er gulv }.
 */
export function cornerShape(level, x, z) {
  if (!inBounds(level, x, z) || !level.corners) return null;
  const v = level.corners[z * level.w + x];
  if (!v) return null;
  const { kind, k } = decode(v);
  const f = fits(level, x, z, k);
  if (!f) return null;
  const at = (c) => [x + CORNERS[c % 4][0], z + CORNERS[c % 4][1]];
  const [K, A, Q, B] = [at(k), at(k + 1), at(k + 2), at(k + 3)];
  let boundary = [A, B];
  if (kind === CORNER.ROUND) {
    boundary = Array.from({ length: ARC + 1 }, (_, i) => {
      const t = (i / ARC) * (Math.PI / 2);
      return [Q[0] + (A[0] - Q[0]) * Math.cos(t) + (B[0] - Q[0]) * Math.sin(t), Q[1] + (A[1] - Q[1]) * Math.cos(t) + (B[1] - Q[1]) * Math.sin(t)];
    });
  }
  const near = [K, ...boundary];
  const far = [Q, ...boundary];
  const own = f.own === TILE.WALL;
  return { k, kind, ...f, K, Q, boundary, near, far, solid: own ? far : near, open: own ? near : far };
}

/** Er siden (dx, dz) av ruten åpnet av formen (veggruten er åpen langs begge sidene mot hjørnet)? */
export function sideOpened(shape, dx, dz) {
  return !!shape && SIDES[shape.k].some(([sx, sz]) => sx === dx && sz === dz);
}

/** Hjørnet som passer i ruten nærmest punktet (fx, fz) i ruten (0–1), eller -1. */
export function pickCorner(level, x, z, fx = 0.5, fz = 0.5) {
  let best = -1;
  let dist = Infinity;
  for (let k = 0; k < 4; k++) {
    if (!fits(level, x, z, k)) continue;
    const d = Math.hypot(CORNERS[k][0] - fx, CORNERS[k][1] - fz);
    if (d < dist) [best, dist] = [k, d];
  }
  return best;
}

/** Former hjørnet i ruten (nærmest (fx, fz)), eller fjerner formen (kind 0). Returnerer antall endringer. */
export function setCorner(level, x, z, kind, fx = 0.5, fz = 0.5) {
  if (!inBounds(level, x, z)) return 0;
  const i = z * level.w + x;
  let v = 0;
  if (kind) {
    const k = pickCorner(level, x, z, fx, fz);
    if (k < 0) return 0;
    v = encode(kind, k);
  }
  if (level.corners[i] === v) return 0;
  level.corners[i] = v;
  return 1;
}

/** Alle ruter med et hjørne som kan formes: [{ x, z, k }] (det første som passer i hver rute). */
export function cornerCandidates(level) {
  const out = [];
  for (let z = 1; z < level.h - 1; z++) {
    for (let x = 1; x < level.w - 1; x++) {
      for (let k = 0; k < 4; k++) {
        if (fits(level, x, z, k)) {
          out.push({ x, z, k });
          break;
        }
      }
    }
  }
  return out;
}

export function setCornerAt(level, x, z, kind, k) {
  level.corners[z * level.w + x] = encode(kind, k);
}

/** Et punkt i åpent rom nær (x, z): ligger det i en åpnet veggrute, flyttes det inn i gulvet ved siden av. */
export function openPoint(level, x, z) {
  const [cx, cz] = [Math.floor(x), Math.floor(z)];
  const s = getTile(level, cx, cz) === TILE.WALL ? cornerShape(level, cx, cz) : null;
  if (!s) return [x, z];
  let best = [x, z];
  let dist = Infinity;
  for (const [dx, dz] of SIDES[s.k]) {
    const nx = Math.max(cx + dx + 0.02, Math.min(cx + dx + 0.98, x));
    const nz = Math.max(cz + dz + 0.02, Math.min(cz + dz + 0.98, z));
    const d = Math.hypot(nx - x, nz - z);
    if (d < dist) [best, dist] = [[nx, nz], d];
  }
  return best;
}

/** Ligger punktet (x, z) i den massive delen av en formet rute? (Polygonet er en vifte fra første punkt.) */
export function insideSolid(shape, x, z) {
  return pointInPolygon(shape.solid, x, z);
}

export function pointInPolygon(poly, x, z) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
