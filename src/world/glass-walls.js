// Glasset i glassveggene (gjenstanden `glasswall`, rammen ligger i world/props-rooms.js). Rutene legges i
// samme flategruppe som butikkvinduene, så de deler materialet (world/shop-glass.js).
import { HALF_WALL, GLASS_WALL } from '../core/half-walls.js';
import { floorAt } from '../core/heights.js';
import { faceQuad } from './mesher.js';

export function addGlassWalls(level, glass) {
  const half = HALF_WALL.width / 2 - 0.03;
  for (const o of level.objects ?? []) {
    if (o.id !== 'glasswall') continue;
    const [cx, cz] = [o.x + 0.5, o.z + 0.5];
    const [lo, hi] = [floorAt(level, o.x, o.z) + 0.08, floorAt(level, o.x, o.z) + GLASS_WALL.height - 0.05];
    const [ax, az, bx, bz] = o.rot & 1 ? [cx, cz - half, cx, cz + half] : [cx - half, cz, cx + half, cz];
    faceQuad(glass, [[ax, lo, az], [bx, lo, bz], [bx, hi, bz], [ax, hi, az]], o.rot & 1 ? [1, 0, 0] : [0, 0, 1]);
  }
}
