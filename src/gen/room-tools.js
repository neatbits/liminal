// Felles for møbleringen av rom (gen/furnish-rooms.js, gen/furnish-institutions.js). Ren logikk.
import { TILE, getTile } from '../core/level.js';
import { FACING } from '../core/objects.js';
import { tryPlace } from './furnish-sets.js';

export const rotOf = ([fx, fz]) => FACING.findIndex(([x, z]) => x === fx && z === fz);
export const shuffled = (rand, list) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/** Gulvruter langs veggene i rommet, ikke rett foran en dør. */
export function edges(level, r, fronts) {
  const out = [];
  for (let z = r.z0; z <= r.z1; z++) {
    for (let x = r.x0; x <= r.x1; x++) {
      if (getTile(level, x, z) !== TILE.FLOOR || fronts.has(z * level.w + x)) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => getTile(level, x + dx, z + dz) === TILE.WALL)) out.push([x, z]);
    }
  }
  return out;
}

/** Setter gjenstandene langs veggene, hver i sin rute. */
export function alongWalls(level, rand, spots, ids, room = 1) {
  const free = shuffled(rand, spots);
  let n = 0;
  for (const id of ids) {
    while (free.length) {
      const [x, z] = free.pop();
      if (tryPlace(level, x, z, id, room)) { n++; break; }
    }
  }
  return n;
}
