// Ramper i Level 0 (gen/index.js, bare med vary): pukler i lange ganger – opp, et lite platå og ned igjen – og lett
// hevede flater i store rom med en rampe opp. Lavt nok til at taket ikke må heves, og flatene er aldri høyere enn man
// kan gå opp kanten (GUARD_DROP), så alt er like tilgjengelig som før og ingen kant får rekkverk. Ren logikk.
import { TILE, getTile } from '../core/level.js';
import { ceilingAt, HEADROOM } from '../core/heights.js';
import { fillZone } from '../core/zones.js';
import { placeRamp } from '../core/ramps.js';
import { randInt } from '../core/rng.js';

const RUN = 3; // ruter i hver rampe i en gang
const SPAWN_CLEAR = 4; // m: ikke rett ved startpunktet
const HUMP = [3, 5]; // dm: platåets høyde i en gang
const PLATEAU = [3, 4]; // dm: den hevede flaten i et rom (under GUARD_DROP = 0,45 m)
const SIDE = [4, 7]; // ruter: den hevede flaten

const plain = (level, x, z) => {
  const i = z * level.w + x;
  return getTile(level, x, z) === TILE.FLOOR && !level.meta[i] && !level.floors[i] && !level.decks[i] && !level.corners[i];
};

/** Tverrsnittet av en gang gjennom (x, z) på tvers av aksen: [a, b] med vegg på begge sider, eller null. */
function across(level, x, z, alongX) {
  const at = (k) => (alongX ? [x, k] : [k, z]);
  if (!plain(level, ...at(alongX ? z : x)) || getTile(level, ...at((alongX ? z : x) - 1)) !== TILE.WALL) return null;
  let b = alongX ? z : x;
  while (b - (alongX ? z : x) < 3 && plain(level, ...at(b + 1))) b++;
  if (getTile(level, ...at(b + 1)) !== TILE.WALL) return null;
  return [alongX ? z : x, b];
}

/** Rette gangstykker: { alongX, u0, u1, a, b } der tverrsnittet er det samme hele veien. */
function corridors(level) {
  const out = [];
  for (const alongX of [true, false]) {
    const [U, V] = alongX ? [level.w, level.h] : [level.h, level.w];
    for (let v = 1; v < V - 1; v++) {
      let run = null;
      for (let u = 1; u < U; u++) {
        const c = u < U - 1 ? across(level, alongX ? u : v, alongX ? v : u, alongX) : null;
        if (run && c && c[0] === run.a && c[1] === run.b) { run.u1 = u; continue; }
        if (run && run.u1 - run.u0 + 1 >= RUN * 2 + 3) out.push(run);
        run = c ? { alongX, u0: u, u1: u, a: c[0], b: c[1] } : null;
      }
    }
  }
  return out;
}

const cellsOf = (alongX, u0, u1, a, b) => {
  const out = [];
  for (let u = u0; u <= u1; u++) for (let k = a; k <= b; k++) out.push(alongX ? [u, k] : [k, u]);
  return out;
};

/** Fri plass: gulv, ikke brukt, ikke ved start, og høyt nok under taket for høyden h. */
function free(level, cells, used, h) {
  return cells.every(([x, z]) => plain(level, x, z) && !used.has(z * level.w + x) && ceilingAt(level, x, z) >= h + HEADROOM + 0.1
    && (!level.spawn || Math.hypot(x + 0.5 - level.spawn.x, z + 0.5 - level.spawn.z) > SPAWN_CLEAR));
}

/** Opp, et lite platå og ned igjen, i hele gangens bredde. */
function hump(level, rand, run, used) {
  const flat = randInt(rand, 1, 3);
  const len = RUN * 2 + flat;
  if (run.u1 - run.u0 - 1 < len) return false;
  const u = randInt(rand, run.u0 + 1, run.u1 - len);
  const h = randInt(rand, ...HUMP) / 10;
  const { alongX, a, b } = run;
  const all = cellsOf(alongX, u - 1, u + len, a, b);
  if (!free(level, all, used, h)) return false;
  const width = b - a + 1;
  const lane = a + Math.floor((width - 1) / 2);
  const at = (k) => (alongX ? [k, lane] : [lane, k]);
  fillZone(level, 'floor', cellsOf(alongX, u + RUN, u + RUN + flat - 1, a, b).map(([x, z]) => z * level.w + x), h);
  placeRamp(level, at(u), at(u + RUN - 1), width);
  placeRamp(level, at(u + len - 1), at(u + RUN + flat), width);
  for (const [x, z] of all) used.add(z * level.w + x);
  return true;
}

/** En lett hevet flate midt i et stort rom, med en rampe opp fra én side (kanten kan man også gå opp). */
function plateau(level, rand, used) {
  for (let tries = 0; tries < 80; tries++) {
    const side = randInt(rand, ...SIDE);
    const [x0, z0] = [randInt(rand, 2, level.w - side - 3), randInt(rand, 2, level.h - side - 3)];
    if (x0 < 2 || z0 < 2) return false;
    const h = randInt(rand, ...PLATEAU) / 10;
    const ring = [];
    for (let z = z0 - 1; z <= z0 + side; z++) for (let x = x0 - 1; x <= x0 + side; x++) ring.push([x, z]);
    if (!free(level, ring, used, h)) continue;
    const top = [];
    for (let z = z0; z < z0 + side; z++) for (let x = x0; x < x0 + side; x++) top.push(z * level.w + x);
    fillZone(level, 'floor', top, h);
    // Rampen inn fra en tilfeldig side, to ruter lang, nesten hele sidens bredde.
    const width = side - 2; // én rute flate på hver side av rampen, så den aldri står mot gulvet utenfor
    const mid = 1 + Math.floor((width - 1) / 2); // midtlinjen slik stairCells legger banene
    const [edge, inward] = [[[x0 + mid, z0], [0, 1]], [[x0 + side - 1, z0 + mid], [-1, 0]], [[x0 + mid, z0 + side - 1], [0, -1]], [[x0, z0 + mid], [1, 0]]][randInt(rand, 0, 3)];
    placeRamp(level, edge, [edge[0] + inward[0], edge[1] + inward[1]], width);
    for (const [x, z] of ring) used.add(z * level.w + x);
    return true;
  }
  return false;
}

/** Legger ramper i Level 0. Returnerer hvor mange (pukler + hevede flater). */
export function addRamps(level, rand) {
  if (level.theme !== 'backrooms' || rand() < 0.2) return 0;
  const used = new Set();
  const area = level.w * level.h;
  let n = 0;
  const runs = corridors(level);
  for (let k = Math.min(3, Math.max(1, Math.floor(area / 1100))); k > 0 && runs.length; k--) {
    const run = runs.splice(Math.floor(rand() * runs.length), 1)[0];
    if (hump(level, rand, run, used)) n++;
  }
  for (let k = Math.min(2, Math.floor(area / 1400)); k > 0; k--) if (plateau(level, rand, used)) n++;
  return n;
}
