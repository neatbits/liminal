// Lav steinkant langs Mall-basseng. Samme fotavtrykk brukes av geometri og gange.
import { TILE, getTile } from './level.js';

export const FOUNTAIN_RIM = { width: 0.24, height: 0.12, bottom: -0.14 };
const SIDES = [[-1, 0], [1, 0], [0, -1], [0, 1]];

export function fountainEdges(level, x, z) {
  if (level.theme !== 'mall' || getTile(level, x, z) !== TILE.WATER) return [];
  return SIDES.filter(([dx, dz]) => [TILE.FLOOR, TILE.PILLAR].includes(getTile(level, x + dx, z + dz)));
}

/** Høyden på kanten under punktet, eller null utenfor kanten. Hele kanten ligger i vannruten. */
export function fountainRimAt(level, x, z) {
  if (level.theme !== 'mall') return null;
  const cx = Math.floor(x), cz = Math.floor(z);
  const fx = x - cx, fz = z - cz;
  const w = FOUNTAIN_RIM.width;
  return fountainEdges(level, cx, cz).some(([dx, dz]) =>
    dx < 0 ? fx < w : dx > 0 ? fx > 1 - w : dz < 0 ? fz < w : fz > 1 - w) ? FOUNTAIN_RIM.height : null;
}
