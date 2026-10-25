// Buede døråpninger i Level 0 (DOOR_ARCH, world/arches.js): noen av de smale åpningene mellom
// veggstykkene blir buer, og noen få buer slås gjennom rette vegger (det gir bare flere veier, så
// rommet henger fortsatt sammen). Bare åpninger med rom på begge sider og samme gulvhøyde.
// Ren logikk.
import { TILE, LIGHT, DOOR_ARCH, getTile } from '../core/level.js';
import { DOOR } from '../core/doors.js';
import { floorAt } from '../core/heights.js';

export const ARCH_THEMES = ['backrooms'];
const GAPS = 0.45; // andel av de smale åpningene som blir buer
const PUNCH_AREA = 450; // én ny bue gjennom en vegg per så mange ruter

const wall = (level, x, z) => getTile(level, x, z) === TILE.WALL;
const DOOR_GAP = 2; // ruter til nærmeste dør, så ingen dørblad slår inn foran buen

function nearDoor(level, x, z) {
  for (let dz = -DOOR_GAP; dz <= DOOR_GAP; dz++) for (let dx = -DOOR_GAP; dx <= DOOR_GAP; dx++) if (getTile(level, x + dx, z + dz) === TILE.DOOR) return true;
  return false;
}

/** Kan (x, z) bli en bue gjennom aksen p (pz: p er z)? want: TILE.FLOOR (åpning) eller TILE.WALL (ny). */
function fits(level, x, z, pz, want, taken) {
  if (getTile(level, x, z) !== want || taken.has(z * level.w + x) || nearDoor(level, x, z)) return false;
  const [ax, az] = pz ? [1, 0] : [0, 1];
  const [px, pzz] = pz ? [0, 1] : [1, 0];
  if (!wall(level, x - ax, z - az) || !wall(level, x + ax, z + az)) return false;
  const fy = floorAt(level, x, z);
  for (const s of [-1, 1]) {
    const nx = x + s * px;
    const nz = z + s * pzz;
    if (getTile(level, nx, nz) !== TILE.FLOOR || level.decks[nz * level.w + nx] || Math.abs(floorAt(level, nx, nz) - fy) > 1e-3) return false;
    if (taken.has(nz * level.w + nx)) return false;
    // Rom på den andre siden, ikke en tunnel: minst én av sidene er åpen.
    if (wall(level, nx - ax, nz - az) && wall(level, nx + ax, nz + az)) return false;
  }
  return !level.decks[z * level.w + x];
}

const fitsEither = (level, [x, z], want, taken) => fits(level, x, z, true, want, taken) || fits(level, x, z, false, want, taken);

function candidates(level, want, taken) {
  const out = [];
  for (let z = 1; z < level.h - 1; z++) {
    for (let x = 1; x < level.w - 1; x++) {
      if (fitsEither(level, [x, z], want, taken)) out.push([x, z]);
    }
  }
  return out;
}

/** Gjør noen åpninger om til buer. @returns antall buer. */
export function archways(level, rand) {
  if (!ARCH_THEMES.includes(level.theme)) return 0;
  const taken = new Set(); // ruter som er i bruk: gjenstander, start, buer og naboene deres
  for (const o of level.objects) taken.add(Math.floor(o.z) * level.w + Math.floor(o.x));
  if (level.spawn) taken.add(Math.floor(level.spawn.z) * level.w + Math.floor(level.spawn.x));
  let count = 0;
  const make = ([x, z]) => {
    const i = z * level.w + x;
    level.tiles[i] = TILE.DOOR;
    level.meta[i] = DOOR.NONE | DOOR_ARCH;
    level.lights[i] = LIGHT.NONE;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) taken.add(i + dz * level.w + dx);
    count++;
  };
  // Nabobuer er tatt etter hvert, så hver kandidat sjekkes på nytt.
  for (const c of candidates(level, TILE.FLOOR, taken)) if (rand() < GAPS && fitsEither(level, c, TILE.FLOOR, taken)) make(c);
  const walls = candidates(level, TILE.WALL, taken);
  for (let n = Math.floor((level.w * level.h) / PUNCH_AREA); n > 0 && walls.length; n--) {
    const [c] = walls.splice(Math.floor(rand() * walls.length), 1);
    if (fitsEither(level, c, TILE.WALL, taken)) make(c);
  }
  return count;
}
