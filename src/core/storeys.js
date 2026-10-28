// Etasjer: rommet er etasje 0, og `room.storeys` er etasjene over – hver et vanlig rom med samme
// størrelse, egne lag, gjenstander, sklier, takhøyde og vanndybde. Tema, himmel, lysfarge, tåke og
// lysstyrke hører til bygget og deles fra etasje 0. Ren logikk.
//
// Etasjehøyden regnes ut, så bassenger aldri krasjer med etasjen under: en etasje begynner over det
// høyeste taket i etasjen under pluss platen – og høyt nok til at hvert basseng henger ned som en kasse
// i rommet under, med HEADROOM under seg (core/stairwells.js senker taket der).
import { TILE, LAYERS, createLevel, cloneLevel } from './level.js';
import { ceilingAt, depthAt, upperAt, SLAB, HEADROOM, STAIR_THROUGH } from './heights.js';
import { waterCell } from './pillar-water.js';

/** Flest etasjer i et rom, med etasje 0. */
export const MAX_STOREYS = 8;
/** Egenskaper som hører til bygget, ikke etasjen. */
export const SHARED = ['theme', 'sky', 'tint', 'fog', 'bright'];

export function storeyCount(room) {
  return 1 + (room.storeys?.length ?? 0);
}

/** Etasjen man starter i (`room.spawnStorey`, 0 = nederst) – startpunktet er den etasjens `spawn`. */
export function spawnStorey(room) {
  return Math.max(0, Math.min(storeyCount(room) - 1, room.spawnStorey ?? 0));
}

/** Etasje k (0 = rommet selv), med byggets felles egenskaper, eller null. */
export function storeyLevel(room, k) {
  if (k === 0) return room;
  const s = room.storeys?.[k - 1];
  if (!s) return null;
  for (const key of SHARED) s[key] = room[key];
  return s;
}

/** En tom etasje (bare vegg) med rommets størrelse, takhøyde og vanndybde. */
export function emptyStorey(room) {
  const s = createLevel({ name: room.name, theme: room.theme, w: room.w, h: room.h, height: room.height, waterDepth: room.waterDepth });
  for (const key of SHARED) s[key] = room[key];
  return s;
}

/**
 * En kopi av etasje k som kan legges inn som ny etasje (uten id, frø eller egne etasjer), med bassenger
 * og sklier. Sklier ned fra etasjen over (core/slide-drops.js) følger ikke med: de hører til etasjen over.
 * Trapper opp blir gulv: kopien legges rett over, så de ville stått i sjakten til trappen de er kopiert fra.
 */
export function copyStorey(room, k) {
  const s = cloneLevel(storeyLevel(room, k));
  s.id = null;
  delete s.storeys;
  delete s.seed;
  s.slides = s.slides.filter((slide) => !slide.drop);
  for (let i = 0; i < s.tiles.length; i++) {
    if (s.tiles[i] !== TILE.STAIRS || !(s.meta[i] & STAIR_THROUGH)) continue;
    s.tiles[i] = TILE.FLOOR;
    s.meta[i] = s.floors[i] = 0;
  }
  return s;
}

/**
 * Setter inn `storey` som etasje `at` (1 … antall). Etasjene over flyttes opp. Returnerer
 * etasjenummeret, eller −1 når bygget er fullt.
 */
export function insertStorey(room, at, storey = emptyStorey(room)) {
  const n = storeyCount(room);
  if (n >= MAX_STOREYS) return -1;
  const k = Math.max(1, Math.min(n, at));
  room.storeys = [...(room.storeys ?? [])];
  room.storeys.splice(k - 1, 0, storey);
  if (spawnStorey(room) >= k) room.spawnStorey = spawnStorey(room) + 1; // startetasjen flyttes med opp
  return k;
}

/** Fjern disse når en etasje byttes ut: de hører til etasjen, ikke bygget (se insertBelow). */
const OWN = ['slides', 'objects', 'spawn', 'height', 'waterDepth', 'seed'];

/**
 * Ny tom etasje nederst (kjeller): rommet selv er etasje 0, så innholdet i det flyttes opp til
 * etasje 1, og rommet blir den tomme etasjen. Returnerer 0, eller −1 når bygget er fullt.
 */
export function insertBelow(room) {
  if (storeyCount(room) >= MAX_STOREYS) return -1;
  const old = cloneLevel({ ...room, storeys: undefined });
  delete old.storeys;
  old.id = null;
  const empty = emptyStorey(room);
  for (const key of [...LAYERS, ...OWN]) room[key] = empty[key];
  delete room.seed;
  room.storeys = [old, ...(room.storeys ?? [])];
  room.spawnStorey = (room.spawnStorey ?? 0) + 1; // man starter fortsatt i samme etasje
  return 0;
}

/** Fjerner etasje k (den nederste bare når det er flere). Returnerer true når noe ble fjernet. */
export function removeStorey(room, k) {
  const n = storeyCount(room);
  if (k < 0 || k >= n || n < 2) return false;
  const start = spawnStorey(room);
  if (k === 0) {
    // Den nederste er rommet selv: etasjen over flyttes ned i det (det motsatte av insertBelow).
    const [next, ...rest] = room.storeys;
    for (const key of [...LAYERS, ...OWN]) room[key] = next[key];
    if (next.seed === undefined) delete room.seed;
    room.storeys = rest;
    room.spawnStorey = Math.max(0, start - 1);
    return true;
  }
  room.storeys = room.storeys.filter((_, i) => i !== k - 1);
  room.spawnStorey = start > k ? start - 1 : start === k ? 0 : start;
  return true;
}

/**
 * Det høyeste taket i etasjen (m over etasjens gulv); bare vegg gir rommets takhøyde. Trapper opp
 * til etasjen over telles ikke – de går gjennom etasjeskillet (core/stairwells.js).
 */
export function highestCeiling(level) {
  let top = level.height;
  for (let z = 0; z < level.h; z++) {
    for (let x = 0; x < level.w; x++) {
      const i = z * level.w + x;
      const t = level.tiles[i];
      if (t === TILE.WALL || (t === TILE.STAIRS && level.meta[i] & STAIR_THROUGH)) continue;
      top = Math.max(top, ceilingAt(level, x, z));
    }
  }
  return top;
}

/** Rutene med vann i `upper` som ligger over et rom (ikke vegg eller søyle) i `lower`: [{ x, z, i, depth }]. */
export function poolsOver(lower, upper) {
  const out = [];
  for (let z = 0; z < upper.h; z++) {
    for (let x = 0; x < upper.w; x++) {
      const i = z * upper.w + x;
      if (!waterCell(upper, x, z) || lower.tiles[i] === TILE.WALL || lower.tiles[i] === TILE.PILLAR) continue;
      out.push({ x, z, i, depth: depthAt(upper, x, z) });
    }
  }
  return out;
}

/** Høyden fra gulvet i `lower` til gulvet i `upper` (m). */
export function storeyGap(lower, upper) {
  let gap = highestCeiling(lower) + SLAB;
  for (const { x, z, depth } of poolsOver(lower, upper)) gap = Math.max(gap, upperAt(lower, x, z) + HEADROOM + SLAB + depth);
  return gap;
}

/** Gulvhøyden (m) for hver etasje: [0, …]. */
export function storeyElevations(room) {
  const out = [0];
  for (let k = 1; k < storeyCount(room); k++) out.push(out[k - 1] + storeyGap(storeyLevel(room, k - 1), storeyLevel(room, k)));
  return out;
}
