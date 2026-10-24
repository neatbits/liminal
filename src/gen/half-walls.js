// Open a few existing wall runs, keeping full-height end piers and a lintel.
// The low partition still blocks the original route; no rooms become disconnected.
import { TILE, getTile, setTile } from '../core/level.js';
import { ceilingAt, HEADROOM } from '../core/heights.js';
import { MAX_OBJECTS, objectFits } from '../core/objects.js';

function fits(level, x, z, dx, dz) {
  for (let k = -2; k <= 2; k++) {
    if (getTile(level, x + k * dx, z + k * dz) !== TILE.WALL) return false;
    if (Math.abs(k) === 2) continue;
    for (const n of [-2, -1, 1, 2]) {
      if (getTile(level, x + k * dx - n * dz, z + k * dz + n * dx) !== TILE.FLOOR) return false;
    }
  }
  return true;
}

export function addHalfWalls(level, rand) {
  if (level.theme !== 'backrooms') return 0;
  const candidates = [];
  for (let z = 3; z < level.h - 3; z++) for (let x = 3; x < level.w - 3; x++) {
    for (const [dx, dz] of [[1, 0], [0, 1]]) if (fits(level, x, z, dx, dz)) candidates.push({ x, z, dx, dz });
  }
  const limit = Math.min(8, Math.max(1, Math.floor(level.w * level.h / 550)));
  const placed = [];
  while (candidates.length && placed.length < limit && level.objects.length < MAX_OBJECTS) {
    const i = Math.floor(rand() * candidates.length);
    const p = candidates.splice(i, 1)[0], { x, z, dx, dz } = p;
    if (placed.some(q => Math.hypot(q.x - x, q.z - z) < 7) || !fits(level, x, z, dx, dz)) continue;
    const head = Math.max(HEADROOM, Math.round((ceilingAt(level, x - dz, z + dx) - 0.3) * 10) / 10);
    const cells = [-1, 0, 1].map(k => [x + k * dx, z + k * dz]);
    for (const [cx, cz] of cells) setTile(level, cx, cz, TILE.FLOOR);
    const o = { id: 'halfwall', x, z, rot: dz ? 1 : 0 };
    if (!objectFits(level, o)) {
      for (const [cx, cz] of cells) setTile(level, cx, cz, TILE.WALL);
      continue;
    }
    for (const [cx, cz] of cells) level.ceilings[cz * level.w + cx] = Math.round(head * 10);
    level.objects = [...level.objects, o];
    placed.push(p);
  }
  return placed.length;
}
