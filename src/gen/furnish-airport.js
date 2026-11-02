// Møbler i flyplassterminalen etter rommets funksjon (gen/airport-layouts.js, registrert i gen/furnish-rooms.js): rader
// av seter mot vinduene i gatene, seteøyer og avgangstavler i gangen, skranker og kø-sperrer i innsjekkingen, bånd i
// bagasjehallen, hyller i taxfree-butikken og en kiosk med bord. Ren logikk.
import { put } from './furnish-sets.js';
import { rotOf, edges, alongWalls } from './room-tools.js';

/** Rommet sett langs `along`: u langs, v på tvers; near = siden mot `front` (åpningen, eller vinduene), far = motsatt. */
function axes(r) {
  const A = (r.along ?? [1, 0])[0] !== 0;
  const [u0, u1, v0, v1] = A ? [r.x0, r.x1, r.z0, r.z1] : [r.z0, r.z1, r.x0, r.x1];
  const fs = r.front ? (A ? r.front[1] : r.front[0]) : 1;
  return { A, u0, u1, v0, v1, fs, near: fs > 0 ? v1 : v0, far: fs > 0 ? v0 : v1, mid: Math.floor((v0 + v1) / 2), at: (u, v) => (A ? [u, v] : [v, u]) };
}

const across = (A, s) => (A ? [0, s] : [s, 0]); // retningen på tvers (v)
const free = (r, level, [x, z]) => !r.fronts.has(z * level.w + x);

/** Gate: rader med seter vendt mot vinduene (bort fra gangen), en skranke og en tavle ved åpningen, planter innerst. */
function gate(level, rand, r) {
  const { u0, u1, fs, near, far, at, A } = axes(r);
  const face = rotOf([-r.front[0], -r.front[1]]);
  const aisle = Math.floor((u0 + u1) / 2);
  for (let v = far + fs * 2; fs * (near - v) >= 2; v += fs * 2) {
    for (let u = u0 + 1; u <= u1 - 1; u += 2) if (Math.abs(u - aisle) > 0 && free(r, level, at(u, v))) put(level, 'waitingchairs', ...at(u, v), face);
  }
  put(level, 'counter', ...at(u0 + 1, near - fs), face);
  put(level, 'fids', ...at(u1 - 1, near - fs), rotOf(r.front));
  for (const u of [u0, u1]) put(level, rand() < 0.5 ? 'pottedplant' : 'yucca', ...at(u, far), rotOf(across(A, fs)));
  if (rand() < 0.4) put(level, 'luggagecart', ...at(u0 + 2 + Math.floor(rand() * (u1 - u0 - 3)), near - fs * 2), Math.floor(rand() * 4));
}

/** Gangen: seteøyer rygg mot rygg midt i, avgangstavler og planter langs sidene, en brusautomat her og der. */
function concourse(level, rand, r) {
  const { u0, u1, v0, v1, mid, at, A } = axes(r);
  for (let u = u0 + 4 + Math.floor(rand() * 4); u <= u1 - 4; u += 11 + Math.floor(rand() * 5)) {
    put(level, 'waitingchairs', ...at(u, mid), rotOf(across(A, -1)));
    put(level, 'waitingchairs', ...at(u, mid + 1), rotOf(across(A, 1)));
    const side = rand() < 0.5 ? -1 : 1; // tavlen står ved den ene veggen og vender inn i gangen
    put(level, 'fids', ...at(u + 5, side < 0 ? v0 : v1), rotOf(across(A, -side)));
  }
  alongWalls(level, rand, edges(level, r, r.fronts), ['pottedplant', 'soda', 'yucca', 'clock', 'soda', 'pottedpalm']);
}

/** Innsjekking: skranker langs bakveggen, kø-sperrer i sikksakk foran dem, tavler og traller ved vinduene. */
function checkin(level, rand, r) {
  const { u0, u1, fs, near, far, at, A } = axes(r);
  const face = rotOf(r.front);
  for (let u = u0 + 2; u <= u1 - 2; u += 4) put(level, 'checkin', ...at(u, far + fs), face);
  for (const k of [3, 5]) {
    for (let u = u0 + 2; u <= u1 - 2; u++) if ((u - u0 + k) % 7 && free(r, level, at(u, far + fs * k))) put(level, 'stanchion', ...at(u, far + fs * k), A ? 0 : 1);
  }
  for (let u = u0 + 4; u <= u1 - 4; u += 10) put(level, 'fids', ...at(u, near - fs * 3), rotOf([-r.front[0], -r.front[1]]));
  for (let k = 0; k < 4; k++) put(level, 'luggagecart', ...at(u0 + 1 + k, near - fs), face);
  alongWalls(level, rand, edges(level, r, r.fronts), ['pottedplant', 'clock', 'soda']);
}

/** Bagasjehallen: bånd på rekke midt i, traller langs veggene og en tavle. */
function baggage(level, rand, r) {
  const { u0, u1, mid, near, fs, at, A } = axes(r);
  for (let u = u0 + 4; u <= u1 - 4; u += 9) put(level, 'carousel', ...at(u, mid), A ? 0 : 1);
  put(level, 'fids', ...at(u0 + 2, near - fs), rotOf([-r.front[0], -r.front[1]]));
  alongWalls(level, rand, edges(level, r, r.fronts), ['luggagecart', 'luggagecart', 'luggagecart', 'waitingchairs', 'waitingchairs', 'clock']);
}

/** Taxfree: hyllerader på tvers og en disk med kasse ved åpningen. */
function dutyfree(level, rand, r) {
  const { u0, u1, fs, near, far, at, A } = axes(r);
  for (let v = far + fs * 1; fs * (near - v) >= 3; v += fs * 2) {
    for (let u = u0 + 1; u <= u1 - 2; u += 3) put(level, 'shelf', ...at(u, v), A ? 0 : 1);
  }
  const c = put(level, 'counter', ...at(u1 - 1, near - fs), rotOf([-r.front[0], -r.front[1]]));
  if (c) put(level, 'register', c.x, c.z, c.rot);
}

/** Kiosk ved bakveggen og kafébord foran. */
function eatery(level, rand, r) {
  const { u0, u1, fs, near, far, at } = axes(r);
  put(level, 'kiosk', ...at(Math.floor((u0 + u1) / 2), far + fs), rotOf(r.front));
  for (let v = far + fs * 4; fs * (near - v) >= 2; v += fs * 3) for (let u = u0 + 1; u <= u1 - 1; u += 3) put(level, 'cafe', ...at(u, v), 0);
}

export const AIRPORT_ROOMS = { gate, concourse, checkin, baggage, dutyfree, eatery };
export const AIRPORT_ITEMS = ['fids', 'carousel', 'stanchion', 'checkin', 'luggagecart', 'waitingchairs', 'counter', 'register', 'shelf', 'kiosk', 'cafe'];
