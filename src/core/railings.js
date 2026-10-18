// Rekkverk: hvilke rutekanter som får rekkverk. Åpne sider av trapper og kanter der gulvet
// faller mer enn GUARD_DROP får vern (håndlist med spiler, stopper spilleren) – unntatt der en
// vannsklie går over kanten. Trappesider mot vegg får en håndlist på veggen. Dekker (andre
// etasje) får vern langs kanten mot lavere gulv, i dekkets høyde (`y`). Ren logikk.
import { TILE, getTile } from './level.js';
import { stairSpan, floorAt, topFloorAt, deckAt, ceilingAt, edgeHeight, HEADROOM } from './heights.js';
import { SLIDE, slidePath } from './slides.js';

export const GUARD_DROP = 0.45;
export const RAIL_HEIGHT = 0.9;
const GUARD_DEPTH = 0.08; // hvor langt inn i ruten vernet tar plass (kollisjon)
const SIDES = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];

const surface = (level, x, z) => (getTile(level, x, z) === TILE.WATER ? 0 : topFloorAt(level, x, z));

/** Gangflaten i naboruten for den som står i høyden y: dekket om man er oppe ved det. */
function surfaceNear(level, x, z, y) {
  const d = deckAt(level, x, z);
  return d && y >= d - GUARD_DROP ? d : surface(level, x, z);
}

/** Vern langs dekkekanten (i høyden d) mot naboer som ligger lavere og er åpne i den høyden. */
function deckGuards(level, x, z, d, edges) {
  const out = [];
  for (const [dx, dz] of SIDES) {
    const nx = x + dx;
    const nz = z + dz;
    const n = getTile(level, nx, nz);
    if (n === TILE.WALL || ceilingAt(level, nx, nz) < d + HEADROOM) continue;
    if (edges?.has(`${x},${z},${dx},${dz}`)) continue;
    // En trapp som kommer opp hit, eller et dekke i samme høyde, er ikke en kant.
    const theirs = deckAt(level, nx, nz) || (n === TILE.STAIRS ? edgeHeight(level, nx, nz, -dx, -dz) : surface(level, nx, nz));
    if (d - theirs > GUARD_DROP) out.push({ dx, dz, kind: 'guard', y: d });
  }
  return out;
}

// Kanter som en sklie går over («x,z,dx,dz»), så vernet har en åpning der sklien starter.
const slideEdgeCache = new WeakMap();
function slideEdges(level) {
  // Banene bufres per sklie; er de de samme som sist (samme høyder), gjelder settet fortsatt.
  const paths = level.slides.map((s) => slidePath(level, s));
  const hit = slideEdgeCache.get(level.slides);
  if (hit && hit.paths.every((p, i) => p === paths[i])) return hit.set;
  const set = new Set();
  for (const { points } of level.slides) {
    for (let i = 0; i < points.length - 1; i++) {
      const [ax, az] = points[i];
      const [bx, bz] = points[i + 1];
      const dx = Math.sign(bx - ax);
      const dz = Math.sign(bz - az);
      // Et diagonalt steg går over hjørnet: åpne også kantene mot de to rutene ved siden av.
      const corner =
        dx && dz
          ? [
              [ax + dx, az, 0, dz],
              [ax + dx, az, -dx, 0],
              [ax, az + dz, dx, 0],
              [ax, az + dz, 0, -dz],
            ]
          : [];
      for (const [x, z, sx, sz] of [
        [ax, az, dx, 0],
        [ax, az, 0, dz],
        [bx, bz, -dx, 0],
        [bx, bz, 0, -dz],
        ...corner,
      ]) {
        if (sx || sz) set.add(`${x},${z},${sx},${sz}`);
      }
    }
  }
  // Rennen er bredere enn én rute: fjern også vern som rennen passerer tett forbi i
  // rekkverkets høyde (ut fra den ferdige, glattede banen).
  const reach = SLIDE.RADIUS + 0.15;
  for (const path of paths) {
    if (path.problem) continue;
    for (const p of path.samples) {
      for (let z = Math.floor(p.z - 1); z <= Math.floor(p.z + 1); z++) {
        for (let x = Math.floor(p.x - 1); x <= Math.floor(p.x + 1); x++) {
          const floor = topFloorAt(level, x, z);
          if (p.y > floor + RAIL_HEIGHT + 0.1 || p.y + 2 * SLIDE.RADIUS < floor) continue;
          for (const [dx, dz] of SIDES) {
            // Kanten som linjestykke, og avstanden fra banepunktet til det.
            const [ax, az, bx, bz] = dx
              ? [x + (dx > 0 ? 1 : 0), z, x + (dx > 0 ? 1 : 0), z + 1]
              : [x, z + (dz > 0 ? 1 : 0), x + 1, z + (dz > 0 ? 1 : 0)];
            const qx = Math.max(Math.min(ax, bx), Math.min(Math.max(ax, bx), p.x));
            const qz = Math.max(Math.min(az, bz), Math.min(Math.max(az, bz), p.z));
            if (Math.hypot(p.x - qx, p.z - qz) < reach) set.add(`${x},${z},${dx},${dz}`);
          }
        }
      }
    }
  }
  slideEdgeCache.set(level.slides, { paths, set });
  return set;
}

/** Rekkverk langs rutens kanter: [{ dx, dz, kind: 'guard' | 'wall' }] (dx, dz peker ut). */
export function railSides(level, x, z) {
  const t = getTile(level, x, z);
  if (t === TILE.WALL || t === TILE.WATER || t === TILE.DOOR) return [];
  const out = [];
  if (t === TILE.STAIRS) {
    const { top, dir } = stairSpan(level, x, z);
    const d = level.meta[z * level.w + x] & 3;
    for (const [dx, dz] of SIDES) {
      if (dx * dir[0] + dz * dir[1] !== 0) continue; // for- og bakkanten har ikke rekkverk
      const n = getTile(level, x + dx, z + dz);
      if (n === TILE.WALL) out.push({ dx, dz, kind: 'wall' });
      else if (n === TILE.STAIRS && (level.meta[(z + dz) * level.w + x + dx] & 3) === d) continue;
      else if (surfaceNear(level, x + dx, z + dz, top) < top - 0.25) out.push({ dx, dz, kind: 'guard' });
    }
    return out;
  }
  const fy = floorAt(level, x, z);
  const edges = level.slides?.length ? slideEdges(level) : null;
  for (const [dx, dz] of SIDES) {
    const n = getTile(level, x + dx, z + dz);
    if (n === TILE.WALL || n === TILE.STAIRS) continue;
    if (edges?.has(`${x},${z},${dx},${dz}`)) continue;
    if (fy - surface(level, x + dx, z + dz) > GUARD_DROP) out.push({ dx, dz, kind: 'guard' });
  }
  const d = deckAt(level, x, z);
  return d ? out.concat(deckGuards(level, x, z, d, edges)) : out;
}

/**
 * Kollisjonsboksene for vernene i ruten: tynne bokser langs kantene, inne i ruten. Med base
 * (høyden man står i) bare vernene i den etasjen – ikke vernet på dekket over hodet.
 */
export function guardBoxes(level, x, z, base = null) {
  const out = [];
  for (const { dx, dz, kind, y } of railSides(level, x, z)) {
    if (kind !== 'guard') continue;
    if (base !== null && (y ?? floorAt(level, x, z)) > base + 1.75) continue;
    if (dx < 0) out.push([x, z, x + GUARD_DEPTH, z + 1]);
    else if (dx > 0) out.push([x + 1 - GUARD_DEPTH, z, x + 1, z + 1]);
    else if (dz < 0) out.push([x, z, x + 1, z + GUARD_DEPTH]);
    else out.push([x, z + 1 - GUARD_DEPTH, x + 1, z + 1]);
  }
  return out;
}
