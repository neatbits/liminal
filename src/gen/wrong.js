// «Make it wrong»: gjør et helt vanlig rom litt feil med 5–20 små endringer. Ingen av dem er
// skumle hver for seg – et tak som er litt for høyt, et lys som mangler, en TV som står med
// skjermen mot veggen, en trapp som går opp i taket – men summen gjør at noe føles galt. Ren logikk.
import { TILE, LIGHT, getTile, inBounds, canHaveLight } from '../core/level.js';
import { ceilingAt } from '../core/heights.js';
import { fillZone, FINISH } from '../core/zones.js';
import { DOOR, doorInfo } from '../core/doors.js';
import { placeStairs } from '../core/stairs.js';
import { OBJECTS, placeObject, objectsAt, objectFits } from '../core/objects.js';
import { canHoldWindow, paintWindows } from '../core/windows.js';
import { addExits } from './exits.js';

export const STRENGTHS = {
  subtle: { label: 'Subtle', count: [5, 8] },
  wrong: { label: 'Wrong', count: [9, 14] },
  very: { label: 'Very wrong', count: [15, 20] },
};

const DIRS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

const pick = (rand, list) => list[Math.floor(rand() * list.length)];
const cellsOf = (level, test) => {
  const out = [];
  for (let z = 1; z < level.h - 1; z++) for (let x = 1; x < level.w - 1; x++) if (test(x, z, z * level.w + x)) out.push([x, z]);
  return out;
};
const floorCells = (level) => cellsOf(level, (x, z, i) => level.tiles[i] === TILE.FLOOR);
/** Gulvruter med gulv på alle åtte sider – midt i et rom, ikke i en gang. */
const roomy = (level) =>
  cellsOf(level, (x, z) => {
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (getTile(level, x + dx, z + dz) !== TILE.FLOOR) return false;
    return true;
  });

/** Gulvruter innenfor radius r fra (x, z) i samme åpne område (en «flekk» av rommet). */
function blob(level, x, z, r) {
  const out = [];
  for (let dz = -r; dz <= r; dz++) {
    for (let dx = -r; dx <= r; dx++) {
      const t = getTile(level, x + dx, z + dz);
      if (Math.hypot(dx, dz) <= r && t !== TILE.WALL && t !== TILE.STAIRS) out.push([x + dx, z + dz]);
    }
  }
  return out;
}

// Hver endring: (level, rand) → { what, cells } eller null når den ikke passer i rommet.
const CHANGES = {
  /** Taket er litt for høyt i en del av rommet (+8–15 %). */
  ceilingUp(level, rand) {
    const [x, z] = pick(rand, floorCells(level));
    const cells = blob(level, x, z, 2 + Math.floor(rand() * 3));
    const h = ceilingAt(level, x, z) * (1.08 + rand() * 0.07);
    fillZone(level, 'ceiling', cells.map(([cx, cz]) => cz * level.w + cx), h);
    return { what: 'The ceiling is a little too high here', cells };
  },
  /** … eller litt for lavt. */
  ceilingDown(level, rand) {
    const [x, z] = pick(rand, floorCells(level));
    const cells = blob(level, x, z, 2);
    fillZone(level, 'ceiling', cells.map(([cx, cz]) => cz * level.w + cx), Math.max(2.3, ceilingAt(level, x, z) - 0.25));
    return { what: 'The ceiling dips', cells };
  },
  lightOut(level, rand) {
    const lit = cellsOf(level, (x, z, i) => level.lights[i] === LIGHT.ON);
    if (!lit.length) return null;
    const [x, z] = pick(rand, lit);
    level.lights[z * level.w + x] = rand() < 0.5 ? LIGHT.BROKEN : LIGHT.NONE;
    return { what: 'A light is missing', cells: [[x, z]] };
  },
  lightFlicker(level, rand) {
    const lit = cellsOf(level, (x, z, i) => level.lights[i] === LIGHT.ON);
    if (!lit.length) return null;
    const [x, z] = pick(rand, lit);
    level.lights[z * level.w + x] = LIGHT.FLICKER;
    return { what: 'A light flickers', cells: [[x, z]] };
  },
  /** Ett lys er flyttet én rute ut av mønsteret. */
  lightOffGrid(level, rand) {
    const lit = cellsOf(level, (x, z, i) => level.lights[i] !== LIGHT.NONE);
    for (let k = 0; k < 10 && lit.length; k++) {
      const [x, z] = pick(rand, lit);
      const [dx, dz] = pick(rand, DIRS);
      const i = (z + dz) * level.w + x + dx;
      if (!inBounds(level, x + dx, z + dz) || !canHaveLight(level.tiles[i]) || level.lights[i]) continue;
      level.lights[i] = level.lights[z * level.w + x];
      level.lights[z * level.w + x] = LIGHT.NONE;
      return { what: 'A light is slightly out of line', cells: [[x + dx, z + dz]] };
    }
    return null;
  },
  /** En lukket dør står på gløtt, eller en åpen dør er lukket. */
  doorChanged(level, rand) {
    const doors = cellsOf(level, (x, z) => {
      const d = doorInfo(level, x, z);
      return d && !d.oneSided && d.state !== DOOR.NONE;
    });
    if (!doors.length) return null;
    const [x, z] = pick(rand, doors);
    const i = z * level.w + x;
    const state = level.meta[i] & 3;
    level.meta[i] = (level.meta[i] & ~3) | (state === DOOR.CLOSED ? DOOR.AJAR : DOOR.CLOSED);
    return { what: 'A door is not the way it was', cells: [[x, z]] };
  },
  /** En dør som ikke burde være der. */
  extraDoor(level, rand) {
    const [cell] = addExits(level, rand, 1);
    return cell ? { what: 'A door that leads nowhere', cells: [cell] } : null;
  },
  /** En gjenstand står med forsiden mot veggen. */
  facingWall(level, rand) {
    const list = level.objects ?? [];
    const turnable = list.map((o, k) => k).filter((k) => !OBJECTS[list[k].id].floats && !OBJECTS[list[k].id].surface && !OBJECTS[list[k].id].walk);
    if (!turnable.length) return null;
    const turned = pick(rand, turnable);
    const o = list[turned];
    const t = { ...o, rot: (o.rot + 2) % 4 };
    const next = list.map((q, k) => (k === turned ? t : q));
    if (!objectFits({ ...level, objects: next }, t, next)) return null;
    level.objects = next;
    return { what: `The ${OBJECTS[o.id].label.toLowerCase()} faces the wall`, cells: [[o.x, o.z]] };
  },
  /** En ensom gjenstand midt i et stort rom, der den ikke hører hjemme. */
  outOfPlace(level, rand) {
    const spots = roomy(level).filter(([x, z]) => !objectsAt(level, x, z).length);
    if (!spots.length) return null;
    const [x, z] = pick(rand, spots);
    // Et TV, en boombox – eller en badeand på tørt gulv.
    const id = pick(rand, ['tv', 'tv', 'boombox', 'duck']);
    return placeObject(level, x, z, id) ? { what: 'Something is standing where it should not', cells: [[x, z]] } : null;
  },
  /** En trapp som går opp i taket (en trapp til ingensteds). */
  stairsNowhere(level, rand) {
    for (let k = 0; k < 30; k++) {
      const [x, z] = pick(rand, floorCells(level));
      const [dx, dz] = pick(rand, DIRS);
      // Tre gulvruter fram mot en vegg, med gulv på sidene (ikke i en smal gang).
      const run = [0, 1, 2].map((s) => [x + dx * s, z + dz * s]);
      const wall = getTile(level, x + dx * 3, z + dz * 3) === TILE.WALL;
      const ok = run.every(([cx, cz]) => getTile(level, cx, cz) === TILE.FLOOR && !objectsAt(level, cx, cz).length && getTile(level, cx - dz, cz + dx) === TILE.FLOOR && getTile(level, cx + dz, cz - dx) === TILE.FLOOR);
      if (!wall || !ok) continue;
      placeStairs(level, run[0], run[2]);
      return { what: 'Stairs that go up into the ceiling', cells: run };
    }
    return null;
  },
  /** En enslig søyle midt i et rom uten søyler. */
  lonePillar(level, rand) {
    const spots = roomy(level).filter(([x, z]) => !objectsAt(level, x, z).length && !level.lights[z * level.w + x]);
    if (!spots.length) return null;
    const [x, z] = pick(rand, spots);
    level.tiles[z * level.w + x] = TILE.PILLAR;
    return { what: 'A pillar that holds up nothing', cells: [[x, z]] };
  },
  /** Et lite flislagt felt midt på teppet, som et bad uten vegger. */
  tilePatch(level, rand) {
    const spots = roomy(level).filter(([x, z]) => !level.finish[z * level.w + x]);
    if (!spots.length) return null;
    const [x, z] = pick(rand, spots);
    // Et vanlig 2 × 2-felt (et kryss eller en sirkel ville sett ut som et symbol).
    const cells = [[x, z], [x + 1, z], [x, z + 1], [x + 1, z + 1]].filter(([cx, cz]) => getTile(level, cx, cz) === TILE.FLOOR);
    fillZone(level, 'finish', cells.map(([cx, cz]) => cz * level.w + cx), FINISH.TILES);
    return { what: 'A patch of bathroom tiles', cells };
  },
  /** Ett vindu for mye i en rad – eller et vindu der det ikke burde være noe. */
  extraWindow(level, rand) {
    const spots = cellsOf(level, (x, z) => canHoldWindow(level, x, z) && !(level.meta[z * level.w + x] & 1));
    if (!spots.length) return null;
    const [x, z] = pick(rand, spots);
    paintWindows(level, [[x, z]], true);
    return { what: 'A window that was not there', cells: [[x, z]] };
  },
  fog(level, rand) {
    level.fog = Math.min(2.5, (level.fog ?? 1) * (1.1 + rand() * 0.2));
    return { what: 'The air is a little thicker', cells: [] };
  },
  dimmer(level, rand) {
    level.bright = Math.max(0.4, (level.bright ?? 1) * (0.86 + rand() * 0.06));
    return { what: 'The light is a little dimmer', cells: [] };
  },
};

export const CHANGE_NAMES = Object.keys(CHANGES);
// Lys- og takendringer er de vanligste; luft og lysstyrke bare én gang hver.
const WEIGHTS = { lightOut: 3, lightFlicker: 2, lightOffGrid: 2, ceilingUp: 2, ceilingDown: 1, doorChanged: 2, facingWall: 2, outOfPlace: 1, extraDoor: 1, stairsNowhere: 1, lonePillar: 1, tilePatch: 1, extraWindow: 1, fog: 1, dimmer: 1 };
// Høyst så mange av hver, så endringene spres på flere slags.
const MAX = { ceilingUp: 2, ceilingDown: 1, fog: 1, dimmer: 1, stairsNowhere: 1, lonePillar: 1, tilePatch: 1, outOfPlace: 2, extraDoor: 2, extraWindow: 2 };

/** Én markering per endring: midten av rutene og en radius som dekker dem, { x, z, r }. */
export function changeMarkers(changes) {
  return changes
    .filter((c) => c.cells.length)
    .map(({ cells }) => {
      const x = cells.reduce((s, [cx]) => s + cx + 0.5, 0) / cells.length;
      const z = cells.reduce((s, [, cz]) => s + cz + 0.5, 0) / cells.length;
      const r = Math.max(...cells.map(([cx, cz]) => Math.hypot(cx + 0.5 - x, cz + 0.5 - z))) + 0.7;
      return { x, z, r };
    });
}

/**
 * Gjør rommet feil. strength: 'subtle' | 'wrong' | 'very'.
 * @returns {Array<{ what, cells }>} endringene som ble gjort
 */
export function makeWrong(level, strength = 'wrong', rand = Math.random) {
  const [lo, hi] = (STRENGTHS[strength] ?? STRENGTHS.wrong).count;
  const target = lo + Math.floor(rand() * (hi - lo + 1));
  const done = [];
  const used = {};
  const bag = Object.entries(WEIGHTS).flatMap(([name, w]) => Array(w).fill(name));
  for (let tries = 0; done.length < target && tries < target * 8; tries++) {
    const name = pick(rand, bag);
    if ((used[name] ?? 0) >= (MAX[name] ?? Infinity)) continue;
    if (!floorCells(level).length) break;
    const change = CHANGES[name](level, rand);
    if (!change) continue;
    used[name] = (used[name] ?? 0) + 1;
    done.push({ name, ...change });
  }
  return done;
}
