// Møbler etter rommets funksjon: senger på soverommene, resepsjon i lobbyen, møtebord på møterommene og
// hyller i arkivet. Rommene kommer fra planløsningene (level.plan, gen/layouts.js). Ren logikk.
import { placeObject, objectsAt } from '../core/objects.js';
import { doorFrontCells } from './door-space.js';
import { put, tryPlace, desk, tvstand } from './furnish-sets.js';
import { podDesk } from './cubicles.js';
import { rotOf, shuffled, edges, alongWalls } from './room-tools.js';
import { INSTITUTION_ROOMS } from './furnish-institutions.js';
import { CELLAR_ROOMS } from './furnish-cellar.js';
import { HALL_ROOMS } from './furnish-halls.js';
import { AIRPORT_ROOMS, AIRPORT_ITEMS } from './furnish-airport.js';

const PLANTS = ['pottedplant', 'palmplant', 'yucca'];
const MAX_SHELVES = 30;
const MAX_TABLES = 24; // i ballsalen
const BUDGET = 280; // gjenstander i ett bygg: i de største byggene blir noen rom stående tomme, tilfeldig hvilke

/** Det som kan stå i rommene i planløsningene, i tillegg til temaets vanlige liste (`PLANS`). */
export const ROOM_ITEMS = ['double_bed', 'nightstand', 'desklamp', 'toilet', 'sink', 'mirror', 'washer', 'copier', 'archiveshelf', 'elevator', 'glasswall', 'halfwall',
  'counter', 'register', 'wallshelf', 'cafe', 'sofa', 'armchair', 'tvbench', 'tv', 'minifridge', 'schoolcabinet', 'whiteboard', 'wallboard', 'pottedpalm', 'pottedplant', 'yucca', 'palmplant', 'clock', 'officechair', 'table', 'soda',
  'bookshelf', 'hoop', 'ortable', 'surgicallamp', 'morguewall', 'gurney', 'coveredcar', 'mallbench', 'plasticchair', 'desk2', 'moderndesk', 'medicalcabinet', 'medicaltrolley', 'medicalscreen', 'hospitalbed', 'waitingchairs',
  'dinerset', 'cafe', 'kiosk', 'pottedtree', 'shelf', 'boombox', 'woodenchair', 'boiler', 'bunkbed', 'darkwindow', 'floorvent', ...AIRPORT_ITEMS];

function bedroom(level, rand, r) {
  const [x, z] = r.bed;
  const rot = rotOf(r.front);
  if (!put(level, 'double_bed', x, z, rot)) return;
  const [sx, sz] = r.side;
  for (const s of [-1, 1]) {
    const stand = put(level, 'nightstand', x + sx * s, z + sz * s, rot);
    if (stand && s < 0) placeObject(level, stand.x, stand.z, 'desklamp');
  }
  const spots = edges(level, r, r.fronts).filter(([cx, cz]) => Math.abs(cx - x) + Math.abs(cz - z) > 1);
  const [cx, cz] = shuffled(rand, spots)[0] ?? [];
  if (cx !== undefined && rand() < 0.7 && !tvstand(level, rand, cx, cz, 1)) tryPlace(level, cx, cz, 'armchair', 1);
  if (rand() < 0.4) alongWalls(level, rand, spots, [PLANTS[Math.floor(rand() * PLANTS.length)]]);
}

function bath(level, rand, r) {
  alongWalls(level, rand, edges(level, r, r.fronts), ['toilet', 'sink']);
}

function wc(level, rand, r) {
  alongWalls(level, rand, edges(level, r, r.fronts), ['toilet', 'toilet', 'toilet', 'sink', 'sink']);
}

function storage(level, rand, r) {
  alongWalls(level, rand, edges(level, r, r.fronts), ['archiveshelf', 'archiveshelf', 'wallshelf', 'archiveshelf']);
}

function laundry(level, rand, r) {
  alongWalls(level, rand, edges(level, r, r.fronts), ['washer', 'washer', 'washer', 'archiveshelf', 'sink']);
}

function copy(level, rand, r) {
  alongWalls(level, rand, edges(level, r, r.fronts), ['copier', 'archiveshelf', 'schoolcabinet', 'minifridge']);
}

function kitchen(level, rand, r) {
  alongWalls(level, rand, edges(level, r, r.fronts), ['minifridge', 'soda', 'sink', 'counter']);
  placeObject(level, Math.floor((r.x0 + r.x1) / 2), Math.floor((r.z0 + r.z1) / 2), 'table');
}

function office(level, rand, r) {
  const spots = shuffled(rand, edges(level, r, r.fronts));
  for (const [x, z] of spots) {
    if (!desk(level, rand, x, z)) continue;
    if (rand() < 0.35) placeObject(level, x, z, 'desklamp');
    break;
  }
  alongWalls(level, rand, spots, [rand() < 0.5 ? 'schoolcabinet' : 'pottedplant', rand() < 0.3 ? 'wallboard' : 'yucca', rand() < 0.3 ? 'armchair' : 'pottedplant']);
}

function lounge(level, rand, r) {
  alongWalls(level, rand, edges(level, r, r.fronts), ['sofa', 'armchair', PLANTS[Math.floor(rand() * PLANTS.length)], rand() < 0.5 ? 'tvbench' : 'palmplant']);
}

/** Møtebord langs rommet, stoler på begge sider og noe å skrive på. */
function meeting(level, rand, r) {
  const wide = r.x1 - r.x0 >= r.z1 - r.z0;
  const [cx, cz] = [Math.floor((r.x0 + r.x1) / 2), Math.floor((r.z0 + r.z1) / 2)];
  const len = wide ? r.x1 - r.x0 : r.z1 - r.z0;
  for (let k = -Math.floor(len / 5); k <= Math.floor(len / 5); k++) {
    const [x, z] = wide ? [cx + k * 2, cz] : [cx, cz + k * 2];
    if (!put(level, 'table', x, z, wide ? 0 : 1)) continue;
    for (const s of [-1, 1]) {
      const [sx, sz] = wide ? [x, z + s] : [x + s, z];
      put(level, 'officechair', sx, sz, rotOf(wide ? [0, -s] : [-s, 0]));
    }
  }
  alongWalls(level, rand, edges(level, r, r.fronts), [rand() < 0.5 ? 'whiteboard' : 'wallboard', rand() < 0.5 ? 'tvbench' : 'pottedplant', 'clock']);
}

/** Rader med hyller og smale ganger, med en tverrgang i midten (høyst MAX_SHELVES i hver sal). */
function archive(level, rand, r) {
  const wide = r.x1 - r.x0 >= r.z1 - r.z0;
  const [a0, a1, b0, b1] = wide ? [r.x0, r.x1, r.z0, r.z1] : [r.z0, r.z1, r.x0, r.x1];
  const mid = Math.floor((a0 + a1) / 2);
  let left = MAX_SHELVES;
  for (let b = b0 + 1; b <= b1 - 1 && left > 0; b += 2) {
    for (let a = a0 + 2; a <= a1 - 1 && left > 0; a += 2) {
      if (Math.abs(a - mid) < 2) continue;
      const [x, z] = wide ? [a, b] : [b, a];
      if (!r.fronts.has(z * level.w + x) && put(level, 'archiveshelf', x, z, wide ? 0 : 1)) left--;
    }
  }
}

function lobby(level, rand, r) {
  const [fx, fz] = r.front;
  const wide = fx === 0;
  const span = wide ? r.x1 - r.x0 : r.z1 - r.z0;
  // Resepsjonen langs veggen, midt på.
  const [cx, cz] = wide ? [Math.floor((r.x0 + r.x1) / 2), r.z0] : [r.x0, Math.floor((r.z0 + r.z1) / 2)];
  for (const k of [-2, 0, 2]) {
    const counter = put(level, 'counter', cx + (wide ? k : fx), cz + (wide ? fz : k), rotOf(r.front));
    if (counter && !k) put(level, 'register', counter.x, counter.z, counter.rot);
  }
  put(level, 'officechair', cx, cz, rotOf(r.front));
  alongWalls(level, rand, edges(level, r, r.fronts), ['elevator', 'elevator', 'pottedpalm', 'pottedpalm', 'yucca', 'clock', 'soda'], 0);
  // Sittegrupper på gulvet.
  for (let k = 0; k < Math.min(4, Math.floor(span / 6)); k++) {
    const [x, z] = wide ? [r.x0 + 4 + k * 6, r.z1 - 3] : [r.x1 - 3, r.z0 + 4 + k * 6];
    if (objectsAt(level, x, z).length) continue;
    put(level, 'sofa', x, z, rotOf([-fx, -fz]));
    put(level, 'armchair', x + (wide ? 2 : fx * 2), z + (wide ? fz * 2 : 2), 0);
    put(level, 'table', x + fx * -2, z + fz * -2, 0);
  }
}

function ballroom(level, rand, r) {
  let left = MAX_TABLES;
  for (let z = r.z0 + 2; z <= r.z1 - 2 && left > 0; z += 4) {
    for (let x = r.x0 + 2; x <= r.x1 - 2 && left > 0; x += 4) {
      if (!r.fronts.has(z * level.w + x) && put(level, 'cafe', x, z, 0)) left--;
    }
  }
}

function lifts(level, rand, r) {
  alongWalls(level, rand, edges(level, r, r.fronts), ['elevator', 'elevator', 'pottedplant', 'clock'], 0);
}

const ROOMS = { ...INSTITUTION_ROOMS, ...CELLAR_ROOMS, ...HALL_ROOMS, ...AIRPORT_ROOMS, bedroom, bath, wc, storage, laundry, copy, kitchen, office, lounge, meeting, archive, lobby, ballroom, lifts,
  cubicles: (level, rand, r) => { for (const pod of r.pods ?? []) podDesk(level, rand, pod); } };

const inside = (o, r) => o.x >= r.x0 - 3 && o.x <= r.x1 + 3 && o.z >= r.z0 - 3 && o.z <= r.z1 + 3;
const MIRRORED = ['bath', 'wc', 'changing']; // speil over vasken (ikke på kjøkkenet, i vaskeriet eller ved operasjonsstuene)

/**
 * Møblerer rommene i level.plan. Rutene rett foran dører holdes fri. Hvert rom møbleres mot gjenstandene i
 * nærheten, ikke alle i bygget: å sjekke en ny gjenstand koster i forhold til hvor mange som sjekkes.
 */
export function furnishRooms(level, rand) {
  const before = level.objects.length;
  const fronts = new Set(doorFrontCells(level).map(([x, z]) => z * level.w + x));
  for (const r of shuffled(rand, level.plan ?? [])) {
    if (level.objects.length >= BUDGET) break;
    const near = level.objects.filter((o) => inside(o, r));
    const room = { ...level, objects: near };
    ROOMS[r.kind]?.(room, rand, { ...r, fronts });
    if (MIRRORED.includes(r.kind)) for (const o of room.objects.slice(near.length)) if (o.id === 'sink') put(room, 'mirror', o.x, o.z, o.rot);
    level.objects = [...level.objects, ...room.objects.slice(near.length)];
  }
  return level.objects.length - before;
}
