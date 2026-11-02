// Byggeklosser for planløsningene (gen/hotel-layouts.js, gen/office-layouts.js): rom med en funksjon,
// rader av rom langs en korridor, glassvegger og sammenbinding av deler som ikke henger sammen. Alle tar
// ctx = { level, rand, doors } og tegner i level; level.plan husker rommene til møbleringen. Ren logikk.
import { TILE, getTile } from '../core/level.js';
import { randInt } from '../core/rng.js';
import { rectIndices } from '../core/ops.js';
import { FINISH, fillZone } from '../core/zones.js';
import { objectFits } from '../core/objects.js';
import { fillRect, labelRegions } from './util.js';

const TILED = ['bath', 'wc', 'laundry', 'changing', 'theatre', 'scrub', 'morgue']; // rommene som får fliser (skap på skolen)
const GLASS_HEAD = 2.2; // takhøyden over en glassvegg (bjelken over glasset)

/** Rektangelet sett langs den lengste siden: u langs, v på tvers. at(u, v) → [x, z]. */
export function frame(rect) {
  const wide = rect.x1 - rect.x0 >= rect.z1 - rect.z0;
  const at = (u, v) => (wide ? [rect.x0 + u, rect.z0 + v] : [rect.x0 + v, rect.z0 + u]);
  return {
    U: wide ? rect.x1 - rect.x0 + 1 : rect.z1 - rect.z0 + 1,
    V: wide ? rect.z1 - rect.z0 + 1 : rect.x1 - rect.x0 + 1,
    at,
    box(u0, v0, u1, v1) {
      const [ax, az] = at(Math.min(u0, u1), Math.min(v0, v1));
      const [bx, bz] = at(Math.max(u0, u1), Math.max(v0, v1));
      return { x0: ax, z0: az, x1: bx, z1: bz };
    },
    across: (s) => (wide ? [0, s] : [s, 0]), // retning på tvers (v)
    along: (s) => (wide ? [s, 0] : [0, s]), // retning på langs (u)
  };
}

export const note = (ctx, kind, rect, extra = {}) => (ctx.level.plan ??= []).push({ kind, ...rect, ...extra });

/** Graver ut et rektangel. Med kind blir det et rom møbleringen kjenner (gen/furnish-rooms.js). */
export function carve(ctx, rect, kind = null, extra = {}) {
  const { level } = ctx;
  fillRect(level, rect.x0, rect.z0, rect.x1, rect.z1, TILE.FLOOR);
  if (TILED.includes(kind)) fillZone(level, 'finish', rectIndices(level, rect), FINISH.TILES);
  if (kind) note(ctx, kind, rect, extra);
  return rect;
}

/** Døråpning. locked: dørbladet er alltid lukket (isolat, likhus). */
export function door(ctx, x, z, locked = false) {
  fillRect(ctx.level, x, z, x, z, TILE.DOOR);
  (locked ? ctx.locked : ctx.doors).push([x, z]);
}

/**
 * Vann (eller baller) i et rektangel, med egen dybde i meter. only(x, z): bare disse rutene.
 */
export function flood(ctx, rect, depth = 0, only = null) {
  const { level } = ctx;
  const cells = [];
  for (const i of rectIndices(level, rect)) {
    const [x, z] = [i % level.w, Math.floor(i / level.w)];
    if (x < 1 || z < 1 || x > level.w - 2 || z > level.h - 2 || (only && !only(x, z))) continue;
    level.tiles[i] = TILE.WATER;
    cells.push(i);
  }
  if (depth) fillZone(level, 'depth', cells, depth);
}

/**
 * En labyrint av ganger i rektangelet: pitch = avstanden mellom gangene, width = bredden (ruter),
 * tile = gulv eller vann, loops = andelen ekstra åpninger, så det ikke bare er én vei.
 */
export function corridorMaze(ctx, f, { pitch, width, tile, loops }) {
  const { level, rand } = ctx;
  const [cu, cv] = [Math.floor((f.U + 1) / pitch), Math.floor((f.V + 1) / pitch)];
  const seen = new Uint8Array(cu * cv);
  const paint = (u0, v0, u1, v1) => {
    const r = f.box(u0, v0, u1, v1);
    fillRect(level, r.x0, r.z0, r.x1, r.z1, tile);
  };
  const cell = (i, j) => paint(i * pitch, j * pitch, i * pitch + width - 1, j * pitch + width - 1);
  const link = (i, j, di, dj) => {
    const [a, b] = [i * pitch + (di > 0 ? width : di < 0 ? -1 : 0), j * pitch + (dj > 0 ? width : dj < 0 ? -1 : 0)];
    if (di) paint(a, b, a, b + width - 1);
    else paint(a, b, a + width - 1, b);
  };
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const stack = [[Math.floor(cu / 2), Math.floor(cv / 2), 0]];
  seen[stack[0][1] * cu + stack[0][0]] = 1;
  cell(stack[0][0], stack[0][1]);
  while (stack.length) {
    const [i, j, last] = stack[stack.length - 1];
    const free = DIRS.map((d, k) => [d, k]).filter(([[di, dj]]) => i + di >= 0 && j + dj >= 0 && i + di < cu && j + dj < cv && !seen[(j + dj) * cu + i + di]);
    if (!free.length) { stack.pop(); continue; }
    const straight = free.find(([, k]) => k === last);
    const [[di, dj], k] = straight && rand() < 0.7 ? straight : free[Math.floor(rand() * free.length)];
    seen[(j + dj) * cu + i + di] = 1;
    link(i, j, di, dj);
    cell(i + di, j + dj);
    stack.push([i + di, j + dj, k]);
  }
  for (let j = 0; j < cv; j++) {
    for (let i = 0; i < cu; i++) {
      if (i + 1 < cu && rand() < loops) link(i, j, 1, 0);
      if (j + 1 < cv && rand() < loops) link(i, j, 0, 1);
    }
  }
}

/** Høyere tak i et rom (lobby, ballsal). */
export function raise(ctx, rect, metres) {
  fillZone(ctx.level, 'ceiling', rectIndices(ctx.level, rect), metres);
}

/**
 * Rader av rom i stripen `strip`, med dør mot korridoren i retning dir = [dx, dz].
 * @param o width: [min, maks] rombredde, kind: rommets funksjon (eller (rand) → funksjon)
 * @returns {Array<{ rect, door: [x, z] }>}
 */
export function roomRow(ctx, strip, [dx, dz], { width, kind, locked = false }) {
  const { rand } = ctx;
  const out = [];
  const lengthwise = dz !== 0; // dører mot ±z: rommene ligger etter hverandre langs x
  const [lo, hi] = lengthwise ? [strip.x0, strip.x1] : [strip.z0, strip.z1];
  const wall = dz > 0 ? strip.z1 + 1 : dz < 0 ? strip.z0 - 1 : dx > 0 ? strip.x1 + 1 : strip.x0 - 1;
  for (let a = lo; a <= hi;) {
    let e = a + randInt(rand, width[0], width[1]) - 1;
    if (hi - e < 3) e = hi;
    const rect = lengthwise ? { ...strip, x0: a, x1: e } : { ...strip, z0: a, z1: e };
    carve(ctx, rect, typeof kind === 'function' ? kind(rand) : kind);
    const at = randInt(rand, a, e);
    const cell = lengthwise ? [at, wall] : [wall, at];
    door(ctx, cell[0], cell[1], locked);
    out.push({ rect, door: cell });
    a = e + 2;
  }
  return out;
}

/**
 * Parallelle ganger på tvers av rektangelet med rader av rom imellom, og to ganger på langs som binder dem sammen
 * (bodene i kjelleren, bakgangene i kjøpesenteret). Hver gang er to ruter bred; rommene er `room` dype og vender mot
 * nærmeste gang. o: room, width ([min, maks] rombredde), kind (funksjon eller (rand) → funksjon), locked (andel låste rader).
 * @returns {Array<{ rect, door }>} rommene
 */
export function corridorRows(ctx, rect, { room, width, kind, locked = 0 }) {
  const { rand } = ctx;
  const f = frame(rect);
  const period = 2 + 1 + room + 1 + room + 1;
  const ends = [0, f.U - 2];
  const rooms = [];
  let last = 0;
  for (let v = 0; v + 1 < f.V; v += period) {
    carve(ctx, f.box(0, v, f.U - 1, v + 1));
    last = v;
    const strip = (a) => f.box(3, a, f.U - 4, a + room - 1);
    if (v + 3 + room <= f.V) rooms.push(...roomRow(ctx, strip(v + 3), f.across(-1), { width, kind, locked: rand() < locked }));
    // Raden bak vender mot neste gang, så den må finnes.
    if (v + period + 1 < f.V) rooms.push(...roomRow(ctx, strip(v + 4 + room), f.across(1), { width, kind, locked: rand() < locked }));
  }
  for (const u of ends) carve(ctx, f.box(u, 0, u + 1, last + 1));
  return rooms;
}

/**
 * Glassvegger i veggen fra (x, z) og `length` ruter i retning dir: tre ruter glass, én rute vegg. Hopper over
 * det som ikke er vanlig vegg med gulv på begge sider (dører, hjørner).
 */
export function glaze(ctx, x, z, [dx, dz], length) {
  const { level } = ctx;
  const open = (cx, cz) => getTile(level, cx, cz) === TILE.WALL
    && getTile(level, cx - dz, cz - dx) === TILE.FLOOR && getTile(level, cx + dz, cz + dx) === TILE.FLOOR;
  let count = 0;
  for (let k = 0; k + 2 < length;) {
    const cells = [0, 1, 2].map((n) => [x + dx * (k + n), z + dz * (k + n)]);
    if (!cells.every(([cx, cz]) => open(cx, cz))) { k++; continue; }
    for (const [cx, cz] of cells) {
      level.tiles[cz * level.w + cx] = TILE.FLOOR;
      level.ceilings[cz * level.w + cx] = Math.round(GLASS_HEAD * 10);
    }
    const o = { id: 'glasswall', x: cells[1][0], z: cells[1][1], rot: dx ? 0 : 1 };
    if (objectFits(level, o, [...level.objects, o])) {
      level.objects = [...level.objects, o];
      count++;
    } else for (const [cx, cz] of cells) level.tiles[cz * level.w + cx] = TILE.WALL;
    k += 4;
  }
  return count;
}

/** Korteste vei gjennom vegg fra området `id` til et annet område: [[x, z], …], eller null. */
function bridge(level, labels, id) {
  const { w, h } = level;
  const from = new Int32Array(w * h).fill(-1);
  const queue = [];
  for (let i = 0; i < labels.length; i++) if (labels[i] === id) { from[i] = i; queue.push(i); }
  for (let k = 0; k < queue.length; k++) {
    const i = queue[k];
    if (labels[i] >= 0 && labels[i] !== id) {
      const path = [];
      for (let c = from[i]; labels[c] !== id; c = from[c]) path.push([c % w, Math.floor(c / w)]);
      return path;
    }
    const [x, z] = [i % w, Math.floor(i / w)];
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const [nx, nz] = [x + dx, z + dz];
      if (nx < 1 || nz < 1 || nx > w - 2 || nz > h - 2 || from[nz * w + nx] >= 0) continue;
      from[nz * w + nx] = i;
      queue.push(nz * w + nx);
    }
  }
  return null;
}

/** Binder sammen deler som ikke henger sammen, med en gang gjennom veggen, to ruter bred. */
export function joinRegions(ctx) {
  const { level } = ctx;
  for (let round = 0; round < 16; round++) {
    const { labels, sizes } = labelRegions(level);
    if (sizes.length < 2) return;
    const path = bridge(level, labels, sizes.indexOf(Math.max(...sizes)));
    if (!path) return;
    for (const [x, z] of path) {
      fillRect(level, x, z, x, z, TILE.FLOOR);
      if (getTile(level, x + 1, z) === TILE.WALL && x + 2 < level.w) fillRect(level, x + 1, z, x + 1, z, TILE.FLOOR);
    }
  }
}
