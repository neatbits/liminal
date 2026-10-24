// Startpunkt: sørger for at spilleren alltid starter på en gangbar rute.
import { TILE, getTile, inBounds } from './level.js';
import { pillarContains } from './pillars.js';
import { halfWallContains } from './half-walls.js';

const DIRS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

export function isWalkableCell(level, x, z) {
  const t = getTile(level, x, z);
  return t !== TILE.WALL && t !== TILE.PILLAR && !pillarContains(level, x + .5, z + .5, .3) && !halfWallContains(level, x + .5, z + .5, .3);
}

/** Nærmeste gangbare rute fra (x, z) via bredde-først-søk, eller null om rommet er tomt. */
export function nearestWalkable(level, x, z) {
  const sx = Math.min(level.w - 1, Math.max(0, Math.floor(x)));
  const sz = Math.min(level.h - 1, Math.max(0, Math.floor(z)));
  if (isWalkableCell(level, sx, sz)) return [sx, sz];
  const seen = new Uint8Array(level.w * level.h);
  const queue = [[sx, sz]];
  seen[sz * level.w + sx] = 1;
  for (let head = 0; head < queue.length; head++) {
    const [cx, cz] = queue[head];
    for (const [dx, dz] of DIRS) {
      const nx = cx + dx;
      const nz = cz + dz;
      if (!inBounds(level, nx, nz) || seen[nz * level.w + nx]) continue;
      if (isWalkableCell(level, nx, nz)) return [nx, nz];
      seen[nz * level.w + nx] = 1;
      queue.push([nx, nz]);
    }
  }
  return null;
}

/** Antall frie ruter i en retning (for å velge en fin startretning). */
function freeRun(level, x, z, dx, dz, max = 30) {
  let n = 0;
  while (n < max && isWalkableCell(level, x + dx * (n + 1), z + dz * (n + 1))) n++;
  return n;
}

/** Vinkel (yaw) som ser mot retning (dx, dz). Yaw 0 ser mot -z (opp i skissen). */
export function yawFromDir(dx, dz) {
  return Math.atan2(-dx, -dz);
}

/** Gyldig startpunkt { x, z, a } – beholder lagret posisjon hvis den er gangbar. */
export function resolveSpawn(level) {
  const s = level.spawn;
  if (isWalkableCell(level, Math.floor(s.x), Math.floor(s.z))) return { ...s };
  const cell = nearestWalkable(level, s.x, s.z);
  if (!cell) return null;
  return { x: cell[0] + 0.5, z: cell[1] + 0.5, a: s.a };
}

/** Velger et godt startpunkt nær midten med blikket mot den lengste frie retningen. */
export function autoSpawn(level) {
  const cell = nearestWalkable(level, level.w / 2, level.h / 2);
  if (!cell) return { x: level.w / 2, z: level.h / 2, a: 0 };
  const [x, z] = cell;
  let best = DIRS[0];
  let bestRun = -1;
  for (const d of DIRS) {
    const run = freeRun(level, x, z, d[0], d[1]);
    if (run > bestRun) {
      bestRun = run;
      best = d;
    }
  }
  return { x: x + 0.5, z: z + 0.5, a: yawFromDir(best[0], best[1]) };
}
