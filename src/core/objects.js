// Ferdige 3D-modeller (gjenstander) i rommet. `level.objects` er en liste med
// { id, x, z, rot, v? } – id i OBJECTS (object-catalog.js), v = valgfri variant (farge), (x, z) er ruten og rot kvarte omdreininger med klokken
// sett ovenfra (0 = forsiden mot +z, sør i skissen). Som sklielisten endres listen aldri på
// stedet. Gjenstander står midt i ruten eller inntil veggen bak seg; store gjenstander kan
// stikke inn i naboruter. Små gjenstander settes oppå en flate (`surface`, f.eks. et
// skrivebord) som dekker ruten, og flytende (`floats`) kan ligge i vannet. Ren logikk.
import { TILE, getTile, inBounds } from './level.js';
import { cornerShape } from './corners.js';
import { pillarsTouchBox } from './pillars.js';
import { getTheme } from './themes.js';
import { floorAt, ceilingAt } from './heights.js';
import { OBJECTS } from './object-catalog.js';
import { FACING, objectBox, overlaps, poser } from './object-pose.js';

export { OBJECTS, OBJECT_IDS } from './object-catalog.js';
export { FACING, objectBox, objectPose, poser } from './object-pose.js';
export { objectGround, walkBlockers } from './object-walk.js';

export const MAX_OBJECTS = 400;

const list = (level) => level.objects ?? [];
const covers = (b, x, z) => x > b[0] && x < b[2] && z > b[1] && z < b[3];

/** Gjenstandene som står i ruten eller dekker midten av den, øverste først (indekser). */
export function objectsAt(level, x, z) {
  const hits = [];
  const pose = poser(level);
  list(level).forEach((o, i) => {
    if (!OBJECTS[o.id]) return;
    const p = pose(o);
    if ((o.x === x && o.z === z) || covers(objectBox(p), x + 0.5, z + 0.5)) hits.push([i, p.y]);
  });
  return hits.sort((a, b) => b[1] - a[1]).map(([i]) => i);
}

/** Får gjenstanden plass i rommet med listen `objects` (der den selv er med)? */
export function objectFits(level, o, objects = list(level)) {
  const def = OBJECTS[o.id];
  const tile = getTile(level, o.x, o.z);
  if (!def || !(tile === TILE.FLOOR || ((def.floats || (def.pit && getTheme(level.theme).pit === 'balls')) && tile === TILE.WATER))) return false;
  // På veggen: det må være vegg bak.
  if (def.mount === 'wall' && getTile(level, o.x - FACING[o.rot & 3][0], o.z - FACING[o.rot & 3][1]) !== TILE.WALL) return false;
  const pose = poser({ ...level, objects });
  const p = pose(o);
  const box = objectBox(p);
  if (pillarsTouchBox(level, box)) return false;
  if(def.fullSupport)for(const q of objects) {
    const surface = OBJECTS[q.id]?.surface;
    if(!surface)continue;
    const support = pose(q), b = objectBox(support);
    if(Math.abs(p.y-support.y-surface)>.01||p.x<b[0]||p.x>b[2]||p.z<b[1]||p.z>b[3])continue;
    if(box[0]<b[0]-.01||box[1]<b[1]-.01||box[2]>b[2]+.01||box[3]>b[3]+.01)return false;
  }
  // Alle ruter fotavtrykket dekker må være åpne (ikke vegg eller søyle).
  for (let z = Math.floor(box[1] + 0.02); z <= Math.floor(box[3] - 0.02); z++) {
    for (let x = Math.floor(box[0] + 0.02); x <= Math.floor(box[2] - 0.02); x++) {
      const t = getTile(level, x, z);
      if (t === TILE.WALL || t === TILE.PILLAR || (def.floats && t !== TILE.WATER)) return false;
      if (def.structural && (t !== TILE.FLOOR || Math.abs(floorAt(level, x, z) - p.y) > 0.01 || ceilingAt(level, x, z) < p.y + p.h + 0.05)) return false;
      if (t === TILE.FLOOR && cornerShape(level, x, z)) return false; // skrått/avrundet hjørne
    }
  }
  for (const q of objects) {
    if (q === o || !OBJECTS[q.id]) continue;
    const qp = pose(q);
    if (!overlaps(box, objectBox(qp))) continue;
    // Den ene oppå den andre (på en flate eller en stabel) er greit; ellers står de i hverandre.
    if (p.y < qp.y + qp.h - 0.01 && qp.y < p.y + p.h - 0.01) return false;
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
      const variants = OBJECTS[id].soft ? 8 : OBJECTS[id].loose?.radius ? 4 : 0;
      const t = { id, x, z, rot, ...(variants ? { v: (x * 7 + z * 13 + objects.length) % variants } : {}) };
      return { t, objects: [...objects, t] };
    }, autoRotation(level, x, z), 0);
    if (placed) return 1;
  }
  // Stupebrettet (walk) snus ikke av at noe annet settes i en rute det dekker.
  return hits.length && !OBJECTS[objects[hits[0]].id].walk ? turn(hits[0]) : 0;
}

/** Kollisjonsbokser { box: [x0, z0, x1, z1], bottom, top } for gjenstander som når inn i ruten. */
export function objectColliders(level, cx, cz) {
  const out = [];
  const cell = [cx, cz, cx + 1, cz + 1];
  const pose = poser(level);
  for (const o of list(level)) {
    const def = OBJECTS[o.id];
    if (!def || def.floats || def.soft || def.loose || def.walk || Math.abs(o.x - cx) > 3 || Math.abs(o.z - cz) > 3) continue;
    const p = pose(o);
    const box = objectBox(p);
    if (overlaps(box, cell, 0)) out.push({ box, bottom: p.y, top: p.y + p.h });
  }
  return out;
}

/** Lyskilder fra skjermer (glow): punktet rett foran skjermen, { x, y, z, power, cx, cz }. */
export function glowSources(level) {
  const out = [];
  const pose = poser(level);
  for (const o of list(level)) {
    const def = OBJECTS[o.id];
    if (!def?.glow) continue;
    const p = pose(o);
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
    .map((o) => {
      const v = Math.trunc(Number(o?.v));
      return { id: String(o?.id), x: Math.trunc(Number(o?.x)), z: Math.trunc(Number(o?.z)), rot: Math.trunc(Number(o?.rot)) & 3, ...(v >= 0 && v < 16 ? { v } : {}) };
    })
    .filter((o) => OBJECTS[o.id] && inBounds(level, o.x, o.z));
}
