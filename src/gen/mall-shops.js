// Butikkene i kjøpesenteret: teppe på gulvet og ryddig innredning etter butikktypen – rader med
// tomme hyllereoler, TV-er langs bakveggen, bare skranken igjen, eller helt tomt. Ren logikk.
import { rectIndices } from '../core/ops.js';
import { fillZone, FINISH } from '../core/zones.js';
import { objectFits } from '../core/objects.js';
import { SHOP_PROFILES } from '../core/shopfronts.js';
import { electronicsShop } from './furnish-electronics.js';

/** Gjenstandene butikkene kan få (til testene). */
export const SHOP_ITEMS = ['shelf', 'wallshelf', 'cosmeticsshelf', 'pharmacyshelf', 'vhsshelf', 'vhsplayer', 'minifridge', 'counter', 'register', 'tv', 'tvbench', 'table', 'hifi', 'walkman', 'retropcdesktop', 'retropctower', 'retropccompact', 'retropcterminal', 'arcade2', 'soda', 'cafe', 'dinerset', 'pottedplant'];

const KINDS = [
  ['shelves', 0.4],
  ['tv', 0.12],
  ['arcade', 0.13],
  ['empty', 0.22],
  ['bare', 0.13],
];

function kindOf(rand, closed) {
  if (closed) return rand() < 0.5 ? 'empty' : 'bare';
  let r = rand();
  for (const [k, p] of KINDS) if ((r -= p) < 0) return k;
  return 'bare';
}

/** Setter inn gjenstanden med gitt retning om den får plass. */
function put(level, id, x, z, rot) {
  const o = { id, x, z, rot };
  const next = [...(level.objects ?? []), o];
  if (!objectFits({ ...level, objects: next }, o, next)) return false;
  level.objects = next;
  return true;
}

/**
 * @param shops [{ x0, z0, x1, z1, front, closed }] – front = raden med butikkfronten (over eller
 *        under rommet)
 * @returns {string[]} butikktypene, i samme rekkefølge
 */
export function furnishShops(level, rand, shops) {
  return shops.map((s) => {
    fillZone(level, 'finish', rectIndices(level, s), FINISH.TILES);
    const d = s.front < s.z0 ? 1 : -1; // innover i butikken (fra fronten mot bakveggen)
    const back = d > 0 ? s.z1 : s.z0; // raden inntil bakveggen
    const frontRow = d > 0 ? s.z0 : s.z1; // raden innenfor fronten
    const toFront = d > 0 ? 2 : 0; // FACING: forsiden mot fronten
    const kind = s.closed ? kindOf(rand, true) : SHOP_PROFILES[s.style ?? 0].kind;
    if (kind === 'tv') {
      electronicsShop(level, s, back, toFront);
    }
    if (kind === 'shelves') {
      // Bred kosmetikkreol og smalere apotek-/veggreoler langs bakveggen.
      const wide = s.x1 - s.x0 >= 4 && put(level, 'cosmeticsshelf', s.x0 + 2, back, toFront);
      for (let x = s.x0 + (wide ? 5 : 1), k = 0; x <= s.x1 - 1; x += 2, k++) {
        put(level, k % 2 === 0 ? 'pharmacyshelf' : 'wallshelf', x, back, toFront);
      }
    }
    if (kind === 'arcade') {
      // Spillehall: arkademaskiner side om side langs bakveggen, og en brusautomat i hjørnet.
      for (let x = s.x0 + 1; x <= s.x1 - 1; x++) put(level, 'arcade2', x, back, toFront);
      put(level, 'soda', s.x1, back, toFront);
    }
    if (kind === 'shelves') {
      // Rader med tosidige reoler, med god plass til å gå mellom dem og mot fronten.
      for (let z = back - d * 3; (z - frontRow) * d >= 3; z -= d * 3) {
        for (let x = s.x0 + 2; x + 2 <= s.x1 - 1; x += 3) put(level, 'shelf', x, z, 0);
      }
    }
    if (kind === 'cafe') {
      put(level, 'minifridge', s.x0, back, toFront);
      for (let x = s.x0 + 2; x < s.x1 - 1; x += 3) put(level, 'dinerset', x, back - d, toFront);
      put(level, 'pottedplant', s.x0 + 1, back, toFront);
    }
    if (kind === 'tv' || kind === 'shelves') {
      // The double-sided rental rack fits against a side wall, clear of the centre entrance.
      put(level, 'vhsshelf', s.x0, Math.floor((s.z0 + s.z1) / 2), 3);
    }
    if (kind !== 'bare') {
      // Skranken innenfor fronten, langs den ene sideveggen, med kunden ut mot butikken.
      const left = rand() < 0.5;
      const cx = left ? s.x0 + 1 : s.x1 - 1;
      if (put(level, 'counter', cx, frontRow + d * 2, left ? 3 : 1)) put(level, kind === 'tv' ? 'walkman' : 'register', cx, frontRow + d * 2, left ? 3 : 1);
      if (kind === 'tv') {
        const vx = left ? s.x1 - 1 : s.x0 + 1, rot = left ? 1 : 3;
        if (put(level, 'counter', vx, frontRow + d * 2, rot)) put(level, 'vhsplayer', vx, frontRow + d * 2, rot);
      }
    }
    return kind;
  });
}
