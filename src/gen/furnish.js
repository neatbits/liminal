// Gjenstander i genererte rom, valgt etter temaet: skrivebord med stol og PC på kontoret, TV-hjørne
// med sofa i kjellerstua, ender i bassengene, brusautomater i gangene, arkademaskiner i butikkene
// – og bare en og annen forlatt TV, stol eller arkademaskin i de tommeste rommene. Oppsettene
// ligger i furnish-sets.js. Ren logikk.
import { TILE, getTile } from '../core/level.js';
import { placeObject, objectsAt, MAX_OBJECTS } from '../core/objects.js';
import { PLAY_BALL_LIMIT } from '../core/play-balls.js';
import { softBuild } from './softplay.js';
import { doorFrontCells } from './door-space.js';
import { addDivingBoards } from './diving.js';
import { scatterPlayBalls } from './play-balls.js';
import { patient } from './furnish-medical.js';
import { mallTraffic } from './mall-traffic.js';
import { addHalfWalls } from './half-walls.js';
import { tryPlace, desk, gaming, foodspot, chairs, arcades, tvrow, table, poolside, tvstand } from './furnish-sets.js';

const DIRS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

/**
 * Per tema: { id | set, every } – én per `every` m² gulv (eller vannruter for ender); en brøkdel
 * blir en sjanse, så store rom får flere og små rom kanskje ingen. min = minst så mange.
 * Oppsett (set): 'desk', 'gaming', 'livingroom' (gaming + sofa), 'tvstand' (TV på TV-benk), 'foodspot', 'chairs', 'arcades',
 * 'tvrow' (furnish-sets.js), 'table' (dinersett eller kafébord) og 'softplay' (lekeklosser).
 * open = midt på gulvet (ikke mot en vegg), ceiling = under taket, unna taklysene (takvifter),
 * rooms = ikke på ruter med belegg (korridorer med skap, bad, butikker med teppe), shore = på
 * gulvet langs bassengkanten ('poolside': plaststoler eller solsenger mot vannet), water = i vannet (flytende).
 * { set: 'diving' }: stupebrett ved noen av bassengene (gen/diving.js).
 */
const PLANS = {
  backrooms: [{ set: 'halfwalls' }, { set: 'foodspot', every: 2200 }, { id: 'arcade2', every: 3500 }, { id: 'dinerchair', open: true, every: 2500 }, { id: 'plasticchair', open: true, every: 2500 }, { id: 'clock', every: 1400 }, { id: 'tv', every: 1100 }, { id: 'boombox', every: 1600 }, { id: 'soda', every: 3000 }],
  office: [{ set: 'desk', every: 110 }, { id: 'wallboard', every: 600 }, { id: 'whiteboard', every: 1000 }, { id: 'armchair', every: 1200 }, { id: 'sofa', every: 1600 }, { id: 'soda', every: 1500 }, { id: 'clock', every: 300 }, { id: 'tv', every: 1500 }, { set: 'table', open: true, every: 1500 }, { id: 'pottedplant', every: 650 }, { id: 'minifridge', every: 1600, rooms: true }],
  basement: [{ set: 'livingroom', every: 1000, min: 1, rooms: true }, { id: 'sofa', every: 1400, rooms: true }, { id: 'fan', ceiling: true, every: 300, rooms: true }, { id: 'clock', every: 500 }, { set: 'tvstand', every: 1600, rooms: true }, { id: 'boombox', every: 900 }, { set: 'desk', every: 700, rooms: true }, { id: 'armchair', every: 1400, rooms: true }, { id: 'hifi', every: 1800, rooms: true }, { id: 'minifridge', every: 1400, rooms: true }],
  pool: [{ set: 'diving' }, { id: 'flamingo', water: true, every: 260 }, { set: 'poolside', shore: true, every: 150 }, { id: 'duck', water: true, every: 70 }, { id: 'soda', every: 1500 }, { id: 'boombox', every: 1000 }, { id: 'pottedpalm', open: true, every: 550 }],
  playroom: [{ set: 'softplay', open: true, every: 110 }, { id: 'playground', open: true, every: 650 }, { id: 'bouncehouse', open: true, every: 900 }, { id: 'bouncecombo', open: true, every: 1100 }, { id: 'bouncecourse', every: 1500 }, { id: 'plasticchair', every: 700 }, { set: 'gaming', every: 900 }, { id: 'soda', every: 1200 }, { id: 'clock', every: 600 }, { id: 'duck', water: true, every: 110 }, { id: 'tv', every: 700 }, { id: 'boombox', every: 900 }, { set: 'playballs' }],
  hotel: [{ id: 'armchair', every: 700 }, { id: 'sofa', every: 900 }, { set: 'chairs', every: 1200 }, { id: 'fan', ceiling: true, every: 600 }, { id: 'soda', every: 1500 }, { id: 'clock', every: 700 }, { id: 'cassette', every: 1500 }, { set: 'tvstand', every: 1000 }, { id: 'tv', every: 1400 }, { set: 'desk', every: 1500 }, { set: 'table', open: true, every: 1600 }, { id: 'pottedplant', every: 850 }, { id: 'minifridge', every: 1800, rooms: true }],
  garage: [{ id: 'plasticchair', open: true, every: 1500 }, { id: 'soda', every: 2000 }, { id: 'boombox', every: 1500 }, { id: 'tv', every: 2200 }],
  // Butikkene, inkludert importerte kosmetikk-/apotekreoler, innredes av mall-shops.js;
  // her bare gangene og atriet, så butikkmodellene aldri havner i ferdselsårene.
  mall: [{ id: 'mallbench', open: true, every: 350, min: 2, rooms: true }, { id: 'pottedpalm', open: true, every: 650, min: 1, rooms: true }, { id: 'pottedtree', open: true, every: 450, min: 1, rooms: true }, { id: 'pottedplant', every: 600, rooms: true }, { set: 'foodspot', every: 900, min: 1, rooms: true }, { set: 'table', open: true, every: 250, rooms: true }, { id: 'soda', every: 700, rooms: true }, { id: 'boombox', every: 1500, rooms: true }],
  school: [{ id: 'wallboard', every: 180, rooms: true }, { id: 'schoolcabinet', every: 240, rooms: true }, { id: 'whiteboard', every: 700, rooms: true }, { set: 'foodspot', every: 2500, min: 1, rooms: true }, { set: 'table', open: true, every: 600, rooms: true }, { set: 'desk', every: 110, rooms: true }, { id: 'soda', every: 800 }, { id: 'clock', every: 150, rooms: true }, { id: 'tv', every: 700, rooms: true }, { id: 'boombox', every: 1500, rooms: true }],
  ward: [{ set: 'patient', every: 150, min: 1, rooms: true }, { id: 'medicalcabinet', every: 450, rooms: true }, { id: 'medicaltrolley', every: 800, rooms: true }, { id: 'sofa', every: 1400, rooms: true }, { set: 'chairs', every: 400 }, { set: 'foodspot', every: 3000, rooms: true }, { id: 'soda', every: 900 }, { id: 'clock', every: 220, rooms: true }, { set: 'tvstand', every: 600, rooms: true }, { id: 'tv', every: 400, rooms: true }, { set: 'desk', every: 900, rooms: true }, { id: 'pottedplant', every: 1100 }],
};

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

/** Gulvruter med gulv på alle åtte sider (midt i et rom), ikke nær startpunktet. */
function openSpots(level, spawn) {
  const out = [];
  for (let z = 1; z < level.h - 1; z++) {
    for (let x = 1; x < level.w - 1; x++) {
      if (Math.hypot(x + 0.5 - spawn.x, z + 0.5 - spawn.z) < 3) continue;
      let ok = true;
      for (let dz = -1; dz <= 1 && ok; dz++) for (let dx = -1; dx <= 1; dx++) if (getTile(level, x + dx, z + dz) !== TILE.FLOOR) ok = false;
      if (ok) out.push([x, z]);
    }
  }
  return out;
}

/** Ingen taklys i ruten eller rundt den (en takvifte skal ikke henge i en lampe). */
function unlit(level, x, z) {
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (level.lights[(z + dz) * level.w + x + dx]) return false;
  return true;
}

function take(list, rand) {
  return list.splice(Math.floor(rand() * list.length), 1)[0];
}

const SETS = { desk, foodspot, chairs, arcades, tvrow, poolside, patient, tvstand: (l, r, x, z) => !!tvstand(l, r, x, z), gaming: (l, r, x, z) => gaming(l, r, x, z), livingroom: (l, r, x, z) => gaming(l, r, x, z, true) };

/** Én gjenstand eller ett oppsett i ruten. Returnerer true hvis noe ble satt inn. */
function place(level, rand, item, x, z) {
  if (item.ceiling) return unlit(level, x, z) && !!placeObject(level, x, z, item.id);
  if (item.set === 'softplay') return !!softBuild(level, rand, x, z);
  if (item.open) return !objectsAt(level, x, z).length && !!placeObject(level, x, z, item.set === 'table' ? table(rand) : item.id);
  if (SETS[item.set]) return SETS[item.set](level, rand, x, z);
  return !!tryPlace(level, x, z, item.id, 1);
}

/**
 * Møblerer et generert rom etter temaet. Returnerer antall gjenstander som ble satt inn.
 * deepEnds: dypere vann foran stupebrettene (ikke i eksemplene, som har faste dybder).
 */
// Structural pieces precede spawn/exit placement and the ordinary furniture pass.
export function furnishStructure(level, rand) {
  return PLANS[level.theme]?.some(p => p.set === 'halfwalls') ? addHalfWalls(level, rand) : 0;
}

export function furnish(level, rand, spawn = level.spawn, { deepEnds = true } = {}) {
  const plan = PLANS[level.theme];
  if (!plan) return 0;
  const before = level.objects.length;
  // Rutene rett foran dørene holdes fri (gen/door-space.js rydder resten).
  const fronts = new Set(doorFrontCells(level).map(([x, z]) => z * level.w + x));
  const traffic = level.theme === 'mall' ? mallTraffic(level) : () => false;
  const free = ([x, z]) => !fronts.has(z * level.w + x) && !traffic([x, z]);
  const spots = wallSpots(level, spawn).filter(free);
  const open = openSpots(level, spawn).filter(free);
  const floor = level.tiles.filter((t) => t === TILE.FLOOR).length;
  const water = [];
  level.tiles.forEach((t, i) => t === TILE.WATER && water.push([i % level.w, (i / level.w) | 0]));
  // Gulvruter langs bassengkanten (vann på én av sidene).
  const shore = [];
  for (let i = 0; i < level.tiles.length; i++) {
    const [x, z] = [i % level.w, (i / level.w) | 0];
    if (level.tiles[i] === TILE.FLOOR && free([x, z]) && DIRS.some(([dx, dz]) => getTile(level, x + dx, z + dz) === TILE.WATER)) shore.push([x, z]);
  }
  for (const item of plan) {
    if (item.set === 'halfwalls') continue;
    if (item.set === 'playballs') { scatterPlayBalls(level, rand, spawn); continue; }
    if (item.set === 'diving') { // stupebrett ved noen av bassengene (gen/diving.js)
      addDivingBoards(level, rand, { deepEnds });
      continue;
    }
    const n = count(rand, item.water ? water.length : floor, item.every, item.min);
    for (let k = 0, tries = 0; k < n && tries < n * 20; tries++) {
      if (level.theme === 'playroom' && level.objects.length >= MAX_OBJECTS - PLAY_BALL_LIMIT) break;
      const list = item.water ? water : item.shore ? shore : item.open || item.ceiling ? open : spots;
      if (!list.length) break;
      const [x, z] = take(list, rand);
      if (item.rooms && level.finish[z * level.w + x]) continue;
      if (item.water ? placeObject(level, x, z, item.id) : place(level, rand, item, x, z)) k++;
    }
  }
  return level.objects.length - before;
}

export { PLANS };
