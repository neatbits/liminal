// Spesialrom: et rom i et generert nivå blir noe uventet – oversvømt, fullt av klokker, med stoler i rader mot veggen,
// mørkt, kjempehøyt, kledd i LED-lys … (katalogen i gen/special-rooms.js). Hvert enkelt er sjeldent, men det er mange av
// dem, så omtrent hvert annet nivå har ett. Rommene er områder mellom vegger og dører (eller et ledig felt midt i en stor
// flate); det som stod der, fjernes først. Blir noe stengt inne eller står noe i veien, angres endringen. Ren logikk.
import { TILE } from '../core/level.js';
import { snapshot, applySnapshot } from '../core/history.js';
import { objectFits, MAX_OBJECTS } from '../core/objects.js';
import { footprintCells } from '../core/object-pose.js';
import { reachableCells } from './tapes.js';
import { SPECIALS } from './special-rooms.js';

export const SPECIAL_CHANCE = 0.8; // så ofte et nivå prøver å få et spesialrom (det får ett når noe passer)
const BIG = 2500; // ruter: store nivåer kan få ett til
const SECOND = 0.35;
const OPEN = new Set([TILE.FLOOR, TILE.PILLAR]);
// Kjøpesenteret har sin egen struktur (butikkfronter, rulletrapper og gallerier som trenger fri ferdsel).
export const NO_SPECIALS = ['mall'];

const shuffled = (rand, list) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/** Et rom fra en liste ruter: { cells, x0, z0, x1, z1, area, rect (andel av rektangelet), enclosed }. */
function roomOf(level, cells, enclosed) {
  let [x0, z0, x1, z1] = [Infinity, Infinity, -1, -1];
  for (const i of cells) {
    const [x, z] = [i % level.w, Math.floor(i / level.w)];
    [x0, z0, x1, z1] = [Math.min(x0, x), Math.min(z0, z), Math.max(x1, x), Math.max(z1, z)];
  }
  return { cells, x0, z0, x1, z1, area: cells.length, rect: cells.length / ((x1 - x0 + 1) * (z1 - z0 + 1)), enclosed };
}

/** Områdene mellom vegger, dører, trapper og vann (gulv og søyler henger sammen). */
export function findRooms(level) {
  const { w, h } = level;
  const seen = new Uint8Array(w * h);
  const out = [];
  for (let s = 0; s < w * h; s++) {
    if (seen[s] || !OPEN.has(level.tiles[s])) continue;
    const cells = [s];
    seen[s] = 1;
    for (let k = 0; k < cells.length; k++) {
      const [x, z] = [cells[k] % w, Math.floor(cells[k] / w)];
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const [nx, nz] = [x + dx, z + dz];
        const j = nz * w + nx;
        if (nx < 0 || nz < 0 || nx >= w || nz >= h || seen[j] || !OPEN.has(level.tiles[j])) continue;
        seen[j] = 1;
        cells.push(j);
      }
    }
    out.push(roomOf(level, cells, true));
  }
  return out;
}

/** Et ledig rektangel av gulv midt i et stort område (der det ikke er rom å ta): opptil `tries` forsøk. */
function openPatch(level, rand, region, tries = 40) {
  const inside = new Set(region.cells);
  for (let t = 0; t < tries; t++) {
    const [pw, ph] = [5 + Math.floor(rand() * 6), 5 + Math.floor(rand() * 6)];
    const x = region.x0 + Math.floor(rand() * Math.max(1, region.x1 - region.x0 - pw));
    const z = region.z0 + Math.floor(rand() * Math.max(1, region.z1 - region.z0 - ph));
    const cells = [];
    for (let cz = z; cz < z + ph; cz++) for (let cx = x; cx < x + pw; cx++) cells.push(cz * level.w + cx);
    // Gulv i samme høyde; søylene i en søylehall eller et parkeringshus får stå.
    if (cells.every((i) => inside.has(i) && OPEN.has(level.tiles[i]) && !level.floors[i] && !level.decks[i])) return roomOf(level, cells, false);
  }
  return null;
}

/** Rom som kan bli spesialrom: avgrensede, nokså firkantede rom, og ledige felt i de store områdene. Ikke der man starter. */
function candidates(level, rand) {
  const spawn = Math.floor(level.spawn.z) * level.w + Math.floor(level.spawn.x);
  const out = [];
  const near = (p) => p.cells.some((i) => Math.abs((i % level.w) - (spawn % level.w)) < 4 && Math.abs(Math.floor(i / level.w) - Math.floor(spawn / level.w)) < 4);
  for (const r of findRooms(level)) {
    if (r.area >= 9 && r.area <= 260 && r.rect >= 0.7) { if (!r.cells.includes(spawn)) out.push(r); }
    // Et stort område (der man ofte starter): et ledig felt i det, et stykke unna startpunktet.
    else if (r.area > 260) for (let k = 0; k < 4; k++) { const p = openPatch(level, rand, r); if (p && !near(p)) out.push(p); }
  }
  return out;
}

const reachCount = (level) => reachableCells(level, level.spawn.x, level.spawn.z);

/** Prøver ett spesialrom (only: bare denne typen). Returnerer id-en, eller null. */
function tryOne(level, rand, used, only = null) {
  const rooms = shuffled(rand, candidates(level, rand));
  const kinds = shuffled(rand, SPECIALS.filter((s) => (!only || s.id === only) && !used.has(s.id) && (!s.themes || s.themes.includes(level.theme)) && !s.not?.includes(level.theme)));
  for (const s of kinds) {
    const room = rooms.find((r) => s.fits(level, r));
    if (!room) continue;
    const snap = snapshot(level);
    const before = reachCount(level);
    const inside = new Set(room.cells);
    // Det som stod i rommet, fjernes (også gjenstander som stikker inn i det) – og det som stod oppå dem (samme rute).
    const gone = level.objects.filter((o) => [...footprintCells({ ...level, objects: [o] })].some((i) => inside.has(i)));
    const anchors = new Set(gone.map((o) => o.z * level.w + o.x));
    level.objects = level.objects.filter((o) => !gone.includes(o) && !anchors.has(o.z * level.w + o.x));
    const done = s.apply(level, rand, room) !== false;
    const after = done && reachCount(level);
    const lost = done && [...before.keys()].some((i) => before[i] && !after[i] && !inside.has(i));
    // Bare det som kom til: stolhaugene i Level 0 ligger oppå hverandre med vilje og ville aldri bestått.
    const added = done ? level.objects.filter((o) => !snap.objects.includes(o)) : [];
    const fits = done && level.objects.length <= MAX_OBJECTS && added.every((o) => objectFits(level, o));
    if (done && !lost && fits) {
      (level.specialRooms ??= []).push({ id: s.id, x0: room.x0, z0: room.z0, x1: room.x1, z1: room.z1 }); // til sjekker; lagres ikke
      return s.id;
    }
    applySnapshot(level, snap);
  }
  return null;
}

/** Ett bestemt spesialrom i et rom som passer (tester). Returnerer id-en, eller null. */
export const applySpecial = (level, rand, id) => tryOne(level, rand, new Set(), id);

/** Legger inn spesialrom i et generert nivå (gen/index.js, bare med vary). Returnerer id-ene. */
export function addSpecials(level, rand) {
  const used = new Set();
  if (NO_SPECIALS.includes(level.theme)) return [];
  if (rand() < SPECIAL_CHANCE) { const id = tryOne(level, rand, used); if (id) used.add(id); }
  if (level.w * level.h >= BIG && rand() < SECOND) { const id = tryOne(level, rand, used); if (id) used.add(id); }
  if (used.size) level.specials = [...used]; // til tester og sjekker; lagres ikke
  return [...used];
}
