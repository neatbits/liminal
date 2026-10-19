// Gjenstander i genererte rom, valgt etter temaet: skrivebord med laptop på kontoret, TV i
// kjellerstua, ender i bassengene, en «elektronikkbutikk» med TV-er på rad i kjøpesenteret –
// og bare en og annen forlatt TV eller boombox i de tommeste rommene. Ren logikk.
import { TILE, getTile } from '../core/level.js';
import { FACING, placeObject, objectsAt } from '../core/objects.js';

const DIRS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

/**
 * Per tema: { id | set, every } – én per `every` m² gulv (eller vannruter for ender); en
 * brøkdel blir en sjanse, så store rom får flere og små rom kanskje ingen.
 * set 'desk' = skrivebord med noe oppå, 'tvrow' = tre TV-er på rad mot en vegg.
 */
const PLANS = {
  backrooms: [{ id: 'tv', every: 1100 }, { id: 'boombox', every: 1600 }],
  office: [{ set: 'desk', every: 110 }, { id: 'tv', every: 1500 }],
  basement: [{ id: 'tv', every: 1200, min: 1 }, { id: 'boombox', every: 900 }, { set: 'desk', every: 700 }],
  pool: [{ id: 'duck', water: true, every: 70 }, { id: 'boombox', every: 1000 }],
  playroom: [{ id: 'duck', water: true, every: 110 }, { id: 'tv', every: 700 }, { id: 'boombox', every: 900 }],
  hotel: [{ id: 'tv', every: 800 }],
  garage: [{ id: 'boombox', every: 1500 }, { id: 'tv', every: 2200 }],
  mall: [{ set: 'tvrow', every: 1400, min: 1 }, { set: 'desk', every: 1000 }, { id: 'boombox', every: 1200 }],
  // rooms: bare i rommene, ikke i korridorer med skap eller på badene (ruter med belegg).
  school: [{ set: 'desk', every: 110, rooms: true }, { id: 'tv', every: 700, rooms: true }, { id: 'boombox', every: 1500, rooms: true }],
  ward: [{ id: 'tv', every: 260, rooms: true }, { set: 'desk', every: 900, rooms: true }],
};

const ON_DESK = [
  ['laptop', 0.6],
  ['tv', 0.25],
  ['boombox', 0.15],
];

function count(rand, amount, every, min = 0) {
  const n = amount / every;
  return Math.max(min, Math.floor(n) + (rand() < n % 1 ? 1 : 0));
}

/** Gulvruter med vegg på minst én side, ikke ved dører/trapper og ikke nær startpunktet. */
function wallSpots(level, spawn) {
  const out = [];
  for (let z = 1; z < level.h - 1; z++) {
    for (let x = 1; x < level.w - 1; x++) {
      if (getTile(level, x, z) !== TILE.FLOOR) continue;
      if (Math.hypot(x + 0.5 - spawn.x, z + 0.5 - spawn.z) < 3) continue;
      const around = DIRS.map(([dx, dz]) => getTile(level, x + dx, z + dz));
      if (!around.includes(TILE.WALL) || around.includes(TILE.DOOR) || around.includes(TILE.STAIRS)) continue;
      out.push([x, z]);
    }
  }
  return out;
}

/** Er det åpent gulv `n` ruter foran gjenstanden (så den ikke stenger en smal gang)? */
function roomInFront(level, o, n) {
  const [fx, fz] = FACING[o.rot];
  for (let k = 1; k <= n; k++) if (getTile(level, o.x + fx * k, o.z + fz * k) !== TILE.FLOOR) return false;
  return true;
}

function take(list, rand) {
  return list.splice(Math.floor(rand() * list.length), 1)[0];
}

/** Setter inn gjenstanden i ruten; tar den tilbake hvis den stenger for mye. */
function tryPlace(level, x, z, id, front = 1) {
  if (objectsAt(level, x, z).length || !placeObject(level, x, z, id)) return null;
  const o = level.objects[level.objects.length - 1];
  if (roomInFront(level, o, front)) return o;
  level.objects = level.objects.slice(0, -1);
  return null;
}

function pick(rand, weights) {
  let r = rand();
  for (const [id, w] of weights) if ((r -= w) < 0) return id;
  return weights[0][0];
}

/** Møblerer et generert rom etter temaet. Returnerer antall gjenstander som ble satt inn. */
export function furnish(level, rand, spawn = level.spawn) {
  const plan = PLANS[level.theme];
  if (!plan) return 0;
  const before = level.objects.length;
  const spots = wallSpots(level, spawn);
  const floor = level.tiles.filter((t) => t === TILE.FLOOR).length;
  const water = [];
  level.tiles.forEach((t, i) => t === TILE.WATER && water.push([i % level.w, (i / level.w) | 0]));
  for (const item of plan) {
    const n = count(rand, item.water ? water.length : floor, item.every, item.min);
    for (let k = 0, tries = 0; k < n && tries < n * 20; tries++) {
      if (item.water) {
        if (!water.length) break;
        const [x, z] = take(water, rand);
        if (placeObject(level, x, z, 'duck')) k++;
        continue;
      }
      if (!spots.length) break;
      const [x, z] = take(spots, rand);
      if (item.rooms && level.finish[z * level.w + x]) continue;
      if (item.set === 'desk') {
        if (!tryPlace(level, x, z, 'desk', 2)) continue;
        if (rand() < 0.85) placeObject(level, x, z, pick(rand, ON_DESK));
      } else if (item.set === 'tvrow') {
        // Tre TV-er ved siden av hverandre langs veggen (en butikk som aldri stengte).
        const o = tryPlace(level, x, z, 'tv', 1);
        if (!o) continue;
        const [fx, fz] = FACING[o.rot];
        for (const s of [-1, 1]) tryPlace(level, x - fz * s, z + fx * s, 'tv', 1);
      } else if (!tryPlace(level, x, z, item.id, 1)) {
        continue;
      }
      k++;
    }
  }
  return level.objects.length - before;
}

export { PLANS };
