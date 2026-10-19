// Oppsett av gjenstander som hører sammen (brukt av furnish.js): skrivebord med stol og noe oppå,
// TV-hjørne med konsoll (og sofa), gatekjøkken med bord foran, ventestoler på rad, spillehjørne
// med arkademaskiner, TV-er på rad. Hver funksjon tar (level, rand, x, z) – en gulvrute inntil en
// vegg (eller midt på gulvet) – og returnerer true hvis oppsettet ble satt inn. Ren logikk.
import { TILE, getTile } from '../core/level.js';
import { FACING, placeObject, objectsAt, objectFits } from '../core/objects.js';

// Det som står på skrivebordene (vektet).
const ON_DESK = [
  ['laptop', 0.4],
  ['pc', 0.2],
  ['tv', 0.15],
  ['boombox', 0.1],
  ['cassette', 0.08],
  ['console', 0.07],
];

// Skrivebordet per tema: metallpulten på kontoret og sykehuset, treskrivebord ellers.
const DESKS = { office: ['desk', 'desk', 'desk2'], ward: ['desk'], mall: ['desk'] };

export function pick(rand, weights) {
  let r = rand();
  for (const [id, w] of weights) if ((r -= w) < 0) return id;
  return weights[0][0];
}

/** Er det åpent gulv `n` ruter foran gjenstanden (så den ikke stenger en smal gang)? */
function roomInFront(level, o, n) {
  const [fx, fz] = FACING[o.rot];
  for (let k = 1; k <= n; k++) if (getTile(level, o.x + fx * k, o.z + fz * k) !== TILE.FLOOR) return false;
  return true;
}

/** Setter inn gjenstanden i ruten (ryggen mot veggen); tar den tilbake hvis den stenger for mye. */
export function tryPlace(level, x, z, id, front = 1) {
  if (objectsAt(level, x, z).length || !placeObject(level, x, z, id)) return null;
  const o = level.objects[level.objects.length - 1];
  if (roomInFront(level, o, front)) return o;
  level.objects = level.objects.slice(0, -1);
  return null;
}

/** Setter inn gjenstanden med gitt retning om den får plass. */
export function put(level, id, x, z, rot) {
  const o = { id, x, z, rot };
  const next = [...level.objects, o];
  if (!objectFits({ ...level, objects: next }, o, next)) return null;
  level.objects = next;
  return o;
}

/** Skrivebord mot veggen, ofte med noe oppå og en kontorstol foran (av og til litt skjev). */
export function desk(level, rand, x, z) {
  const id = DESKS[level.theme] ? DESKS[level.theme][Math.floor(rand() * DESKS[level.theme].length)] : 'desk2';
  const d = tryPlace(level, x, z, id, 2);
  if (!d) return false;
  if (rand() < 0.85) placeObject(level, x, z, pick(rand, ON_DESK));
  if (rand() < 0.75) {
    const [fx, fz] = FACING[d.rot];
    const rot = rand() < 0.2 ? (d.rot + 1 + Math.floor(rand() * 3)) % 4 : (d.rot + 2) % 4; // vanligvis mot pulten
    put(level, 'officechair', x + fx, z + fz, rot);
  }
  return true;
}

/** TV mot veggen, en spillkonsoll ved siden av og kontrollerne foran – og kanskje en sofa. */
export function gaming(level, rand, x, z, sofa = false) {
  const tv = tryPlace(level, x, z, 'tv', sofa ? 4 : 2);
  if (!tv) return false;
  const [fx, fz] = FACING[tv.rot];
  const s = rand() < 0.5 ? -1 : 1;
  tryPlace(level, x - fz * s, z + fx * s, 'console', 1);
  placeObject(level, x + fx * 2, z + fz * 2, 'gamepad');
  // Sofaen 3,5 m foran TV-en, med ansiktet mot den.
  if (sofa) put(level, 'sofa', x + fx * 4, z + fz * 4, (tv.rot + 2) % 4);
  return true;
}

/** Bordet ved et gatekjøkken: et dinersett eller et kafébord. */
export function table(rand) {
  return rand() < 0.5 ? 'dinerset' : 'cafe';
}

/** Kiosk mot veggen, og et bord et par meter foran den (litt til siden). */
export function foodspot(level, rand, x, z) {
  const kiosk = tryPlace(level, x, z, 'kiosk', 3);
  if (!kiosk) return false;
  const [fx, fz] = FACING[kiosk.rot];
  const side = rand() < 0.5 ? -1 : 1;
  const id = table(rand);
  for (const [ahead, across] of [[3, side], [3, -side], [4, 0], [3, 0]]) {
    if (placeObject(level, x + fx * ahead - fz * across, z + fz * ahead + fx * across, id)) break;
  }
  return true;
}

/** Ved siden av hverandre langs veggen: 2–4 av gjenstandene (eller en og annen mangler). */
function row(level, rand, x, z, ids, front) {
  const first = tryPlace(level, x, z, ids[0], front);
  if (!first) return false;
  const [fx, fz] = FACING[first.rot];
  const n = 2 + Math.floor(rand() * 3);
  for (let k = 1; k < n; k++) {
    if (rand() < 0.15) continue; // et hull i rekken
    put(level, ids[k % ids.length], x - fz * k, z + fx * k, first.rot);
  }
  return true;
}

/** Ventestoler på rad mot veggen (sykehus, hotell). */
export function chairs(level, rand, x, z) {
  return row(level, rand, x, z, ['dinerchair'], 1);
}

/** Arkademaskiner side om side – et spillehjørne som ingen har spilt i på lenge. */
export function arcades(level, rand, x, z) {
  return row(level, rand, x, z, rand() < 0.5 ? ['arcade', 'arcade2'] : ['arcade2', 'arcade'], 2);
}

/** Tre TV-er ved siden av hverandre langs veggen (en butikk som aldri stengte). */
export function tvrow(level, rand, x, z) {
  const o = tryPlace(level, x, z, 'tv', 1);
  if (!o) return false;
  const [fx, fz] = FACING[o.rot];
  for (const s of [-1, 1]) tryPlace(level, x - fz * s, z + fx * s, 'tv', 1);
  return true;
}
