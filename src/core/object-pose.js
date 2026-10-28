// Hvor en gjenstand står (core/objects.js): inntil veggen bak, på gulvet eller i vannet, oppå en
// flate (`surface`) eller stablet på klossene før seg (`soft`). Stablingen trenger posituren til
// mange andre gjenstander, så `poser` husker dem innenfor ett kall – uten det vokser tiden med
// kuben av antall gjenstander (lekerommet i store nivåer). Ren logikk.
import { TILE, getTile, WATER_SURFACE } from './level.js';
import { floorAt, ceilingAt } from './heights.js';
import { OBJECTS } from './object-catalog.js';
import { playBallOffset, pitBallSupport } from './play-balls.js';
import { tipFrame } from './object-tip.js';

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
export const overlaps = (a, b, e = 0.02) => a[0] < b[2] - e && b[0] < a[2] - e && a[1] < b[3] - e && b[1] < a[3] - e;

/** Fotavtrykket sett ovenfra: [x0, z0, x1, z1]. */
export function objectBox(p) {
  return [p.x - p.w / 2, p.z - p.d / 2, p.x + p.w / 2, p.z + p.d / 2];
}

/** Plassering uten hensyn til flater: på gulvet (eller i vannet), inntil veggen bak. */
function basePose(level, o) {
  const [w, h, d] = tipFrame(o.tip ?? 0, OBJECTS[o.id].size).size; // veltet: annen utstrekning (object-tip.js)
  const [fx, fz] = FACING[o.rot & 3];
  let x = o.x + 0.5;
  let z = o.z + 0.5;
  // Gjenstander i en haug (tip/lift/off) ligger der haugen la dem, ikke inntil veggen.
  const placed = o.tip || o.lift || o.off;
  if (!placed && !OBJECTS[o.id].structural && !OBJECTS[o.id].loose?.radius && getTile(level, o.x - fx, o.z - fz) === TILE.WALL) {
    // Negativ: dypere enn ruten, skyves fram fra veggen. Veggklokker henger helt inntil; gap
    // trekker gjenstanden ut fra veggen (TV-benken, så et dypt TV står med forkanten i flukt).
    const back = 0.5 - d / 2 - (OBJECTS[o.id].mount === 'wall' ? 0.005 : WALL_GAP + (OBJECTS[o.id].gap ?? 0));
    x -= fx * back;
    z -= fz * back;
  }
  const def = OBJECTS[o.id];
  if (def.loose?.radius) {
    const [dx, dz] = playBallOffset(o); x += dx; z += dz;
  }
  // shift: står så mange meter fram fra ruten (stupebrettet: foten på kanten, brettet over vannet).
  x += fx * (def.shift ?? 0) + (o.off?.[0] ?? 0); // off: flyttet innenfor ruten (haugene)
  z += fz * (def.shift ?? 0) + (o.off?.[1] ?? 0);
  const water = getTile(level, o.x, o.z) === TILE.WATER;
  const floor = floorAt(level, o.x, o.z);
  const y = water ? (def.pit ? pitBallSupport(x, z) : WATER_SURFACE - FLOAT_DEPTH) :
    def.mount === 'ceiling' ? ceilingAt(level, o.x, o.z) - h - 0.01 : floor + (def.lift ?? 0) + (o.lift ?? 0);
  const across = fx === 0; // forsiden mot ±z: bredden ligger langs x
  return { x, y, z, rot: o.rot & 3, tip: o.tip ?? 0, w: across ? w : d, d: across ? d : w, h };
}

/**
 * Posituren til gjenstandene i rommet, regnet ut én gang hver: pose(o) → { x, y, z, rot, w, d, h }.
 * Gjelder rommet slik det er nå – lag en ny når rommet eller listen endres.
 */
export function poser(level) {
  const base = new Map();
  const full = new Map();
  const baseOf = (o) => {
    let p = base.get(o);
    if (!p) base.set(o, (p = basePose(level, o)));
    return p;
  };
  const boxOf = (o) => objectBox(baseOf(o));

  // Flaten under punktet (x, z), kanten medregnet: { top, box } for den høyeste `surface`-gjenstanden
  // som dekker det, eller null.
  function supportAt(x, z) {
    let best = null;
    for (const q of list(level)) {
      const def = OBJECTS[q.id];
      if (!def?.surface) continue;
      const box = boxOf(q);
      const top = baseOf(q).y + def.surface;
      if (x >= box[0] - 0.01 && x <= box[2] + 0.01 && z >= box[1] - 0.01 && z <= box[3] + 0.01 && (!best || top > best.top)) best = { top, box };
    }
    return best;
  }

  // Myke klosser stables: en kloss ligger oppå de klossene før den i listen som overlapper
  // fotavtrykket (rekkefølgen gjør at det aldri blir en sirkel). Fotavtrykket beholdes.
  function softPose(o, p) {
    const objects = list(level);
    const own = objects.indexOf(o);
    const box = objectBox(p);
    for (let k = 0; k < (own < 0 ? objects.length : own); k++) {
      const q = objects[k];
      if (!OBJECTS[q.id]?.soft || !overlaps(box, boxOf(q), 0.05)) continue;
      const qp = pose(q);
      p.y = Math.max(p.y, qp.y + qp.h);
    }
    return p;
  }

  function compute(o) {
    const p = { ...baseOf(o) };
    if (OBJECTS[o.id].soft) return softPose(o, p);
    // Wall and ceiling mounts keep their mounting height even when a desk is below them.
    if (OBJECTS[o.id].mount || OBJECTS[o.id].structural) return p;
    // Flaten under der gjenstanden ville stått (ikke midten av ruten: en smal benk inntil veggen
    // dekker ikke midten).
    const s = OBJECTS[o.id].surface ? null : supportAt(p.x, p.z);
    if (s) {
      // Er gjenstanden bredere/dypere enn flaten, holdes den på den siden den ble skjøvet mot (ryggen
      // mot veggen) og stikker ut på den andre.
      const clamp = (v, lo, hi) => (lo > hi ? (Math.abs(v - lo) < Math.abs(v - hi) ? lo : hi) : Math.max(lo, Math.min(hi, v)));
      p.y = s.top;
      p.x = clamp(p.x, s.box[0] + p.w / 2, s.box[2] - p.w / 2);
      p.z = clamp(p.z, s.box[1] + p.d / 2, s.box[3] - p.d / 2);
    }
    return p;
  }

  function pose(o) {
    let p = full.get(o);
    if (!p) full.set(o, (p = compute(o)));
    return p;
  }
  return pose;
}

/**
 * Hvor gjenstanden står: midtpunkt (x, y, z), retning (rot), og utstrekning sett ovenfra
 * (w langs x, d langs z etter dreiningen). Små gjenstander står oppå en flate som dekker
 * midten av ruten, trukket inn så de står helt på flaten.
 */
export function objectPose(level, o) {
  return { ...poser(level)(o) };
}

/** Rutene gjenstandene dekker (hele fotavtrykket, ikke bare ruten de står i): Set av indekser. */
export function footprintCells(level) {
  const out = new Set();
  if (!level.objects?.length) return out;
  const pose = poser(level);
  for (const o of level.objects) {
    const [x0, z0, x1, z1] = objectBox(pose(o));
    for (let z = Math.floor(z0); z < Math.ceil(z1); z++) for (let x = Math.floor(x0); x < Math.ceil(x1); x++) out.add(z * level.w + x);
  }
  return out;
}

/** Fjerner gjenstandene som dekker noen av rutene (et tre i en trapp, en stol i en sjakt). */
export function clearObjects(level, cells) {
  const set = new Set(cells);
  if (!set.size || !level.objects?.length) return;
  const pose = poser(level);
  level.objects = level.objects.filter((o) => {
    const [x0, z0, x1, z1] = objectBox(pose(o));
    for (let z = Math.floor(z0); z < Math.ceil(z1); z++) for (let x = Math.floor(x0); x < Math.ceil(x1); x++) if (set.has(z * level.w + x)) return false;
    return true;
  });
}
