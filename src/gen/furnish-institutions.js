// Møbler etter rommets funksjon på skolen, sykehuset og i parkeringskjelleren (se gen/furnish-rooms.js). Ren logikk.
import { FACING } from '../core/objects.js';
import { put, tryPlace } from './furnish-sets.js';
import { edges, alongWalls, rotOf, shuffled } from './room-tools.js';

const MAX_SEATS = 110; // stoler i aulaen
const MAX_SHELVES = 48; // bokhyller i biblioteket
const ROW = 3; // m mellom radene
const MAX_TABLES = 30; // i kantinen

const middle = (a, b) => Math.floor((a + b) / 2);

function classroom(level, rand, r) {
  put(level, rand() < 0.5 ? 'wallboard' : 'whiteboard', middle(r.x0, r.x1), r.z0, 0);
  for (let z = r.z0 + 2; z <= Math.min(r.z1 - 1, r.z0 + 6); z += 2) {
    for (let x = r.x0 + 1; x <= r.x1 - 1; x += 2) {
      if (r.fronts.has(z * level.w + x)) continue;
      const desk = put(level, 'desk2', x, z, 0);
      if (desk && rand() < 0.8) put(level, 'plasticchair', x, z + 1, 2);
    }
  }
  alongWalls(level, rand, edges(level, r, r.fronts), ['schoolcabinet', 'clock']);
}

function changing(level, rand, r) {
  alongWalls(level, rand, edges(level, r, r.fronts), ['mallbench', 'mallbench', 'sink', 'sink', 'toilet']);
}

function gym(level, rand, r) {
  const wide = r.x1 - r.x0 >= r.z1 - r.z0;
  const mid = wide ? middle(r.z0, r.z1 - 4) : middle(r.x0, r.x1 - 4);
  if (wide) {
    put(level, 'hoop', r.x0, mid, 3);
    put(level, 'hoop', r.x1, mid, 1);
  } else {
    put(level, 'hoop', mid, r.z0, 0);
    put(level, 'hoop', mid, r.z1, 2);
  }
}

/** Stolrader mot scenen, med midtgang og et hull her og der. */
function seating(level, rand, r) {
  const rot = rotOf(r.front);
  const wide = r.front[0] === 0;
  const [cx, cz] = [middle(r.x0, r.x1), middle(r.z0, r.z1)];
  const seats = [];
  for (let z = r.z0; z <= r.z1; z += wide ? 2 : 1) {
    for (let x = r.x0; x <= r.x1; x += wide ? 1 : 2) {
      if (Math.abs(wide ? x - cx : z - cz) < 2 || (wide ? x - r.x0 : z - r.z0) % 2 || rand() < 0.12) continue;
      if (seats.length < MAX_SEATS) seats.push({ id: 'plasticchair', x, z, rot });
    }
  }
  level.objects = [...level.objects, ...seats];
}

function library(level, rand, r) {
  const wide = r.x1 - r.x0 >= r.z1 - r.z0;
  const [a0, a1, b0, b1] = wide ? [r.x0, r.x1, r.z0, r.z1] : [r.z0, r.z1, r.x0, r.x1];
  const mid = middle(a0, a1);
  // Rader over hele salen, med like mange hyller på hver side av midtgangen.
  const rows = Math.max(1, Math.floor((b1 - b0) / ROW));
  const side = Math.min(Math.floor((a1 - a0) / 4), Math.floor(MAX_SHELVES / rows / 2));
  for (let b = b0 + 1; b <= b1 - 1; b += ROW) {
    for (let k = 0; k < side; k++) {
      for (const a of [mid - 3 - k * 2, mid + 3 + k * 2]) {
        const [x, z] = wide ? [a, b] : [b, a];
        if (!r.fronts.has(z * level.w + x)) put(level, 'bookshelf', x, z, wide ? 0 : 1);
      }
    }
  }
  // Lesebord langs midtgangen.
  for (let b = b0 + 2; b <= b1 - 2; b += 4) {
    const [x, z] = wide ? [mid, b] : [b, mid];
    if (!put(level, 'table', x, z, wide ? 1 : 0)) continue;
    if (rand() < 0.7) put(level, 'desklamp', x, z, 0);
  }
}

function cafeteria(level, rand, r) {
  const [fx, fz] = r.front;
  const wide = fx === 0;
  const [cx, cz] = wide ? [middle(r.x0, r.x1), r.z0] : [r.x0, middle(r.z0, r.z1)];
  for (const k of [-4, -2, 0, 2, 4]) put(level, 'counter', cx + (wide ? k : fx), cz + (wide ? fz : k), rotOf([-fx, -fz]));
  let left = MAX_TABLES;
  for (let z = r.z0 + 3; z <= r.z1 - 1 && left > 0; z += 4) {
    for (let x = r.x0 + 2; x <= r.x1 - 2 && left > 0; x += 4) {
      if (!put(level, 'table', x, z, 0)) continue;
      left--;
      for (const s of [-1, 1]) if (rand() < 0.75) put(level, 'plasticchair', x, z + s, s < 0 ? 0 : 2);
    }
  }
  alongWalls(level, rand, edges(level, r, r.fronts), ['soda', 'soda', 'clock']);
}

/** Senger på rad langs begge langveggene, med forhenger og et vaktbord i midten. */
function nightingale(level, rand, r) {
  const wide = r.x1 - r.x0 >= r.z1 - r.z0;
  const [a0, a1] = wide ? [r.x0, r.x1] : [r.z0, r.z1];
  for (let a = a0 + 1; a <= a1 - 1; a += 3) {
    for (const [cell, rot] of wide ? [[[a, r.z0], 0], [[a, r.z1], 2]] : [[[r.x0, a], 3], [[r.x1, a], 1]]) {
      const [x, z] = cell;
      if (r.fronts.has(z * level.w + x) || !put(level, 'hospitalbed', x, z, rot)) continue;
      const [fx, fz] = FACING[rot];
      if (rand() < 0.5) put(level, 'medicaltrolley', x + (wide ? 1 : 0) + fx * 2, z + (wide ? 0 : 1) + fz * 2, rot);
      if (rand() < 0.4) put(level, 'medicalscreen', x + (wide ? -1 : 0) + fx * 2, z + (wide ? 0 : -1) + fz * 2, (rot + 1) % 4);
    }
  }
  put(level, 'moderndesk', middle(r.x0, r.x1), middle(r.z0, r.z1), 0);
  alongWalls(level, rand, edges(level, r, r.fronts), ['medicalcabinet', 'clock']);
}

function waiting(level, rand, r) {
  const free = edges(level, r, r.fronts);
  alongWalls(level, rand, free, ['waitingchairs', 'waitingchairs', 'waitingchairs', 'waitingchairs', 'soda', 'tvbench', 'pottedplant', 'clock']);
}

function theatre(level, rand, r) {
  const [x, z] = [middle(r.x0, r.x1), middle(r.z0, r.z1)];
  put(level, 'ortable', x, z, 0);
  put(level, 'surgicallamp', x, z, 0);
  alongWalls(level, rand, edges(level, r, r.fronts), ['medicalcabinet', 'medicaltrolley', 'medicaltrolley', 'clock']);
}

function scrub(level, rand, r) {
  alongWalls(level, rand, edges(level, r, r.fronts), ['sink', 'sink', 'sink', 'medicalcabinet']);
}

function cell(level, rand, r) {
  const spots = shuffled(rand, edges(level, r, r.fronts));
  if (rand() < 0.7) for (const [x, z] of spots) if (tryPlace(level, x, z, 'hospitalbed', 0)) break;
}

function morgue(level, rand, r) {
  const spots = edges(level, r, r.fronts).filter(([x, z]) => (x + z) % 2 === 0);
  alongWalls(level, rand, spots, Array(8).fill('morguewall'));
  const [x, z] = [middle(r.x0, r.x1), middle(r.z0, r.z1)];
  put(level, 'gurney', x, z, 0);
  if (rand() < 0.5) put(level, 'gurney', x + 2, z, 0);
}

function bays(level, rand, r) {
  for (const { at: [x, z], front } of r.spots) {
    if (rand() < 0.55) {
      const car = put(level, 'coveredcar', x, z, rotOf(front));
      if (car) car.v = Math.floor(rand() * 3);
    }
  }
}

export const INSTITUTION_ROOMS = { classroom, changing, gym, seating, library, cafeteria, nightingale, waiting, theatre, scrub, cell, morgue, bays };
