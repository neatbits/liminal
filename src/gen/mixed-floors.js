// Bygg med ulike etasjer i de uendelige nivåene: opptil tre etasjer oppå hverandre, oftest med hvert
// sitt tema (core/storeys.js), av og til nesten like. Etasjene bindes sammen med trapp eller stige
// (core/stairwells.js, core/ladders.js): høyden avgjør – trappen blir så lang at stigningen er grei, og
// der etasjen er for høy til det, blir det stige. Hver forbindelse må ligge der man kan gå fra der man
// kom inn i etasjen, og må ikke stenge noe av, så alle etasjene kan nås. Ren logikk.
import { TILE, LIGHT, getTile } from '../core/level.js';
import { STAIR_DIRS, STAIR_THROUGH } from '../core/heights.js';
import { storeyCount, storeyLevel, storeyGap, insertStorey, copyStorey } from '../core/storeys.js';
import { LADDER, isLadder } from '../core/ladders.js';
import { footprintCells } from '../core/object-pose.js';
import { slidesAt } from '../core/slides.js';
import { doorInfo } from '../core/doors.js';
import { THEME_IDS } from '../core/themes.js';
import { reachableCells } from './tapes.js';
import { makeWrong } from './wrong.js';
import { FLOOR_THEMES } from './floors.js';
import { generateLevel } from './index.js';
import { addElevator } from './elevators.js';

/** Temaene som kan stå i et blandet bygg. Kjøpesenteret er for høyt og har sin egen struktur. */
export const MIX_THEMES = THEME_IDS.filter((id) => id !== 'mall');
/** Rom med minst så mange ruter får høyst to etasjer (bakingen tar lang tid per etasje). */
export const BIG_ROOM = 4096;
export const STAIR_MAX = 4.5; // m: høyere etasjer får stige
const RISE = 0.65; // m per rute i en trapp
const RUN = 5; // ruter: den korteste trappen
const STAIR_CHANCE = 0.75; // så ofte det blir trapp der begge deler går an
const SAME_CHANCE = 1 / 3; // så ofte et bygg i FLOOR_THEMES får nesten like etasjer
const MAIN = 0.5; // man må komme inn i minst denne andelen av etasjen
const TRIES = 400;
const CHECKS = 10; // så mange plasser som prøves med flomfylling (den er dyr i store rom)
const FLOOR_TRIES = 4; // så mange ulike etasjer som prøves før bygget blir lavere

/** Hvor mange etasjer et nytt nivå får: 1 (55 %), 2 (30 %) eller 3 (15 %). */
export function floorCount(rand, cells = 0) {
  const r = rand();
  const n = r < 0.55 ? 1 : r < 0.85 ? 2 : 3;
  return cells >= BIG_ROOM ? Math.min(n, 2) : n;
}

/** Trappeløpet (ruter) for en etasjehøyde. */
export const stairRun = (gap) => Math.max(RUN, Math.round(gap / RISE));

const count = (cells) => cells.reduce((n, c) => n + c, 0);
const at = (i, w) => [i % w, Math.floor(i / w)];
const nearExit = (level, x, z) => STAIR_DIRS.some(([dx, dz]) => doorInfo(level, x + dx, z + dz)?.oneSided);

/** Flatt gulv uten noe på eller over seg, og ikke foran en dør til ingensteds. */
function plain(level, i) {
  const [x, z] = at(i, level.w);
  return level.tiles[i] === TILE.FLOOR && !level.floors[i] && !level.decks[i] && !level.corners[i] && !level.depths[i]
    && !slidesAt(level, x, z).length && !nearExit(level, x, z);
}

/** Det man trenger for å finne en plass mellom to etasjer. from = ruten man kom inn i `lower`. */
function site(lower, upper, from, held, blocked) {
  const [fx, fz] = at(from, lower.w);
  const taken = new Set([...footprintCells(lower), ...footprintCells(upper), ...held, from]);
  for (const [dx, dz] of STAIR_DIRS) taken.add((fz + dz) * lower.w + fx + dx);
  const reach = reachableCells(lower, fx + 0.5, fz + 0.5, blocked);
  const floor = upper.tiles.reduce((n, t) => n + (t === TILE.FLOOR ? 1 : 0), 0);
  return { lower, upper, from, taken, blocked, reach, floor };
}

/** Stenger `closed` noe av i etasjen under (uten `closed` selv)? */
function keepsLower({ lower, from, reach, blocked }, closed) {
  const [fx, fz] = at(from, lower.w);
  const after = reachableCells(lower, fx + 0.5, fz + 0.5, new Set([...blocked, ...closed]));
  return count(after) === count(reach) - closed.filter((i) => reach[i]).length;
}

/** Kommer man fra `arrival` ut i det meste av etasjen over, også når `closed` er vegg? */
function opensUpper({ upper, floor }, arrival, closed) {
  const [ax, az] = at(arrival, upper.w);
  const before = count(reachableCells(upper, ax + 0.5, az + 0.5));
  const shut = closed.filter((i) => upper.tiles[i] !== TILE.WALL).length;
  const after = count(reachableCells(upper, ax + 0.5, az + 0.5, new Set(closed)));
  return after >= before - shut && after >= floor * MAIN;
}

/** Et trappeløp med reposet på gulv i etasjen over: { d, cells, landing } eller null. */
function findStairs(s, gap, rand) {
  const { lower, upper, taken, reach } = s;
  const { w, h } = lower;
  const length = stairRun(gap);
  let checks = 0;
  for (let t = 0; t < TRIES && checks < CHECKS; t++) {
    const d = Math.floor(rand() * 4);
    const [dx, dz] = STAIR_DIRS[d];
    const [x0, z0] = [2 + Math.floor(rand() * (w - 4)), 2 + Math.floor(rand() * (h - 4))];
    const [ex, ez] = [x0 + dx * length, z0 + dz * length];
    const [bx, bz] = [x0 - dx, z0 - dz];
    if (ex < 1 || ez < 1 || ex >= w - 1 || ez >= h - 1 || bx < 1 || bz < 1 || bx >= w - 1 || bz >= h - 1) continue;
    const cells = Array.from({ length }, (_, k) => (z0 + dz * k) * w + x0 + dx * k);
    const landing = ez * w + ex;
    const approach = bz * w + bx;
    if (!reach[approach] || !plain(lower, approach) || !cells.every((i) => plain(lower, i)) || !plain(upper, landing)) continue;
    const all = [approach, ...cells, landing];
    if (all.some((i) => taken.has(i) || lower.tiles[i] === TILE.DOOR || upper.tiles[i] === TILE.DOOR)) continue;
    // Sjakten er vegg der oppe: den går bare gjennom gulv og vegg, ikke vann, trapper eller sklier.
    if (!cells.every((i) => (upper.tiles[i] === TILE.WALL || plain(upper, i)))) continue;
    checks++;
    if (!keepsLower(s, [...cells, landing]) || !opensUpper(s, landing, cells)) continue;
    return { d, cells, landing };
  }
  return null;
}

/** En stige, helst med ryggen mot en vegg i etasjen under: { d, i, exit } eller null. */
function findLadder(s, rand) {
  const { lower, upper, taken, reach } = s;
  const { w, h } = lower;
  let spare = null;
  let checks = 0;
  for (let t = 0; t < TRIES && checks < CHECKS; t++) {
    const [x, z] = [1 + Math.floor(rand() * (w - 2)), 1 + Math.floor(rand() * (h - 2))];
    const d = Math.floor(rand() * 4);
    const [dx, dz] = STAIR_DIRS[d];
    if (x + dx < 1 || z + dz < 1 || x + dx >= w - 1 || z + dz >= h - 1) continue;
    const i = z * w + x;
    const exit = (z + dz) * w + x + dx;
    const free = (j) => !taken.has(j) && reach[j] && plain(lower, j) && plain(upper, j);
    if (!free(i) || !free(exit)) continue;
    checks++;
    if (!opensUpper(s, exit, [i])) continue;
    if (getTile(lower, x - dx, z - dz) === TILE.WALL) return { d, i, exit };
    spare ??= { d, i, exit };
  }
  return spare;
}

function buildStairs(lower, upper, { d, cells, landing }) {
  cells.forEach((i, j) => {
    lower.tiles[i] = TILE.STAIRS;
    lower.floors[i] = (j + 1) * 6; // vanlig stigning i skissen; 3D regner høyden ut (core/stairwells.js)
    lower.meta[i] = d | STAIR_THROUGH;
    lower.lights[i] = LIGHT.NONE;
    upper.tiles[i] = TILE.WALL; // sjakten
    for (const key of ['lights', 'meta', 'floors', 'panels', 'leds', 'corners']) upper[key][i] = 0;
  });
  lower.lights[landing] = LIGHT.NONE;
  return { arrival: landing, held: new Set([landing]), blocked: new Set() };
}

function buildLadder(lower, upper, { d, i, exit }) {
  lower.meta[i] = LADDER | d;
  lower.lights[i] = upper.lights[i] = LIGHT.NONE; // lånt lys (core/ladders.js)
  lower.panels[i] = upper.panels[i] = 0;
  return { arrival: exit, held: new Set([i, exit]), blocked: new Set([i]) };
}

/**
 * Binder `upper` til etasjen under. from: der man kommer inn i `lower` (rute), held: ruter der ingenting
 * skal legges, blocked: de av dem man ikke kan gå på. Returnerer det samme for `upper`, eller null.
 */
function connect(lower, upper, rand, { from, held, blocked }) {
  const s = site(lower, upper, from, held, blocked);
  const gap = storeyGap(lower, upper);
  const fits = gap <= STAIR_MAX;
  const stairs = () => {
    const found = fits ? findStairs(s, gap, rand) : null;
    return found && buildStairs(lower, upper, found);
  };
  const ladder = () => {
    const found = findLadder(s, rand);
    return found && buildLadder(lower, upper, found);
  };
  return rand() < STAIR_CHANCE ? stairs() ?? ladder() : ladder() ?? stairs();
}

/** En kopi av etasje 0, litt feil (som gen/floors.js), uten stigene derfra. */
function nearCopy(room, rand) {
  const copy = copyStorey(room, 0);
  for (let i = 0; i < copy.tiles.length; i++) if (isLadder(copy, i)) copy.meta[i] = 0;
  makeWrong(copy, 'subtle', rand);
  return copy;
}

/** En ny etasje i et tema som ikke er brukt i bygget (`used`). */
export function otherFloor(room, rand, used) {
  const left = MIX_THEMES.filter((id) => !used.includes(id));
  const options = left.length ? left : MIX_THEMES;
  const theme = options[Math.floor(rand() * options.length)];
  return generateLevel({ theme, w: room.w, h: room.h, seed: 1 + Math.floor(rand() * 1e9), name: room.name });
}

/**
 * Legger etasjer på rommet til det har `wanted`: makeFloor(used) lager neste etasje. Går det ikke å binde
 * en etasje til den under, blir bygget lavere. Returnerer antall etasjer.
 */
export function linkFloors(room, rand, wanted, makeFloor) {
  const used = [room.theme];
  const { x, z } = room.spawn;
  let link = { from: Math.floor(z) * room.w + Math.floor(x), held: new Set(), blocked: new Set() };
  for (let k = 1; k < wanted; k++) {
    // Noen etasjer har lite gulv å lande på (kanaler, ballhav): da prøves en annen.
    let upper;
    let next = null;
    for (let tries = 0; tries < FLOOR_TRIES && !next; tries++) {
      upper = makeFloor(used);
      next = connect(storeyLevel(room, k - 1), upper, rand, link);
    }
    if (!next) break;
    insertStorey(room, k, upper);
    used.push(upper.theme);
    link = { from: next.arrival, held: next.held, blocked: next.blocked };
  }
  addElevator(room); // av og til en heis i tillegg (gen/elevators.js)
  return storeyCount(room);
}

/** Tilfeldig antall etasjer på et generert rom (floorCount), oftest med hvert sitt tema. Returnerer antallet. */
export function addFloors(room, rand) {
  const wanted = floorCount(rand, room.w * room.h);
  if (wanted < 2 || !MIX_THEMES.includes(room.theme)) return storeyCount(room);
  const same = FLOOR_THEMES.includes(room.theme) && rand() < SAME_CHANCE;
  return linkFloors(room, rand, wanted, (used) => (same ? nearCopy(room, rand) : otherFloor(room, rand, used)));
}
