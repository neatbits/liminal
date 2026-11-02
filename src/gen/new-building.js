// Hele bygg fra editoren: New room og Generate/Random i sidepanelet velger antall etasjer. Samme frø,
// tema, størrelse og etasjevalg gir samme bygg. Etasjene bindes sammen som i gen/mixed-floors.js. Ren logikk.
import { mulberry32 } from '../core/rng.js';
import { emptyStorey, insertStorey, storeyCount, MAX_STOREYS } from '../core/storeys.js';
import { generateLevel, levelFromTemplate } from './index.js';
import { addFloors, linkFloors, otherFloor, BIG_ROOM } from './mixed-floors.js';

const FLOOR_SEED = 0xf100; // eget frø: romoppsettet i etasje 0 er det samme med én og flere etasjer
const BIG_FLOORS = 3; // store rom: 8 genererte etasjer på 128 × 128 m låser siden i over 20 s

/** Flest etasjer man kan velge for en mal og størrelse. Tomme etasjer koster ingenting. */
export const floorLimit = (template, w, h) => (template !== 'empty' && w * h >= BIG_ROOM ? BIG_FLOORS : MAX_STOREYS);

/**
 * Et generert bygg. floors: antall, eller 'random' (1–3, som de uendelige nivåene). mix: hvert sitt tema,
 * ellers samme tema med ulike rom. height/waterDepth: beholdes fra rommet det erstatter (stigningen i
 * trappene regnes ut fra dem). Mangler det plass, blir bygget lavere.
 */
export function generateBuilding({ floors = 1, mix = true, height, waterDepth, ...o }) {
  const room = generateLevel(o);
  if (height) room.height = height;
  if (waterDepth) room.waterDepth = waterDepth;
  const rand = mulberry32(o.seed ^ FLOOR_SEED);
  if (floors === 'random') addFloors(room, rand);
  else {
    const same = () => generateLevel({ ...o, seed: 1 + Math.floor(rand() * 1e9) });
    linkFloors(room, rand, floors, (used) => (mix ? otherFloor(room, rand, used) : same()));
  }
  return room;
}

/** Nytt rom fra en mal (TEMPLATES): tomme etasjer, haller med trapp eller stige, eller et generert bygg. */
export function newBuilding(template, { floors = 1, mix = true, ...o }) {
  if (template === 'random') return generateBuilding({ floors, mix, ...o });
  const room = levelFromTemplate(template, o);
  if (template === 'hall') linkFloors(room, mulberry32(o.seed ^ FLOOR_SEED), floors, () => levelFromTemplate('hall', o));
  else while (storeyCount(room) < floors && insertStorey(room, storeyCount(room), emptyStorey(room)) > 0);
  return room;
}
