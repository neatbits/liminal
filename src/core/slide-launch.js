// Hold rennen vannrett til hele bredden er klar av startplattformen.
import { TILE, getTile } from './level.js';
import { groundAt } from './heights.js';

function touchesPlatform(level, x, z, height, radius) {
  for (let cz = Math.floor(z - radius); cz <= Math.floor(z + radius); cz++) {
    for (let cx = Math.floor(x - radius); cx <= Math.floor(x + radius); cx++) {
      if (getTile(level, cx, cz) === TILE.WALL) continue;
      const dx = x - Math.max(cx, Math.min(cx + 1, x));
      const dz = z - Math.max(cz, Math.min(cz + 1, z));
      if (dx * dx + dz * dz > radius * radius) continue;
      if (groundAt(level, cx + 0.5, cz + 0.5, height) >= height - 0.001) return true;
    }
  }
  return false;
}

/** Beregnes fra rommet også ved cachetreff, så redigering av platåkanten oppdaterer banen. */
export function launchLength(level, points, height, minimum, radius, step) {
  let last = 0;
  for (const [x, z, s] of points) {
    if (touchesPlatform(level, x, z, height, radius)) last = s;
    else if (s >= minimum) break;
  }
  return Math.max(minimum, last + step);
}
