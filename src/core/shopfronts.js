// Storefronts use existing v3 metadata: bit 1 = shop, bits 2–3 = identity.
// WALL remains solid for movement; FLOOR remains an unobstructed entrance.
import { TILE, getTile } from './level.js';
import { isShopFinish } from './finishes.js';

export const SHOPFRONT = 2;
export const SHOP_PROFILES = [
  { kind: 'shelves', names: ['PALISADE', 'THE GALLERY'], subtitle: 'DEPARTMENT STORE', color: '#ceaaa9', ink: '#46384b' },
  { kind: 'tv', names: ['VISION & SOUND', 'HI-FI CENTRE'], subtitle: 'HOME ELECTRONICS', color: '#688e91', ink: '#f4ece0' },
  { kind: 'arcade', names: ['ORBIT ARCADE', 'STAR ZONE'], subtitle: 'GAMES • VIDEO • FUN', color: '#6d648e', ink: '#f3d5e5' },
  { kind: 'cafe', names: ['ROSE CAFÉ', 'PALM COURT'], subtitle: 'COFFEE & REFRESHMENTS', color: '#bb939f', ink: '#fff0db' },
];

export function isShopfront(level, x, z) {
  const t = getTile(level, x, z);
  return (t === TILE.WALL || t === TILE.FLOOR) && !!(level.meta[z * level.w + x] & SHOPFRONT);
}

/** Facing the gallery, with a tiled/carpeted shop behind it. Stale markers are ignored. */
export function shopfrontNormal(level, x, z) {
  for (const n of [-1, 1]) {
    if (getTile(level, x, z - n) === TILE.FLOOR && isShopFinish(level.finish[(z - n) * level.w + x])
      && getTile(level, x, z + n) === TILE.FLOOR && !level.finish[(z + n) * level.w + x]) return n;
  }
  return 0;
}

/** Contiguous facade runs, including a closed shop's single door. */
export function shopfronts(level) {
  const out = [];
  for (let z = 1; z < level.h - 1; z++) for (let x = 1; x < level.w - 1; x++) {
    if (!isShopfront(level, x, z) || !shopfrontNormal(level, x, z)) continue;
    const x0 = x, n = shopfrontNormal(level, x, z), style = level.meta[z * level.w + x] >> 2;
    while (x + 1 < level.w - 1 && shopfrontNormal(level, x + 1, z) === n
      && (isShopfront(level, x + 1, z) && level.meta[z * level.w + x + 1] >> 2 === style
        || getTile(level, x + 1, z) === TILE.DOOR && isShopfront(level, x + 2, z))) x++;
    out.push({ x0, x1: x, z, n, style });
  }
  return out;
}
