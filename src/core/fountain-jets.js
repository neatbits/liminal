// One fountain per connected mall pool, centred safely inside its water footprint.
import { TILE, WATER_SURFACE, getTile } from './level.js';
import { headAt } from './heights.js';
import { fountainRimAt } from './fountains.js';

export function fountainJets(level) {
  if (level.theme !== 'mall') return [];
  const seen = new Uint8Array(level.tiles.length),
    out = [];
  for (let start = 0; start < seen.length; start++) {
    if (seen[start] || level.tiles[start] !== TILE.WATER) continue;
    const cells = [start];
    seen[start] = 1;
    for (let k = 0; k < cells.length; k++) {
      const i = cells[k],
        x = i % level.w,
        z = Math.floor(i / level.w);
      for (const [dx, dz] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        const nx = x + dx,
          nz = z + dz,
          j = nz * level.w + nx;
        if (nx < 0 || nz < 0 || nx >= level.w || nz >= level.h || seen[j] || level.tiles[j] !== TILE.WATER)
          continue;
        seen[j] = 1;
        cells.push(j);
      }
    }
    if (cells.length < 4 || out.length >= 32) continue;
    const cx = cells.reduce((s, i) => s + (i % level.w) + 0.5, 0) / cells.length;
    const cz = cells.reduce((s, i) => s + Math.floor(i / level.w) + 0.5, 0) / cells.length;
    const candidates = cells.map(i => [(i % level.w) + 0.5, Math.floor(i / level.w) + 0.5]);
    candidates.push([cx, cz]);
    candidates.sort((a, b) => (a[0] - cx) ** 2 + (a[1] - cz) ** 2 - (b[0] - cx) ** 2 - (b[1] - cz) ** 2);
    let best;
    for (const [x, z] of candidates) {
      if (getTile(level, Math.floor(x), Math.floor(z)) !== TILE.WATER || fountainRimAt(level, x, z) !== null)
        continue;
      let radius = 0;
      for (let r = 0.15; r <= 0.75; r += 0.1) {
        let fits = true;
        for (let a = 0; a < 16; a++) {
          const xx = x + Math.cos((a * Math.PI) / 8) * r,
            zz = z + Math.sin((a * Math.PI) / 8) * r;
          if (
            getTile(level, Math.floor(xx), Math.floor(zz)) !== TILE.WATER ||
            fountainRimAt(level, xx, zz) !== null
          ) {
            fits = false;
            break;
          }
        }
        if (!fits) break;
        radius = r;
      }
      if (radius >= 0.25) {
        best = {
          x,
          z,
          radius,
          height: Math.min(1.9, headAt(level, x, z, WATER_SURFACE) - WATER_SURFACE - 0.35),
        };
        break;
      }
    }
    if (best?.height > 0.4) out.push(best);
  }
  return out;
}

/** Stable ballistic arc; phase 0 and 1 land at water height. */
export function fountainDrop(jet, angle, phase, central = false) {
  const t = Math.max(0, Math.min(1, phase)),
    reach = central ? 0.025 : jet.radius * 0.88;
  return [
    jet.x + Math.cos(angle) * reach * t,
    WATER_SURFACE + 0.02 + 4 * jet.height * (central ? 1 : 0.55) * t * (1 - t),
    jet.z + Math.sin(angle) * reach * t,
  ];
}
