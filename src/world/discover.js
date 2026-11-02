// Det man har sett (kartet i Noclip, view3d/minimap.js): åpne ruter innenfor en radius som man har fri sikt til fra
// øyehøyde. Vegger tegnes der de grenser til noe man har sett. Ren logikk.
import { TILE, getTile } from '../core/level.js';
import { lineOfSight } from './sightline.js';

export const SIGHT = 9; // m man ser (og husker) rundt seg
const EYE = 1.5;

/**
 * Merker rutene man ser fra (x, z) i seen (Uint8Array, w × h). heights: cellHeights(level) fra world/lighting.js, laget
 * én gang per rom (den gjør siktlinjene mye raskere). Returnerer antall nye ruter.
 */
export function reveal(level, seen, x, z, heights = null, radius = SIGHT) {
  let fresh = 0;
  const [cx, cz] = [Math.floor(x), Math.floor(z)];
  const r = Math.ceil(radius);
  for (let gz = Math.max(0, cz - r); gz <= Math.min(level.h - 1, cz + r); gz++) {
    for (let gx = Math.max(0, cx - r); gx <= Math.min(level.w - 1, cx + r); gx++) {
      const i = gz * level.w + gx;
      if (seen[i] || getTile(level, gx, gz) === TILE.WALL) continue;
      const [tx, tz] = [gx + 0.5, gz + 0.5];
      if (Math.hypot(tx - x, tz - z) > radius) continue;
      if (!lineOfSight(level, x, z, tx, tz, heights, EYE, EYE)) continue;
      seen[i] = 1;
      fresh++;
    }
  }
  return fresh;
}

/** Skal ruten tegnes som vegg på kartet? En vegg ved siden av noe man har sett. */
export function seenWall(level, seen, x, z) {
  if (getTile(level, x, z) !== TILE.WALL) return false;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const [nx, nz] = [x + dx, z + dz];
    if (nx >= 0 && nz >= 0 && nx < level.w && nz < level.h && seen[nz * level.w + nx]) return true;
  }
  return false;
}
