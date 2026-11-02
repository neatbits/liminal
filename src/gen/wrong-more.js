// Flere endringer til «Make it wrong» (gen/wrong.js): gjenstander som har flyttet seg, blitt to eller veltet, et
// vindu som er murt igjen, en søyle som mangler i rekken, et hull i veggen, et gulv som er litt for høyt, to lys der
// det skulle vært ett, fliser som er borte og en dør uten dørblad. Hver for seg små og aldri skumle, og ingen av dem
// deler rommet i to eller stenger noe inne. Ren logikk.
import { TILE, LIGHT, getTile, canHaveLight } from '../core/level.js';
import { ceilingAt, floorAt, deckAt } from '../core/heights.js';
import { fillZone, zoneRegion, FINISH } from '../core/zones.js';
import { DOOR, doorInfo } from '../core/doors.js';
import { OBJECTS, objectFits } from '../core/objects.js';
import { footprintCells } from '../core/object-pose.js';
import { TIP } from '../core/object-tip.js';
import { paintWindows } from '../core/windows.js';
import { SHOPFRONT } from '../core/shopfronts.js';
import { doorFrontCells } from './door-space.js';
import { DIRS, pick, kept, cellsOf, floorCells } from './wrong-cells.js';

const CHAIRS = ['woodenchair', 'plasticchair', 'officechair', 'dinerchair'];
const MAX_SIZE = 2.2; // m: større gjenstander flyttes og dobles ikke
const ROW = 8; // m: så nær må en annen søyle stå i samme rad
const MAX_FINISH = 60; // ruter: bare små flislagte rom (bad), ikke korridorer

const label = (o) => OBJECTS[o.id].label.toLowerCase();

/** Gjenstander som kan flyttes på: frittstående, små, ikke fysikk eller flater andre står på. */
function movable(level) {
  return (level.objects ?? []).filter((o) => {
    const d = OBJECTS[o.id];
    return !d.structural && !d.mount && !d.walk && !d.floats && !d.soft && !d.loose && !d.surface && !o.tip && !o.lift
      && Math.max(d.size[0], d.size[2]) <= MAX_SIZE && !kept(level, o.x, o.z);
  });
}

/** Setter inn o i stedet for (eller i tillegg til) gjenstanden from, om den får plass og ikke står foran en dør. */
function swap(level, from, o, keep = false) {
  const fronts = new Set(doorFrontCells(level).map(([x, z]) => z * level.w + x));
  if (fronts.has(o.z * level.w + o.x) || kept(level, o.x, o.z)) return false;
  // Midt på gulvet, med gulv rundt: en gjenstand som flyttes eller dobles, skal aldri sperre en gang.
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (getTile(level, o.x + dx, o.z + dz) !== TILE.FLOOR) return false;
  const next = keep ? [...level.objects, o] : level.objects.map((q) => (q === from ? o : q));
  if (!objectFits({ ...level, objects: next }, o, next)) return false;
  level.objects = next;
  return true;
}

export const MORE_CHANGES = {
  /** En gjenstand står én rute fra der den sto. */
  objectMoved(level, rand) {
    const list = movable(level);
    for (let k = 0; k < 12 && list.length; k++) {
      const o = pick(rand, list);
      const [dx, dz] = pick(rand, DIRS);
      if (swap(level, o, { ...o, x: o.x + dx, z: o.z + dz })) return { what: `The ${label(o)} has moved`, cells: [[o.x, o.z], [o.x + dx, o.z + dz]] };
    }
    return null;
  },
  /** Det er to av noe der det var én. */
  objectTwin(level, rand) {
    const list = movable(level).filter((o) => !level.objects.some((p) => p !== o && p.x === o.x && p.z === o.z)); // ikke noe oppå eller under
    for (let k = 0; k < 12 && list.length; k++) {
      const o = pick(rand, list);
      const [dx, dz] = pick(rand, DIRS);
      if (swap(level, o, { id: o.id, x: o.x + dx, z: o.z + dz, rot: o.rot }, true)) return { what: `There are two ${label(o)}s now`, cells: [[o.x, o.z], [o.x + dx, o.z + dz]] };
    }
    return null;
  },
  /** En stol ligger veltet. */
  objectTipped(level, rand) {
    const list = movable(level).filter((o) => CHAIRS.includes(o.id));
    for (let k = 0; k < 6 && list.length; k++) {
      const o = pick(rand, list);
      if (swap(level, o, { ...o, tip: rand() < 0.5 ? TIP.BACK : TIP.SIDE })) return { what: `A ${label(o)} has fallen over`, cells: [[o.x, o.z]] };
    }
    return null;
  },
  /** Et vindu er murt igjen. */
  windowBricked(level, rand) {
    const panes = cellsOf(level, (x, z, i) => level.tiles[i] === TILE.WALL && level.meta[i] & 1 && !(level.meta[i] & SHOPFRONT));
    if (!panes.length) return null;
    const [x, z] = pick(rand, panes);
    paintWindows(level, [[x, z]], false);
    return { what: 'A window has been bricked up', cells: [[x, z]] };
  },
  /** En søyle mangler i en rekke søyler. */
  pillarGone(level, rand) {
    const isPillar = (x, z) => getTile(level, x, z) === TILE.PILLAR;
    const inRow = (x, z) => DIRS.some(([dx, dz]) => Array.from({ length: ROW }, (_, k) => k + 1).some((k) => isPillar(x + dx * k, z + dz * k)));
    const list = cellsOf(level, (x, z) => isPillar(x, z) && !deckAt(level, x, z) && inRow(x, z));
    if (!list.length) return null;
    const [x, z] = pick(rand, list);
    level.tiles[z * level.w + x] = TILE.FLOOR;
    level.meta[z * level.w + x] = 0; // søylens diameter: på en gulvrute ville bitene blitt en stige (core/ladders.js)
    return { what: 'A pillar is missing from the row', cells: [[x, z]] };
  },
  /** Et hull i en tynn vegg mellom to gulv i samme høyde. Rommet blir aldri delt, bare snarere åpnet. */
  wallGap(level, rand) {
    const taken = footprintCells(level); // én gang: å spørre per rute går gjennom alle gjenstandene hver gang
    const plain = (x, z) => getTile(level, x, z) === TILE.FLOOR && !deckAt(level, x, z) && !kept(level, x, z) && !taken.has(z * level.w + x);
    const list = cellsOf(level, (x, z, i) => {
      if (level.tiles[i] !== TILE.WALL || level.meta[i] || x < 2 || z < 2 || x > level.w - 3 || z > level.h - 3) return false;
      return [[1, 0], [0, 1]].some(([dx, dz]) => plain(x - dx, z - dz) && plain(x + dx, z + dz)
        && getTile(level, x - dz, z - dx) === TILE.WALL && getTile(level, x + dz, z + dx) === TILE.WALL
        && Math.abs(floorAt(level, x - dx, z - dz) - floorAt(level, x + dx, z + dz)) < 0.01);
    });
    if (!list.length) return null;
    const [x, z] = pick(rand, list);
    level.tiles[z * level.w + x] = TILE.FLOOR;
    return { what: 'There is a gap in the wall', cells: [[x, z]] };
  },
  /** Gulvet er litt hevet i en liten flekk (10–15 cm). */
  floorRaised(level, rand) {
    const taken = footprintCells(level);
    for (let k = 0; k < 10; k++) {
      const [x, z] = pick(rand, floorCells(level));
      const base = floorAt(level, x, z);
      const cells = [[x, z], [x + 1, z], [x, z + 1], [x + 1, z + 1]];
      // Ingen gjenstander i eller rett ved flekken: lange gjenstander (halvvegger) må stå på ett gulv.
      const clear = cells.every(([cx, cz]) => [-1, 0, 1].every((dz) => [-1, 0, 1].every((dx) => !taken.has((cz + dz) * level.w + cx + dx))));
      const ok = clear && cells.every(([cx, cz]) => getTile(level, cx, cz) === TILE.FLOOR && !kept(level, cx, cz) && !deckAt(level, cx, cz)
        && Math.abs(floorAt(level, cx, cz) - base) < 0.01 && ceilingAt(level, cx, cz) - base > 2.5);
      if (!ok) continue;
      fillZone(level, 'floor', cells.map(([cx, cz]) => cz * level.w + cx), base + 0.1 + Math.round(rand() * 0.5) / 10);
      return { what: 'The floor is slightly raised here', cells };
    }
    return null;
  },
  /** Et lys til rett ved siden av et annet. */
  lightPair(level, rand) {
    const lit = cellsOf(level, (x, z, i) => level.lights[i] === LIGHT.ON);
    for (let k = 0; k < 10 && lit.length; k++) {
      const [x, z] = pick(rand, lit);
      const [dx, dz] = pick(rand, DIRS);
      const i = (z + dz) * level.w + x + dx;
      if (kept(level, x + dx, z + dz) || !canHaveLight(level.tiles[i]) || level.tiles[i] === TILE.DOOR || level.lights[i]) continue;
      level.lights[i] = LIGHT.ON;
      return { what: 'Two lights where there should be one', cells: [[x, z], [x + dx, z + dz]] };
    }
    return null;
  },
  /** Flisene på et lite bad er borte. */
  tilesGone(level, rand) {
    if (['mall', 'school'].includes(level.theme)) return null; // der er belegget butikker og skap
    const tiled = cellsOf(level, (x, z, i) => level.finish[i] === FINISH.TILES && level.tiles[i] === TILE.FLOOR);
    for (let k = 0; k < 6 && tiled.length; k++) {
      const [x, z] = pick(rand, tiled);
      const region = zoneRegion(level, 'finish', x, z);
      if (region.length > MAX_FINISH || region.some((i) => level.keep?.has(i))) continue;
      fillZone(level, 'finish', region, 0);
      return { what: 'The tiles are gone', cells: region.map((i) => [i % level.w, Math.floor(i / level.w)]) };
    }
    return null;
  },
  /** En dør mangler dørbladet. */
  doorRemoved(level, rand) {
    const doors = cellsOf(level, (x, z) => {
      const d = doorInfo(level, x, z);
      return d && !d.oneSided && d.state !== DOOR.NONE;
    });
    if (!doors.length) return null;
    const [x, z] = pick(rand, doors);
    level.meta[z * level.w + x] &= ~3;
    return { what: 'A door has been taken off its hinges', cells: [[x, z]] };
  },
};

export const MORE_WEIGHTS = { objectMoved: 2, objectTwin: 1, objectTipped: 1, windowBricked: 1, pillarGone: 1, wallGap: 1, floorRaised: 1, lightPair: 1, tilesGone: 1, doorRemoved: 1 };
export const MORE_MAX = { objectTwin: 1, objectTipped: 2, windowBricked: 1, pillarGone: 1, wallGap: 1, floorRaised: 1, lightPair: 1, tilesGone: 1, doorRemoved: 1 };
