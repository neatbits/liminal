// Thin, waist-high partitions. Stored as ordinary objects, so existing room files,
// undo, sharing and the object tool all retain their position and rotation.
import { floorAt } from './heights.js';

export const HALF_WALL = { width: 3, height: 1.1, depth: 0.28, bodyDepth: 0.22, cap: 0.035 };

// Object lists are immutable. Avoid scanning every shop item for each navigation cell.
const cache = new WeakMap(), empty = [];
function wallObjects(level) {
  const objects = level.objects;
  if (!objects) return empty;
  let walls = cache.get(objects);
  if (!walls) { walls = objects.filter(o => o.id === 'halfwall'); cache.set(objects, walls); }
  return walls;
}

export function halfWallBox(o, depth = HALF_WALL.depth) {
  const { width } = HALF_WALL;
  const [w, d] = o.rot & 1 ? [depth, width] : [width, depth];
  return [o.x + 0.5 - w / 2, o.z + 0.5 - d / 2, o.x + 0.5 + w / 2, o.z + 0.5 + d / 2];
}

export function halfWalls(level) {
  return wallObjects(level).map(o => {
    const bottom = floorAt(level, o.x, o.z);
    return { box: halfWallBox(o), bodyBox: halfWallBox(o, HALF_WALL.bodyDepth), bottom, top: bottom + HALF_WALL.height };
  });
}

/** Navigation and spawning use the same footprint as the player collider. */
export function halfWallContains(level, x, z, radius = 0) {
  return wallObjects(level).some(o => {
    const [x0, z0, x1, z1] = halfWallBox(o);
    const dx = x - Math.max(x0, Math.min(x, x1));
    const dz = z - Math.max(z0, Math.min(z, z1));
    return dx * dx + dz * dz <= radius * radius;
  });
}

/** Segment against the actual low volume: light and sight can pass above it. */
function volumeOccludes(box, bottom, top, x0, y0, z0, x1, y1, z1) {
  const [ax, az, bx, bz] = box;
  let enter = 0, leave = 1;
  for (const [a, b, lo, hi] of [[x0, x1, ax, bx], [y0, y1, bottom, top], [z0, z1, az, bz]]) {
    const d = b - a;
    if (Math.abs(d) < 1e-9) {
      if (a <= lo + 1e-4 || a >= hi - 1e-4) return false;
    } else {
      const t0 = (lo + 1e-4 - a) / d, t1 = (hi - 1e-4 - a) / d;
      enter = Math.max(enter, Math.min(t0, t1));
      leave = Math.min(leave, Math.max(t0, t1));
      if (enter >= leave) return false;
    }
  }
  return leave > 1e-6 && enter < 1 - 1e-6;
}

export function halfWallOccludes(walls, x0, y0, z0, x1, y1, z1) {
  return walls.some(({ box, bodyBox, bottom, top }) => {
    // The projecting cap must not make the thinner wallpaper faces shadow themselves.
    return volumeOccludes(bodyBox, bottom, top - HALF_WALL.cap, x0, y0, z0, x1, y1, z1) ||
      volumeOccludes(box, top - HALF_WALL.cap, top, x0, y0, z0, x1, y1, z1);
  });
}
