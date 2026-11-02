// Møbler etter rommets funksjon i kjøpesenteret og kjelleren (se gen/furnish-rooms.js): matsal, handlegate, lager,
// boder, fyrrom, sovesaler og tørkerom. Ren logikk.
import { getTile, TILE } from '../core/level.js';
import { TIP } from '../core/object-tip.js';
import { put, tryPlace } from './furnish-sets.js';
import { edges, alongWalls, shuffled } from './room-tools.js';

const MAX_TABLES = 30; // i matsalen
const MAX_SHELVES = 14; // i ett lagerrom
const MAX_BUNKS = 10; // i én sovesal

const wideOf = (r) => r.x1 - r.x0 >= r.z1 - r.z0;
const inPool = (r, x, z) => r.pool && x >= r.pool.x0 - 1 && x <= r.pool.x1 + 1 && z >= r.pool.z0 - 1 && z <= r.pool.z1 + 1;

/** Bord i rutenett, med plass rundt fontenen, palmer i hjørnene og automater langs veggene. */
function foodcourt(level, rand, r) {
  let left = MAX_TABLES;
  for (let z = r.z0 + 2; z <= r.z1 - 2 && left > 0; z += 3) {
    for (let x = r.x0 + 2; x <= r.x1 - 2 && left > 0; x += 3) {
      if (inPool(r, x, z) || r.fronts.has(z * level.w + x) || rand() < 0.12) continue;
      if (put(level, rand() < 0.7 ? 'dinerset' : 'cafe', x, z, rand() < 0.5 ? 0 : 1)) left--;
    }
  }
  for (const [x, z] of [[r.x0, r.z0], [r.x1, r.z0], [r.x0, r.z1], [r.x1, r.z1]]) put(level, 'pottedpalm', x, z, 0);
  alongWalls(level, rand, edges(level, r, r.fronts), ['soda', 'soda', 'clock']);
}

/** Midt i gaten: benker og trær etter hverandre, og en kiosk som har stengt for godt. */
function promenade(level, rand, r) {
  const z = Math.floor((r.z0 + r.z1) / 2);
  for (let x = r.x0 + 4, k = 0; x <= r.x1 - 4; x += 5, k++) {
    if (k % 4 === 2 && put(level, 'kiosk', x, z, 0)) continue;
    put(level, k % 2 ? 'mallbench' : 'pottedtree', x, z, k % 4 === 1 ? 0 : 2);
  }
}

/** Lager: rader med hyller på langs, med gang imellom. */
function stockroom(level, rand, r) {
  const wide = wideOf(r);
  let left = MAX_SHELVES;
  const [a0, a1, b0, b1] = wide ? [r.x0, r.x1, r.z0, r.z1] : [r.z0, r.z1, r.x0, r.x1];
  for (let b = b0 + 1; b <= b1 - 1 && left > 0; b += 2) {
    for (let a = a0 + 1; a <= a1 - 2 && left > 0; a += 3) {
      const [x, z] = wide ? [a + 1, b] : [b, a + 1];
      if (!r.fronts.has(z * level.w + x) && put(level, 'shelf', x, z, wide ? 0 : 1)) left--;
    }
  }
}

/** En bod: en hylle, noe som er satt bort, eller ingenting. */
function cage(level, rand, r) {
  const spots = shuffled(rand, edges(level, r, r.fronts));
  const roll = rand();
  const items = roll < 0.35 ? ['wallshelf'] : roll < 0.55 ? ['tv', 'boombox'] : roll < 0.7 ? ['woodenchair'] : roll < 0.8 ? ['armchair'] : [];
  for (const id of items) {
    for (const [x, z] of spots.splice(0, 4)) {
      const o = tryPlace(level, x, z, id, 1);
      if (!o) continue;
      if (id === 'woodenchair' && rand() < 0.5) o.tip = TIP.BACK; // satt bort med beina i været
      break;
    }
  }
}

/** Fyrrommet: kjeler langs veggene og en hylle med reservedeler. */
function boiler(level, rand, r) {
  alongWalls(level, rand, edges(level, r, r.fronts), ['boiler', 'boiler', 'boiler', 'boiler', 'boiler', 'boiler', 'wallshelf', 'clock']);
}

/** Sovesal: køyesenger langs veggene, et bord med stoler midt i rommet. */
function bunks(level, rand, r) {
  const spots = edges(level, r, r.fronts).filter(([x, z]) => (wideOf(r) ? x : z) % 2 === 0);
  alongWalls(level, rand, spots, Array(MAX_BUNKS).fill('bunkbed'));
  const [x, z] = [Math.floor((r.x0 + r.x1) / 2), Math.floor((r.z0 + r.z1) / 2)];
  if (getTile(level, x, z) === TILE.FLOOR && put(level, 'table', x, z, wideOf(r) ? 0 : 1)) {
    for (const s of [-1, 1]) if (rand() < 0.7) put(level, 'woodenchair', x + (wideOf(r) ? 0 : s), z + (wideOf(r) ? s : 0), wideOf(r) ? (s < 0 ? 0 : 2) : (s < 0 ? 1 : 3));
  }
}

/** Tørkerom: tomt, bare en vaskemaskin som er satt til side og en stol. */
function drying(level, rand, r) {
  alongWalls(level, rand, edges(level, r, r.fronts), rand() < 0.5 ? ['washer', 'woodenchair'] : ['plasticchair']);
}

export const CELLAR_ROOMS = { foodcourt, promenade, stockroom, cage, boiler, bunks, drying };
