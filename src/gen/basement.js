// Kjelleren: en stor stue med et belte av små rom (soverom, bod, et flislagt bad) langs nordveggen
// og, når rommet er bredt nok, langs østveggen. Ytterveggene er to ruter tykke, så det er
// plass til dører som ikke fører noe sted.
import { TILE } from '../core/level.js';
import { autoLights, rectIndices } from '../core/ops.js';
import { fillZone, FINISH } from '../core/zones.js';
import { randInt } from '../core/rng.js';
import { getTheme } from '../core/themes.js';
import { fillRect } from './util.js';
import { hangDoors, doorsInWalls } from './doors.js';
import { DOOR, setDoor } from '../core/doors.js';
import { placeStairs } from '../core/stairs.js';

/** Deler [a..b] i rom på 4–7 ruter med én rute skillevegg imellom: [[start, slutt], …]. */
export function splitBand(rand, a, b) {
  const out = [];
  let s = a;
  while (s <= b) {
    let e = s + randInt(rand, 4, 7) - 1;
    if (b - e < 5) e = b; // ingen smal rest: neste rom må bli minst 4 ruter
    out.push([s, e]);
    s = e + 2;
  }
  return out;
}

/**
 * @returns {{ x0, z0, x1, z1, doors, rooms }} stua (det åpne området som er igjen),
 *          døråpningene inn til de små rommene og rommene selv, for videre innredning.
 */
export function basement(level, rand) {
  const { w, h } = level;
  const room = { x0: 2, z0: 2, x1: w - 3, z1: h - 3, doors: [], rooms: [] };
  fillRect(level, room.x0, room.z0, room.x1, room.z1, TILE.FLOOR);

  const depth = randInt(rand, 4, 6);
  if (room.z1 - room.z0 + 1 >= depth + 8) {
    const wz = room.z0 + depth;
    fillRect(level, room.x0, wz, room.x1, wz, TILE.WALL);
    for (const [a, b] of splitBand(rand, room.x0, room.x1)) {
      if (b < room.x1) fillRect(level, b + 1, room.z0, b + 1, wz - 1, TILE.WALL);
      const door = randInt(rand, a + 1, b - 1);
      fillRect(level, door, wz, door, wz, TILE.DOOR);
      room.doors.push([door, wz]);
      room.rooms.push({ x0: a, z0: room.z0, x1: b, z1: wz - 1 });
    }
    room.z0 = wz + 1;
  }

  const width = randInt(rand, 4, 6);
  if (room.x1 - room.x0 + 1 >= 26 && room.z1 - room.z0 + 1 >= 8) {
    const wx = room.x1 - width;
    fillRect(level, wx, room.z0, wx, room.z1, TILE.WALL);
    for (const [a, b] of splitBand(rand, room.z0, room.z1)) {
      if (b < room.z1) fillRect(level, wx + 1, b + 1, room.x1, b + 1, TILE.WALL);
      const door = randInt(rand, a + 1, b - 1);
      fillRect(level, wx, door, wx, door, TILE.DOOR);
      room.doors.push([wx, door]);
      room.rooms.push({ x0: wx + 1, z0: a, x1: room.x1, z1: b });
    }
    room.x1 = wx - 1;
  }

  // Bærestolper midt i stua når den er stor.
  const rw = room.x1 - room.x0 + 1;
  const rh = room.z1 - room.z0 + 1;
  if (rw >= 14 && rh >= 10) {
    const z = room.z0 + Math.floor(rh / 2);
    for (let x = room.x0 + 5; x <= room.x1 - 5; x += 7) fillRect(level, x, z, x, z, TILE.PILLAR);
  }

  // Trapp langs vestveggen opp til en lukket dør i sørveggen – en trapp til ingensteds.
  if (rh >= 8) {
    const top = room.z1;
    setDoor(level, room.x0, top + 1, DOOR.CLOSED);
    placeStairs(level, [room.x0, top - 3], [room.x0, top]);
  }

  // Det minste av de små rommene blir bad: fliser på gulv og nedre del av veggene.
  const area = (r) => (r.x1 - r.x0 + 1) * (r.z1 - r.z0 + 1);
  const bath = room.rooms.reduce((best, r) => (!best || area(r) < area(best) ? r : best), null);
  if (bath) fillZone(level, 'finish', rectIndices(level, bath), FINISH.TILES);

  autoLights(level, { spacing: getTheme(level.theme).lightSpacing, rand, flicker: 0.01, broken: 0.02 });
  hangDoors(level, rand, { closed: 0.25, ajar: 0.35, open: 0.4, cells: room.doors });
  doorsInWalls(level, rand, 0.05, { nowhere: true, minGap: 6 }); // boder med lamelldører
  return room;
}
