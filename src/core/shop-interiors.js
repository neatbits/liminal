// Derive shop finishes from saved facade identities and connected finish cells.
// No extra room layers: old/shared malls receive the same interiors on reload.
import { TILE, getTile } from './level.js';
import { FINISHES, isShopFinish } from './finishes.js';
import { shopfronts } from './shopfronts.js';

export const SHOP_INTERIORS = [
  {
    kind: 'shelves', label: 'Department store', step: 'tile',
    floor: { tex: 'retailFloor', size: [2.4, 2.4], gloss: { amount: .18, grid: 4 } },
    wall: { tex: 'mallWall', size: [2, 2], map2: { tex: 'hotelWood', size: [1.2, 1.2], split: .95, trim: { h: .035, color: '#a28a6d' } }, base: { h: .09, color: '#655a51' } },
    ceiling: { tex: 'plaster', size: [2, 2] },
  },
  {
    kind: 'tv', label: 'Electronics', step: 'tile',
    floor: { tex: 'electronicsFloor', size: [2.4, 2.4], gloss: { amount: .25, grid: 4 } },
    wall: { tex: 'electronicsWall', size: [2.4, 2.4], base: { h: .12, color: '#343d4b' } },
    ceiling: { tex: 'ceilingTiles', size: [1.2, 1.2] },
  },
  {
    kind: 'arcade', label: 'Arcade', step: 'carpet',
    floor: { tex: 'arcadeCarpet', size: [3.6, 3.6] },
    wall: { tex: 'arcadeWall', size: [4.8, 3.2], map2: { tex: 'arcadePanel', size: [1.2, 1.2], split: 1.05, trim: { h: .025, color: '#657fc5' } }, base: { h: .12, color: '#20212b' } },
    ceiling: { tex: 'ceilingTiles', size: [1.2, 1.2] },
  },
  {
    kind: 'cafe', label: 'Café', step: 'tile',
    floor: { tex: 'cafeFloor', size: [2.4, 2.4], gloss: { amount: .15, grid: 8 } },
    wall: { tex: 'mallWall', size: [2, 2], map2: { tex: 'cafeTiles', size: [1.2, 1.2], split: 1.15, trim: { h: .045, color: '#927464' } }, base: { h: .1, color: '#644c48' } },
    ceiling: { tex: 'plaster', size: [2, 2] },
  },
];

/** 0 = ordinary theme, 1–4 = facade style + 1. Flood only within finished shop floors. */
function automaticInteriors(level, map) {
  const queue = [];
  const add = (x, z, style) => {
    if (x < 0 || z < 0 || x >= level.w || z >= level.h) return;
    const i = z * level.w + x, tile = getTile(level, x, z);
    if (map[i] || !isShopFinish(level.finish[i]) || tile !== TILE.FLOOR && tile !== TILE.PILLAR) return;
    map[i] = style; queue.push(i);
  };
  // Seed all facades first: editing two shops into one open room yields a stable nearest finish.
  for (const s of shopfronts(level)) {
    if (!SHOP_INTERIORS[s.style]) continue;
    for (let x = s.x0; x <= s.x1; x++) add(x, s.z - s.n, s.style + 1);
  }
  for (let k = 0; k < queue.length; k++) {
    const i = queue[k], x = i % level.w, z = Math.floor(i / level.w);
    add(x - 1, z, map[i]); add(x + 1, z, map[i]); add(x, z - 1, map[i]); add(x, z + 1, map[i]);
  }
}

/** Explicit painted finishes work in any theme and override generated shop identities. */
export function shopInteriorMap(level) {
  const map = new Uint8Array(level.tiles.length);
  if (level.theme === 'mall') automaticInteriors(level, map);
  for (let i = 0; i < map.length; i++) {
    const style = FINISHES[level.finish[i]]?.style;
    if (style !== undefined && level.tiles[i] !== TILE.WALL && level.tiles[i] !== TILE.WATER) map[i] = style + 1;
  }
  return map;
}
