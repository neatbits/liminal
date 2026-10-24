// Glass display windows, fascia and signs on both storeys. Collision uses the wall cells.
import { TILE, getTile } from '../core/level.js';
import { ceilingAt } from '../core/heights.js';
import { shopfronts, isShopfront, shopfrontNormal } from '../core/shopfronts.js';
import { openSpans } from './decks.js';
import { MeshData, faceQuad, orientedBox } from './mesher.js';

export function buildShopfronts(level, field) {
  const out = Object.fromEntries(['shopGlass', 'shopFrame', 'shopSigns', 'shopFascia', 'shopFloor', 'shopCeiling', 'shopReveal'].map(k => [k, new MeshData(field)]));
  for (const s of shopfronts(level)) {
    for (let x = s.x0; x <= s.x1; x++) {
      const z = s.z, fz = z + 0.5 + s.n * 0.48;
      const wall = getTile(level, x, z) === TILE.WALL;
      const door = getTile(level, x, z) === TILE.DOOR;
      const spans = openSpans(level, x, z - s.n);
      const box = (mesh, x0, x1, z0, z1, y0, y1) => orientedBox(mesh, [x0, z0], [1, 0], x1 - x0, [0, 1], 0, z1 - z0, y0, y1);
      for (const [storey, sp] of spans.entries()) {
        // A glazed wall opens the whole depth of its cell. Close the exposed sides
        // against solid piers, including slab thickness, before building the window.
        for (const dx of [-1, 1]) {
          const adjacent = getTile(level, x + dx, z);
          const glazed = adjacent === TILE.WALL && isShopfront(level, x + dx, z) && shopfrontNormal(level, x + dx, z);
          const entrance = wall && adjacent === TILE.FLOOR;
          if (!entrance && (adjacent !== TILE.WALL && adjacent !== TILE.DOOR || glazed)) continue;
          const edge = x + (dx > 0 ? 1 : 0);
          const face = entrance ? edge - dx * .04 : edge;
          const start = dx > 0 ? z : z + 1, end = dx > 0 ? z + 1 : z;
          const lo = Math.max(storey ? spans[storey - 1].hi : sp.lo,
            adjacent === TILE.DOOR ? ceilingAt(level, x + dx, z) : -Infinity);
          out.shopReveal.wall(face, start, face, end, [-dx, 0, 0], start, end,
            lo, sp.hi, [1, 1], { bottom: false, top: false }, sp.base);
          // The recess end is a panel, visible from both sides of the projecting bay.
          // Give its backing real thickness and separately baked inward/outward light.
          const back = entrance ? edge : edge + dx * .04;
          out.shopReveal.wall(back, end, back, start, [dx, 0, 0], end, start,
            lo, sp.hi, [1, 1], { bottom: false, top: false }, sp.base);
        }
        const head = Math.min(sp.lo + 2.65, sp.hi - 0.3);
        if (head < sp.lo + 0.5) continue;
        box(out.shopFascia, x, x + 1, z, z + 1, head, sp.hi);
        box(out.shopFrame, x, x + 1, fz - 0.035, fz + 0.035, head - 0.045, head + 0.025);
        // Ordinary door cells have no deck. Bridge the upper threshold explicitly;
        // ground-level door geometry and open floor entrances keep their own floor.
        if (wall || door && storey) {
          // Floor/soffit continues underneath the glazing, avoiding a dark missing metre.
          faceQuad(out.shopFloor, [[x, sp.lo, z], [x + 1, sp.lo, z], [x + 1, sp.lo, z + 1], [x, sp.lo, z + 1]], [0, 1, 0], [[x, z], [x + 1, z], [x + 1, z + 1], [x, z + 1]]);
          faceQuad(out.shopCeiling, [[x, sp.hi, z], [x + 1, sp.hi, z], [x + 1, sp.hi, z + 1], [x, sp.hi, z + 1]], [0, -1, 0]);
          if (door) {
            const underside = spans[storey - 1].hi;
            faceQuad(out.shopCeiling, [[x, underside, z], [x + 1, underside, z], [x + 1, underside, z + 1], [x, underside, z + 1]], [0, -1, 0]);
          }
        }
        if (!wall) continue;
        box(out.shopFrame, x, x + 1, fz - 0.04, fz + 0.04, sp.lo, sp.lo + 0.1);
        box(out.shopFrame, x, x + 0.035, fz - 0.04, fz + 0.04, sp.lo, head);
        box(out.shopFrame, x + 0.965, x + 1, fz - 0.04, fz + 0.04, sp.lo, head);
        faceQuad(out.shopGlass, [[x + 0.035, sp.lo + 0.1, fz], [x + 0.965, sp.lo + 0.1, fz], [x + 0.965, head, fz], [x + 0.035, head, fz]], [0, 0, s.n]);
      }
    }
    const mid = (s.x0 + s.x1 + 1) / 2;
    const x = Math.floor(mid), z = s.z, width = Math.min(5, s.x1 - s.x0 + 0.5);
    for (const [storey, sp] of openSpans(level, x, z - s.n).entries()) {
      const head = Math.min(sp.lo + 2.65, sp.hi - 0.3);
      if (head < sp.lo + 0.5) continue;
      const low = head + 0.08, high = Math.min(sp.hi - 0.06, low + 0.55);
      const row = s.style + storey * 4;
      const at = (a, y) => [mid + a * s.n, y, z + 0.5 + s.n * 0.505];
      faceQuad(out.shopSigns, [at(-width / 2, low), at(width / 2, low), at(width / 2, high), at(-width / 2, high)], [0, 0, s.n],
        [[0, 1 - (row + 1) / 8], [1, 1 - (row + 1) / 8], [1, 1 - row / 8], [0, 1 - row / 8]]);
    }
  }
  return out;
}
