// Veier gjennom rutenettet for monsteret og drømmegangen: hvilke ruter man kan gå gjennom,
// og veilengden fra en rute til alle andre (avstandskart). Ren logikk.
import { TILE, getTile } from '../core/level.js';
import { DOOR, doorInfo } from '../core/doors.js';

export const NEIGHBOURS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/** Kan man gå gjennom ruten? Ikke vegg, søyle eller lukket dør (og ikke vann med noWater). */
export function passable(level, x, z, noWater = false) {
  const t = getTile(level, x, z);
  if (t === TILE.WALL || t === TILE.PILLAR || (noWater && t === TILE.WATER)) return false;
  if (t === TILE.DOOR) return doorInfo(level, x, z)?.state !== DOOR.CLOSED;
  return true;
}

/** Kan man ta et diagonalt steg (dx, dz) fra (x, z)? Bare når begge rutene ved siden av er åpne. */
export function canStep(level, x, z, dx, dz, noWater = false) {
  if (!passable(level, x + dx, z + dz, noWater)) return false;
  return !(dx && dz) || (passable(level, x + dx, z, noWater) && passable(level, x, z + dz, noWater));
}

/** Veilengde (antall steg, diagonalt teller som 1,4) fra (x, z) til alle ruter: Float32Array. */
export function distanceMap(level, x, z, noWater = false) {
  const pass = (px, pz) => passable(level, px, pz, noWater);
  const { w, h } = level;
  const dist = new Float32Array(w * h).fill(Infinity);
  if (!pass(x, z)) return dist;
  // Enkel Dijkstra med en liten «bøttekø» (avstandene er 1 eller 1,4).
  dist[z * w + x] = 0;
  let frontier = [z * w + x];
  while (frontier.length) {
    const next = [];
    for (const i of frontier) {
      const cx = i % w;
      const cz = (i / w) | 0;
      for (const [dx, dz] of NEIGHBOURS) {
        const nx = cx + dx;
        const nz = cz + dz;
        if (!pass(nx, nz)) continue;
        if (dx && dz && (!pass(cx + dx, cz) || !pass(cx, cz + dz))) continue;
        const d = dist[i] + (dx && dz ? 1.4 : 1);
        const j = nz * w + nx;
        if (d < dist[j] - 1e-6) {
          dist[j] = d;
          next.push(j);
        }
      }
    }
    frontier = next;
  }
  return dist;
}
