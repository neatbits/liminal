// Heiser mellom etasjene: en sjakt på 4 × 4 ruter gjennom hele bygget. Innerst er heisvognen (2 × 2 ruter), rundt den
// sjaktveggen, og i veggen mot `dir` (STAIR_DIRS) en dobbel dør (2 ruter). Heisen stopper i etasjene der det er gulv
// rett foran dørene (reposet); i etasjene imellom er sjakten massiv. Heisene hører til bygget og lagres i rommet
// (`room.elevators`: [{ x, z, dir }], x/z = hjørnet med lavest x og z), og listen byttes ut, endres aldri på stedet.
// applyElevators legger vognen, veggene og dørene inn i etasjene slik de bygges og gås i (walkLevels i
// core/stairwells.js) og gir hver etasje `lifts`. Ren logikk.
import { TILE, LIGHT, DOOR_HEIGHT, inBounds, getTile } from './level.js';
import { STAIR_DIRS, ceilingAt, HEADROOM } from './heights.js';
import { storeyCount, storeyLevel } from './storeys.js';
import { dm } from './storey-seams.js';
import { clearObjects } from './object-pose.js';

export const ELEVATOR = { SIZE: 4, MAX: 8, CAR_HEIGHT: 2.4 };

/** Ruten (u, v) i heisens eget system: u langs døren (0–3), v innover fra dørveggen (0) – v = −1 er reposet. */
export function cellOf({ x, z, dir }, u, v) {
  if (dir === 0) return [x + u, z + v];
  if (dir === 2) return [x + 3 - u, z + 3 - v];
  if (dir === 1) return [x + 3 - v, z + u];
  return [x + v, z + 3 - u];
}

/** Rutene: car (vognen), door (døråpningen), ring (sjaktveggen uten døren), landing (reposet), all (4 × 4). */
export function footprint(e) {
  const out = { car: [], door: [], ring: [], landing: [], all: [] };
  for (let v = 0; v < 4; v++) {
    for (let u = 0; u < 4; u++) {
      const c = cellOf(e, u, v);
      out.all.push(c);
      const inner = u === 1 || u === 2;
      if (inner && v === 0) out.door.push(c);
      else if (inner && (v === 1 || v === 2)) out.car.push(c);
      else out.ring.push(c);
    }
  }
  out.landing = [cellOf(e, 1, -1), cellOf(e, 2, -1)];
  return out;
}

const plainFloor = (level, [x, z]) => inBounds(level, x, z) && getTile(level, x, z) === TILE.FLOOR && !level.decks[z * level.w + x];
const fits = (room, e) => e.x >= 0 && e.z >= 0 && e.x + 3 < room.w && e.z + 3 < room.h;

/** Etasjene heisen stopper i (gulv foran begge dørrutene), nederst først. */
export function elevatorStops(room, e) {
  if (!fits(room, e)) return [];
  const { landing } = footprint(e);
  const out = [];
  for (let k = 0; k < storeyCount(room); k++) if (landing.every((c) => plainFloor(storeyLevel(room, k), c))) out.push(k);
  return out;
}

const overlaps = (a, b) => {
  const cells = (e) => { const f = footprint(e); return new Set([...f.all, ...f.landing].map(([x, z]) => `${x},${z}`)); };
  const sa = cells(a);
  return [...cells(b)].some((c) => sa.has(c));
};

/** Hvorfor en heis ikke får plass, eller null. skip: heisen som flyttes eller snus. */
export function elevatorProblem(room, e, skip = null) {
  if (storeyCount(room) < 2) return 'An elevator connects floors – add one with + Floor first.';
  if (!fits(room, e)) return 'The elevator does not fit here: it takes 4 × 4 m inside the map.';
  if ((room.elevators ?? []).some((o) => o !== skip && overlaps(o, e))) return 'Another elevator is in the way.';
  if (elevatorStops(room, e).length < 2) return 'The elevator needs floor in front of its doors (where the arrow points) on at least two floors.';
  return null;
}

/** Heisen som dekker ruten (x, z), eller null. */
export function elevatorAt(room, x, z) {
  return (room.elevators ?? []).find((e) => footprint(e).all.some(([cx, cz]) => cx === x && cz === z)) ?? null;
}

/**
 * Klikk med heisverktøyet i (x, z): en ny heis med vognen rundt ruten (dørene dit flest etasjer har gulv), en
 * eksisterende snus til neste retning som får plass, eller (erase) fjernes. Returnerer { changed, problem }.
 */
export function toggleElevator(room, x, z, erase = false) {
  const list = room.elevators ?? [];
  const old = elevatorAt(room, x, z);
  if (erase) {
    if (!old) return { changed: false, problem: null };
    room.elevators = list.filter((e) => e !== old);
    return { changed: true, problem: null };
  }
  if (!old && list.length >= ELEVATOR.MAX) return { changed: false, problem: `A building can have at most ${ELEVATOR.MAX} elevators.` };
  const at = old ?? { x: x - 1, z: z - 1, dir: 0 };
  const order = old ? [1, 2, 3].map((s) => (old.dir + s) % 4)
    : [0, 1, 2, 3].sort((a, b) => elevatorStops(room, { ...at, dir: b }).length - elevatorStops(room, { ...at, dir: a }).length);
  let problem = null;
  for (const dir of order) {
    const e = { x: at.x, z: at.z, dir };
    problem = elevatorProblem(room, e, old);
    if (problem) continue;
    room.elevators = old ? list.map((o) => (o === old ? e : o)) : [...list, e];
    return { changed: true, problem: null };
  }
  return { changed: false, problem: old ? null : problem };
}

function clear(level, [x, z], tile) {
  const i = z * level.w + x;
  level.tiles[i] = tile;
  for (const key of ['meta', 'lights', 'floors', 'finish', 'decks', 'corners', 'leds', 'panels', 'depths', 'ceilings']) level[key][i] = 0;
  return i;
}

/**
 * Vognen, sjaktveggene og dørene i etasjene fra walkLevels. Hver etasje får `lifts`: [{ id, dir, car, door, landing,
 * floor (m), stops }] for heisene som stopper der (id = plassen i room.elevators). Vognen og døren har gulvet i
 * høyde med reposet; vognen får lavt tak og et ustabilt lys (LIGHT.FLICKER).
 */
export function applyElevators(room, levels) {
  for (const level of levels) level.lifts = [];
  (room.elevators ?? []).forEach((e, id) => {
    const stops = elevatorStops(room, e).filter((k) => k < levels.length);
    if (stops.length < 2) return;
    const f = footprint(e);
    for (let k = stops[0]; k <= stops[stops.length - 1]; k++) {
      const level = levels[k];
      if (!stops.includes(k)) {
        clearObjects(level, f.all.map((c) => clear(level, c, TILE.WALL))); // sjakten går forbi
        continue;
      }
      const floor = Math.max(...f.landing.map(([x, z]) => level.floors[z * level.w + x])) / 10;
      const head = Math.max(floor + HEADROOM, Math.min(floor + ELEVATOR.CAR_HEIGHT, ...f.landing.map(([x, z]) => ceilingAt(level, x, z))));
      const cells = [];
      for (const c of f.ring) cells.push(clear(level, c, TILE.WALL));
      for (const [list, top] of [[f.car, head], [f.door, Math.min(head, floor + DOOR_HEIGHT)]]) {
        for (const c of list) {
          const i = clear(level, c, TILE.FLOOR);
          [level.floors[i], level.ceilings[i]] = [dm(floor), dm(top)];
          cells.push(i);
        }
      }
      const [lx, lz] = f.car[0];
      level.lights[lz * level.w + lx] = LIGHT.FLICKER;
      clearObjects(level, [...cells, ...f.landing.map(([x, z]) => z * level.w + x)]);
      level.lifts.push({ id, x: e.x, z: e.z, dir: e.dir, lamp: [lx, lz], car: f.car, door: f.door, landing: f.landing, floor, head, stops, k });
    }
  });
}

export const elevatorsToJSON = (room) => (room.elevators?.length ? room.elevators.map(({ x, z, dir }) => [x, z, dir]) : undefined);

/** [[x, z, dir], …] fra en fil eller lenke; ugyldige heiser hoppes over. */
export function elevatorsFromJSON(room, list) {
  if (!Array.isArray(list)) return;
  const out = [];
  for (const item of list.slice(0, ELEVATOR.MAX)) {
    const [x, z, dir] = Array.isArray(item) ? item.map(Number) : [];
    const e = { x, z, dir };
    if ([x, z, dir].every(Number.isInteger) && dir >= 0 && dir < 4 && fits(room, e) && !out.some((o) => overlaps(o, e))) out.push(e);
  }
  if (out.length) room.elevators = out;
}

/** Retningen ut av døren, [dx, dz]. */
export const elevatorDir = (e) => STAIR_DIRS[e.dir];
