// Ferdige 3D-modeller (gjenstander) i rommet. `level.objects` er en liste med
// { id, x, z, rot } – id i OBJECTS, (x, z) er ruten og rot kvarte omdreininger med klokken
// sett ovenfra (0 = forsiden mot +z, sør i skissen). Som sklielisten endres listen aldri på
// stedet. Gjenstander står midt i ruten eller inntil veggen bak seg; store gjenstander kan
// stikke inn i naboruter. Små gjenstander settes oppå en flate (`surface`, f.eks. et
// skrivebord) som dekker ruten, og flytende (`floats`) kan ligge i vannet. Ren logikk.
import { TILE, getTile, inBounds, WATER_SURFACE } from './level.js';
import { floorAt } from './heights.js';

/**
 * Katalogen. size = [bredde, høyde, dybde] i meter slik gjenstanden står i rommet (selve filen
 * sentreres av world/objects.js), scale = skalering av modellfilen (size er allerede skalert). file = models/<file>.glb. surface = høyden på en flate
 * andre gjenstander kan stå på. build = bygges av enkle former (world/props.js) i stedet for fil. screen = området i teksturen [u0, v0, u1, v1] der en skjerm
 * viser sne-støy, glow = hvor sterkt skjermen lyser opp rundt seg (andel av et taklys).
 * Alle modellene er fra Poly Haven (CC0).
 */
export const OBJECTS = {
  tv: {
    label: 'CRT TV',
    file: 'television_crt',
    size: [0.8, 0.822, 0.7], // modellen × 2: et stort, gammelt TV
    scale: 2,
    screen: [0.691, 0.011, 0.994, 0.235],
    glow: 0.16,
    credit: 'Television 02 – Poly Haven (CC0)',
  },
  boombox: { label: 'Boombox', file: 'classic_boombox', size: [0.724, 0.47, 0.186], credit: 'Boombox – Poly Haven (CC0)' },
  laptop: { label: 'Laptop', file: 'classic_laptop', size: [0.326, 0.272, 0.243], scale: 0.5, credit: 'Classic Laptop – Poly Haven (CC0)' },
  desk: { label: 'Office desk', file: 'office_desk', size: [2, 0.788, 0.947], surface: 0.788, credit: 'Metal Office Desk – Poly Haven (CC0)' },
  duck: { label: 'Rubber duck', file: 'rubber_duck', size: [0.214, 0.286, 0.3], floats: true, credit: 'Rubber Duck Toy – Poly Haven (CC0)' },
  // Bygget av enkle former (world/props.js), uten modellfil.
  kiosk: { label: 'Food kiosk', build: 'kiosk', size: [3, 2.6, 1.5], glow: 0.22 },
  cafe: { label: 'Café table', build: 'cafe', size: [1.7, 0.92, 1.7] },
};

export const OBJECT_IDS = Object.keys(OBJECTS);
export const MAX_OBJECTS = 400;
const WALL_GAP = 0.03; // avstand fra veggen bak
const FLOAT_DEPTH = 0.06; // hvor dypt en flytende gjenstand ligger i vannet
// Retningen forsiden peker for rot 0–3 (med klokken sett ovenfra: sør, vest, nord, øst).
export const FACING = [
  [0, 1],
  [-1, 0],
  [0, -1],
  [1, 0],
];

const list = (level) => level.objects ?? [];
const overlaps = (a, b, e = 0.02) => a[0] < b[2] - e && b[0] < a[2] - e && a[1] < b[3] - e && b[1] < a[3] - e;
const covers = (b, x, z) => x > b[0] && x < b[2] && z > b[1] && z < b[3];

/** Fotavtrykket sett ovenfra: [x0, z0, x1, z1]. */
export function objectBox(p) {
  return [p.x - p.w / 2, p.z - p.d / 2, p.x + p.w / 2, p.z + p.d / 2];
}

/** Plassering uten hensyn til flater: på gulvet (eller i vannet), inntil veggen bak. */
function basePose(level, o) {
  const [w, h, d] = OBJECTS[o.id].size;
  const [fx, fz] = FACING[o.rot & 3];
  let x = o.x + 0.5;
  let z = o.z + 0.5;
  if (getTile(level, o.x - fx, o.z - fz) === TILE.WALL) {
    const back = 0.5 - d / 2 - WALL_GAP; // negativ: dypere enn ruten, skyves fram fra veggen
    x -= fx * back;
    z -= fz * back;
  }
  const water = getTile(level, o.x, o.z) === TILE.WATER;
  const y = water ? WATER_SURFACE - FLOAT_DEPTH : floorAt(level, o.x, o.z);
  const across = fx === 0; // forsiden mot ±z: bredden ligger langs x
  return { x, y, z, rot: o.rot & 3, w: across ? w : d, d: across ? d : w, h };
}

/**
 * Flaten under punktet (x, z), kanten medregnet: { top, box } for den høyeste
 * `surface`-gjenstanden som dekker det, eller null.
 */
function supportAt(level, x, z) {
  let best = null;
  for (const q of list(level)) {
    const def = OBJECTS[q.id];
    if (!def?.surface) continue;
    const p = basePose(level, q);
    const box = objectBox(p);
    const top = p.y + def.surface;
    if (x >= box[0] - 0.01 && x <= box[2] + 0.01 && z >= box[1] - 0.01 && z <= box[3] + 0.01 && (!best || top > best.top)) best = { top, box };
  }
  return best;
}

/**
 * Hvor gjenstanden står: midtpunkt (x, y, z), retning (rot), og utstrekning sett ovenfra
 * (w langs x, d langs z etter dreiningen). Små gjenstander står oppå en flate som dekker
 * midten av ruten, trukket inn så de står helt på flaten.
 */
export function objectPose(level, o) {
  const p = basePose(level, o);
  const s = OBJECTS[o.id].surface ? null : supportAt(level, o.x + 0.5, o.z + 0.5);
  if (s) {
    const clamp = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, v)));
    p.y = s.top;
    p.x = clamp(p.x, s.box[0] + p.w / 2, s.box[2] - p.w / 2);
    p.z = clamp(p.z, s.box[1] + p.d / 2, s.box[3] - p.d / 2);
  }
  return p;
}

/** Gjenstandene som står i ruten eller dekker midten av den, øverste først (indekser). */
export function objectsAt(level, x, z) {
  const hits = [];
  list(level).forEach((o, i) => {
    if (!OBJECTS[o.id]) return;
    const p = objectPose(level, o);
    if ((o.x === x && o.z === z) || covers(objectBox(p), x + 0.5, z + 0.5)) hits.push([i, p.y]);
  });
  return hits.sort((a, b) => b[1] - a[1]).map(([i]) => i);
}

/** Får gjenstanden plass i rommet med listen `objects` (der den selv er med)? */
export function objectFits(level, o, objects = list(level)) {
  const def = OBJECTS[o.id];
  const tile = getTile(level, o.x, o.z);
  if (!def || !(tile === TILE.FLOOR || (def.floats && tile === TILE.WATER))) return false;
  const lv = { ...level, objects };
  const p = objectPose(lv, o);
  const box = objectBox(p);
  // Alle ruter fotavtrykket dekker må være åpne (ikke vegg eller søyle).
  for (let z = Math.floor(box[1] + 0.02); z <= Math.floor(box[3] - 0.02); z++) {
    for (let x = Math.floor(box[0] + 0.02); x <= Math.floor(box[2] - 0.02); x++) {
      const t = getTile(level, x, z);
      if (t === TILE.WALL || t === TILE.PILLAR) return false;
    }
  }
  for (const q of objects) {
    if (q === o || !OBJECTS[q.id]) continue;
    const qp = objectPose(lv, q);
    if (!overlaps(box, objectBox(qp))) continue;
    // Oppå en flate (eller noe som står oppå en) er greit; ellers står de i hverandre.
    const above = (a, b, bd) => bd.surface && Math.abs(a.y - (b.y + bd.surface)) < 0.01;
    if (!above(p, qp, OBJECTS[q.id]) && !above(qp, p, def)) return false;
  }
  return true;
}

/** Forsiden vekk fra en vegg ved siden av, så en ny gjenstand står med ryggen mot veggen. */
function autoRotation(level, x, z) {
  for (let rot = 0; rot < 4; rot++) {
    const [fx, fz] = FACING[rot];
    if (getTile(level, x - fx, z - fz) === TILE.WALL) return rot;
  }
  return 0;
}

/** Prøver retningene fra `rot` og utover; legger inn den første som får plass. */
function tryRotations(level, make, start, from) {
  for (let k = from; k < 4; k++) {
    const { t, objects } = make((start + k) % 4);
    if (objectFits(level, t, objects)) {
      level.objects = objects;
      return 1;
    }
  }
  return 0;
}

/**
 * Objektverktøyet: klikk på en gjenstand av samme slag snur den (kvart omdreining), ellers
 * settes en ny inn (oppå en flate om ruten har det); står noe i veien, snus det som står der.
 * Med erase fjernes den øverste gjenstanden i ruten. Returnerer antall endringer.
 */
export function placeObject(level, x, z, id, erase = false) {
  const objects = list(level);
  const hits = objectsAt(level, x, z);
  const turn = (i) =>
    tryRotations(level, (rot) => {
      const t = { ...objects[i], rot };
      return { t, objects: objects.map((q, j) => (j === i ? t : q)) };
    }, objects[i].rot, 1);
  if (erase) {
    if (!hits.length) return 0;
    level.objects = objects.filter((_, i) => i !== hits[0]);
    return 1;
  }
  const same = hits.find((i) => objects[i].id === id);
  if (same !== undefined) return turn(same);
  if (OBJECTS[id] && objects.length < MAX_OBJECTS) {
    const placed = tryRotations(level, (rot) => {
      const t = { id, x, z, rot };
      return { t, objects: [...objects, t] };
    }, autoRotation(level, x, z), 0);
    if (placed) return 1;
  }
  return hits.length ? turn(hits[0]) : 0;
}

/** Kollisjonsbokser { box: [x0, z0, x1, z1], bottom, top } for gjenstander som når inn i ruten. */
export function objectColliders(level, cx, cz) {
  const out = [];
  const cell = [cx, cz, cx + 1, cz + 1];
  for (const o of list(level)) {
    const def = OBJECTS[o.id];
    if (!def || def.floats || Math.abs(o.x - cx) > 2 || Math.abs(o.z - cz) > 2) continue;
    const p = objectPose(level, o);
    const box = objectBox(p);
    if (overlaps(box, cell, 0)) out.push({ box, bottom: p.y, top: p.y + p.h });
  }
  return out;
}

/** Lyskilder fra skjermer (glow): punktet rett foran skjermen, { x, y, z, power, cx, cz }. */
export function glowSources(level) {
  const out = [];
  for (const o of list(level)) {
    const def = OBJECTS[o.id];
    if (!def?.glow) continue;
    const p = objectPose(level, o);
    const [fx, fz] = FACING[p.rot];
    const reach = (fx ? p.w : p.d) / 2 + 0.15;
    const x = p.x + fx * reach;
    const z = p.z + fz * reach;
    out.push({ x, y: p.y + p.h * 0.62, z, power: def.glow, cx: Math.floor(x), cz: Math.floor(z) });
  }
  return out;
}

/** Gjenstander fra en fil/lenke: kjente id-er innenfor rommet, hele ruter, rot 0–3. */
export function objectsFromJSON(level, data) {
  if (data === undefined || data === null) return [];
  if (!Array.isArray(data)) throw new Error('Invalid objects in the room.');
  return data
    .slice(0, MAX_OBJECTS)
    .map((o) => ({ id: String(o?.id), x: Math.trunc(Number(o?.x)), z: Math.trunc(Number(o?.z)), rot: Math.trunc(Number(o?.rot)) & 3 }))
    .filter((o) => OBJECTS[o.id] && inBounds(level, o.x, o.z));
}
