// Planløsningene i hotellet (valgt i gen/layouts.js): romfløy, lobby, konferansefløy og personalganger.
// Hver tar (ctx, rect) og tegner i rektangelet; møblene settes inn av gen/furnish-rooms.js. Ren logikk.
import { TILE } from '../core/level.js';
import { randInt } from '../core/rng.js';
import { fillRect } from './util.js';
import { frame, carve, door, raise, roomRow } from './floorplan.js';

const DEPTH = [7, 9]; // hotellrommet: entré og bad, så soverommet
const ROOM_PITCH = 6; // fem ruter rom og én vegg
const SOLID_EVERY = 6; // én romplass av så mange er massiv (sjakter): der kan en krypegang gå
const SIDE_ROOMS = (rand) => ['lounge', 'storage', 'lounge', 'office'][Math.floor(rand() * 4)];

/**
 * Ett hotellrom sett fra døren: bad og entré nærmest gangen, soverommet innerst. (u0, wall) er
 * veggen mot gangen, side = ±1 er retningen innover, flip speiler rommet (naborom deler badevegg).
 */
function guestRoom(ctx, f, u0, wall, side, flip, depth) {
  const cell = (a, b) => [u0 + (flip ? 4 - a : a), wall + side * (1 + b)];
  const box = (a0, b0, a1, b1) => f.box(...cell(a0, b0), ...cell(a1, b1));
  carve(ctx, box(0, 0, 1, 2), 'bath');
  carve(ctx, box(3, 0, 4, 3));
  const [bu, bv] = cell(2, depth - 1);
  carve(ctx, box(0, 4, 4, depth - 1), 'bedroom', { bed: f.at(bu, bv), front: f.across(-side), side: f.along(1) });
  door(ctx, ...f.at(...cell(3, -1)));
  door(ctx, ...f.at(...cell(2, 1)));
}

/** Romfløy: lange ganger med like rom på begge sider. */
export function wing(ctx, rect) {
  const f = frame(rect);
  const { U, V } = f;
  // Så mange bånd (rom, gang, rom) som får plass, og så dypere rom om det er plass til det.
  const bands = Math.floor((V + 1) / (DEPTH[0] * 2 + 5));
  const rows = bands || 1;
  const single = !bands; // for smalt til rom på begge sider
  const depth = single ? Math.min(DEPTH[1], V - 3) : Math.min(DEPTH[1], Math.floor(((V + 1) / bands - 5) / 2));
  const pitch = depth * 2 + 5;
  const span = single ? depth + 3 : bands * pitch - 1;
  const top = Math.floor((V - span) / 2);
  const inset = rows > 1 ? 3 : 0; // gangene på tvers
  const count = Math.floor((U - inset * 2 + 1) / ROOM_PITCH);
  const start = inset + Math.floor((U - inset * 2 - (count * ROOM_PITCH - 1)) / 2);
  let first = 0;
  let last = 0;
  for (let b = 0; b < rows; b++) {
    const cv = single ? top : top + b * pitch + depth + 1;
    if (!b) first = cv;
    last = cv + 1;
    carve(ctx, f.box(0, cv, U - 1, cv + 1));
    for (let k = 0; k < count; k++) {
      const u = start + k * ROOM_PITCH;
      if (k % SOLID_EVERY !== 2) guestRoom(ctx, f, u, cv + 2, 1, k % 2 === 1, depth);
      if (!single && k % SOLID_EVERY !== 5) guestRoom(ctx, f, u, cv - 1, -1, k % 2 === 1, depth);
    }
  }
  if (rows > 1) for (const u of [0, U - 2]) carve(ctx, f.box(u, first, u + 1, last));
}

/** Lobby: en stor, høy hall med søyler, rom rundt den og ganger ut i begge ender. */
export function lobby(ctx, rect) {
  const f = frame(rect);
  const { U, V } = f;
  const hall = carve(ctx, f.box(7, 6, U - 8, V - 7), 'lobby', { front: f.across(1) });
  raise(ctx, hall, 4 + randInt(ctx.rand, 0, 2) / 10);
  roomRow(ctx, f.box(7, 0, U - 8, 4), f.across(1), { width: [5, 7], kind: SIDE_ROOMS });
  roomRow(ctx, f.box(7, V - 5, U - 8, V - 1), f.across(-1), { width: [5, 7], kind: SIDE_ROOMS });
  const mid = Math.floor(V / 2);
  for (const [u0, u1, open] of [[0, 5, 6], [U - 6, U - 1, U - 7]]) {
    carve(ctx, f.box(u0, mid - 1, u1, mid));
    carve(ctx, f.box(open, mid - 1, open, mid));
    if (mid - 3 >= 3) roomRow(ctx, f.box(u0, 0, u1, mid - 3), f.across(1), { width: [5, 6], kind: SIDE_ROOMS });
    if (V - 1 - (mid + 2) >= 3) roomRow(ctx, f.box(u0, mid + 2, u1, V - 1), f.across(-1), { width: [5, 6], kind: SIDE_ROOMS });
  }
  // To rader søyler langs hallen, med fri midtgang.
  for (let u = 9; u <= U - 10; u += 4) {
    for (const v of [8, V - 9]) {
      if (V - 13 < 6 || Math.abs(v - mid) < 2) continue;
      const [x, z] = f.at(u, v);
      fillRect(ctx.level, x, z, x, z, TILE.PILLAR);
    }
  }
}

/** Konferansefløy: ballsal i midten, brede ganger rundt og møterom ytterst. */
export function conference(ctx, rect) {
  const f = frame(rect);
  const { U, V } = f;
  const hall = carve(ctx, f.box(4, 10, U - 5, V - 11), 'ballroom');
  raise(ctx, hall, 3.6 + randInt(ctx.rand, 0, 5) / 10);
  for (const [v0, v1] of [[6, 8], [V - 9, V - 7]]) carve(ctx, f.box(0, v0, U - 1, v1));
  for (const [u0, u1] of [[0, 2], [U - 3, U - 1]]) carve(ctx, f.box(u0, 6, u1, V - 7));
  roomRow(ctx, f.box(0, 0, U - 1, 4), f.across(1), { width: [6, 9], kind: 'meeting' });
  roomRow(ctx, f.box(0, V - 5, U - 1, V - 1), f.across(-1), { width: [6, 9], kind: 'meeting' });
  // Brede åpninger inn til salen.
  for (const u of [Math.floor(U / 3), Math.floor((2 * U) / 3)]) {
    for (const v of [9, V - 10]) carve(ctx, f.box(u - 1, v, u + 1, v));
  }
}

/** Personalganger: en trang labyrint, én rute bred, med vaskerom og lager. */
export function staff(ctx, rect) {
  const { rand } = ctx;
  const f = frame(rect);
  const [cu, cv] = [Math.floor((f.U + 1) / 2), Math.floor((f.V + 1) / 2)];
  const seen = new Uint8Array(cu * cv);
  const open = (i, j) => carve(ctx, f.box(i * 2, j * 2, i * 2, j * 2));
  const stack = [[Math.floor(cu / 2), Math.floor(cv / 2), 0]];
  seen[stack[0][1] * cu + stack[0][0]] = 1;
  open(stack[0][0], stack[0][1]);
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (stack.length) {
    const [i, j, last] = stack[stack.length - 1];
    const free = DIRS.map((d, k) => [d, k]).filter(([[di, dj]]) => i + di >= 0 && j + dj >= 0 && i + di < cu && j + dj < cv && !seen[(j + dj) * cu + i + di]);
    if (!free.length) { stack.pop(); continue; }
    const straight = free.find(([, k]) => k === last);
    const [[di, dj], k] = straight && rand() < 0.75 ? straight : free[Math.floor(rand() * free.length)];
    seen[(j + dj) * cu + i + di] = 1;
    open(i + di, j + dj);
    carve(ctx, f.box(i * 2 + di, j * 2 + dj, i * 2 + di, j * 2 + dj));
    stack.push([i + di, j + dj, k]);
  }
  for (let n = Math.max(2, Math.floor((f.U * f.V) / 260)); n > 0; n--) {
    const [u, v] = [randInt(rand, 0, f.U - 7), randInt(rand, 0, f.V - 6)];
    carve(ctx, f.box(u, v, u + 5, v + 4), n % 2 ? 'laundry' : 'storage');
  }
}
