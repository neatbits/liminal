// PCs need deep tables; TVs keep their low benches and the hi-fi includes its own stand.
import { RETRO_PC_IDS } from '../core/object-catalog-electronics.js';
import { put } from './furnish-sets.js';

export function displayStand(level, id, x, z, rot) {
  const before = level.objects;
  const stand=id==='pc'||RETRO_PC_IDS.includes(id)?'table':'tvbench';
  if (put(level, stand, x, z, rot) && put(level, id, x, z, rot)) return true;
  level.objects = before;
  return false;
}

export function electronicsShop(level, shop, back, toFront) {
  const hi = put(level, 'hifi', shop.x0 + 1, back, toFront);
  for (let x = shop.x0 + (hi ? 4 : 1), k = 0; x + 1 <= shop.x1; x += 3, k++) {
    const id = k % 2 ? 'tv' : RETRO_PC_IDS[(shop.x0 + shop.x1 + back + k) % RETRO_PC_IDS.length];
    if (!displayStand(level, id, x, back, toFront)) put(level, 'tv', x, back, toFront);
  }
}
