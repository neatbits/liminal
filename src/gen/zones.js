// Områdene i Noclip (view3d/zones.js): én sammenhengende verden av genererte nivåer etter hverandre langs x, uten
// dører og svart skjerm. Hvert område har en gang inn i vest og en gang ut i øst, like lange og like brede, ved
// kanten av kartet. Neste område legges slik at gangene ligger oppå hverandre; midt i gangen (skjøten) slutter det
// ene og det andre tar over. Ganger og lamper er like i begge, så lyset og formen fortsetter. Ren logikk.
import { TILE, LIGHT, getTile } from '../core/level.js';
import { doorInfo } from '../core/doors.js';
import { connect } from './zone-paths.js';
import { randInt } from '../core/rng.js';
import { generateLevel } from './index.js';
import { variedDims } from './sizes.js';
import { nextTheme } from './endless.js';
import { moodLevel } from './moods.js';
import { mulberry32 } from '../core/rng.js';

export const SEAM = {
  S: 8, // ruter: gangen ved kanten (begge områdene har den hele; skjøten er midt i)
  ROWS: 3, // gangens bredde
  CEIL: 26, // dm: takhøyden i gangen, lik i alle temaer
  LAMPS: [2, 5], // lampene i gangen, regnet fra vestenden (østgangen speiler dem: w − S + x)
  MIN_W: 46, // områdene er lange nok til at det tar tid å gå gjennom dem
  MIN_H: 28,
  SCALE: 1.3,
};

/**
 * Et nytt område (uten ganger ennå): Level 0 først, så et annet tema enn forrige område. Ikke salen med bakke ned
 * (gen/level0-layouts.js): det meste av den er hevet, og gangene på gulvhøyde 0 måtte gravd seg gjennom den.
 */
export function zoneLevel(depth, prevTheme, rand, scale = 1) {
  const theme = depth === 1 ? 'backrooms' : nextTheme(prevTheme, rand);
  const [vw, vh] = variedDims(theme, scale * SEAM.SCALE, rand);
  const [w, h] = [Math.min(128, Math.max(SEAM.MIN_W, vw)), Math.min(128, Math.max(SEAM.MIN_H, vh))];
  let level;
  for (let k = 0; k < 6 && (!level || level.layout === 'slope'); k++) {
    level = generateLevel({ theme, w, h, seed: 1 + Math.floor(rand() * 1e9), name: `Level ${depth}` });
  }
  return level;
}

function clearCell(level, x, z, tile) {
  const i = z * level.w + x;
  level.tiles[i] = tile;
  level.meta[i] = level.lights[i] = level.floors[i] = level.finish[i] = level.decks[i] = level.corners[i] = level.leds[i] = level.panels[i] = 0;
  level.ceilings[i] = tile === TILE.FLOOR ? SEAM.CEIL : 0;
  level.depths[i] = 0;
}

/** Gangen ved kanten i kolonnene [x0, x1], rad z … z + 2, med massiv vegg rundt. Returnerer den innerste kolonnen. */
function corridor(level, x0, x1, z) {
  for (let x = x0; x <= x1; x++) for (let r = 0; r < level.h; r++) clearCell(level, x, r, r >= z && r < z + SEAM.ROWS ? TILE.FLOOR : TILE.WALL);
  level.objects = level.objects.filter((o) => o.x < x0 || o.x > x1);
  for (const lx of SEAM.LAMPS) level.lights[(z + 1) * level.w + (x0 === 0 ? lx : level.w - SEAM.S + lx)] = LIGHT.ON;
}

/** Fra gangen og innover til gulvet i området (graver tre ruter bredt til den treffer gulv). */
function tunnel(level, x, z, step) {
  for (; x > 0 && x < level.w - 1; x += step) {
    const open = [0, 1, 2].some((r) => getTile(level, x, z + r) === TILE.FLOOR);
    for (let r = 0; r < SEAM.ROWS; r++) if (getTile(level, x, z + r) !== TILE.FLOOR) clearCell(level, x, z + r, TILE.FLOOR);
    if (open) return;
  }
}

/**
 * Legger gangene inn (entry: om området har en gang inn fra vest) og stenger dørene til ingensteds (her går man videre
 * gjennom gangene). Returnerer { entry, exit }: raden der gangene begynner (null uten gang inn).
 */
export function addSeams(level, rand, { entry = true } = {}) {
  const row = () => randInt(rand, 3, level.h - SEAM.ROWS - 3);
  const out = { entry: entry ? row() : null, exit: row() };
  if (entry) {
    corridor(level, 0, SEAM.S - 1, out.entry);
    tunnel(level, SEAM.S, out.entry, 1);
  }
  corridor(level, level.w - SEAM.S, level.w - 1, out.exit);
  tunnel(level, level.w - SEAM.S - 1, out.exit, -1);
  // Man skal komme seg fra der man kommer inn til gangen ut uten å krype eller gå gjennom møbler.
  const from = entry ? [1.5, out.entry + 1.5] : [level.spawn.x, level.spawn.z];
  connect(level, from, [level.w - 1.5, out.exit + 1.5], [SEAM.S, level.w - SEAM.S - 1]); // gen/zone-paths.js
  // Til slutt: dører som fører ut av kartet blir vegg, og dører uten vegger på sidene blir åpninger.
  for (let i = 0; i < level.tiles.length; i++) {
    const [x, z] = [i % level.w, Math.floor(i / level.w)];
    if (level.tiles[i] !== TILE.DOOR) continue;
    const info = doorInfo(level, x, z);
    if (!info) clearCell(level, x, z, TILE.FLOOR); // står ikke lenger mellom to vegger: en åpning
    else if (info.oneSided) clearCell(level, x, z, TILE.WALL);
  }
  return out;
}

/** Hvor område b ligger sett fra område a (b kommer etter a): [dx, dz]. Gangene ligger da oppå hverandre. */
export function zoneOffset(a, b) {
  return [a.level.w - SEAM.S, a.exit - b.entry];
}

/** Skjøtene i et område (egne koordinater): vest (inn) og øst (ut), x-verdien midt i gangen. */
export const seamWest = () => SEAM.S / 2;
export const seamEast = (level) => level.w - SEAM.S / 2;

/**
 * Hele området slik Noclip bruker det (også fra view3d/zone-worker.js): nivået med stemningens feil og gangene.
 * @param o { index (0 = det første), seed, prevTheme, mood, scale }
 * @returns {{ level, entry, exit }}
 */
export function makeZone({ index, seed, prevTheme = null, mood, scale = 1 }) {
  const rand = mulberry32(seed + index * 7919);
  const raw = zoneLevel(index + 1, prevTheme, rand, scale);
  const level = moodLevel(raw, mood, rand) || raw;
  return { level, ...addSeams(level, rand, { entry: index > 0 }) };
}
