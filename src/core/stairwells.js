// Trapperom mellom etasjer (core/storeys.js). En trapp merket THROUGH i etasje k går opp til etasje
// k + 1; ruten rett etter toppen er reposet der man kommer ut. Hver etasje er fortsatt et vanlig rom:
// walkLevels lager kopier der trappen i etasje k stiger nøyaktig til etasjehøyden og reposet ligger
// i samme høyde, mens løpet er en vegg (sjakten) og reposet gulv i etasje k + 1. `seams` sier hvilke
// flater som ikke skal bygges der etasjene møtes (world/seams.js). Man bytter etasje midt på reposet
// (storeyAt). Ren logikk.
import { TILE, cloneLevel, inBounds } from './level.js';
import { STAIR_DIRS, STAIR_THROUGH, SLAB, ceilingAt } from './heights.js';
import { storeyCount, storeyLevel, storeyElevations, poolsOver } from './storeys.js';
import { dm, opening, shaft } from './storey-seams.js';
import { clearObjects } from './object-pose.js';
import { applyDrops } from './slide-drops.js';
import { applyLadders } from './ladders.js';
import { applyElevators } from './elevators.js';

/** Meta-bit på trapperuter: løpet går opp til etasjen over. */
export const THROUGH = STAIR_THROUGH;
/** Byttelinjen på reposet (andel av ruten fra løpet), med litt slingringsmonn mot flimring. */
const UP = 0.55;
const DOWN = 0.45;

export const isThrough = (level, i) => level.tiles[i] === TILE.STAIRS && (level.meta[i] & THROUGH) !== 0;

/** Trappeløpene i en etasje som går opp: [{ dir, run: [indekser nedenfra], landing }] – ett per bane. */
export function throughRuns(level) {
  const out = [];
  const { w, h } = level;
  for (let i = 0; i < w * h; i++) {
    if (!isThrough(level, i)) continue;
    const d = level.meta[i] & 3;
    const [dx, dz] = STAIR_DIRS[d];
    const [x, z] = [i % w, Math.floor(i / w)];
    const next = (z + dz) * w + x + dx;
    if (inBounds(level, x + dx, z + dz) && isThrough(level, next) && (level.meta[next] & 3) === d) continue; // ikke toppen
    if (x + dx <= 0 || z + dz <= 0 || x + dx >= w - 1 || z + dz >= h - 1) continue; // reposet må ligge innenfor kanten
    const run = [i];
    for (let [bx, bz] = [x - dx, z - dz]; inBounds(level, bx, bz); bx -= dx, bz -= dz) {
      const j = bz * w + bx;
      if (!isThrough(level, j) || (level.meta[j] & 3) !== d) break;
      run.unshift(j);
    }
    out.push({ dir: [dx, dz], run, landing: next });
  }
  return out;
}

/**
 * Trapperommene i bygget: throughRuns med etasje k og høyden opp til neste etasje (gap). En trapp opp
 * som ligger i sjakten eller på reposet til trapperommet nedenfra (en kopiert etasje), er ikke med:
 * der er det allerede vegg og repos, og to trapperom oppå hverandre ville gitt løse flater i
 * etasjeskillet.
 */
export function stairwells(room, at = storeyElevations(room)) {
  const n = storeyCount(room);
  if (n < 2) return [];
  const out = [];
  let taken = new Set(); // sjakt og repos i etasje k fra trapperommene i etasjen under
  for (let k = 0; k < n - 1; k++) {
    const next = new Set();
    for (const r of throughRuns(storeyLevel(room, k))) {
      if ([...r.run, r.landing].some((i) => taken.has(i))) continue;
      out.push({ ...r, k, gap: at[k + 1] - at[k] });
      for (const i of [...r.run, r.landing]) next.add(i);
    }
    taken = next;
  }
  return out;
}

/**
 * Kopier av alle etasjene til bygging og gåing, med trapperommene på plass.
 * @returns {{ levels, wells }} levels[k] = etasje k (uten room.storeys), wells = stairwells(room)
 */
export function walkLevels(room) {
  const levels = [];
  for (let k = 0; k < storeyCount(room); k++) {
    const copy = cloneLevel({ ...storeyLevel(room, k), storeys: undefined });
    delete copy.storeys;
    if (k < storeyCount(room) - 1) copy.covered = true; // glasstaket (Mall) bare i øverste etasje
    levels.push(copy);
  }
  const at = storeyElevations(room);
  // Veggtoppene i en etasje med en etasje over går aldri over undersiden av etasjeskillet (world/caps.js).
  levels.forEach((level, k) => k < levels.length - 1 && (level.capMax = at[k + 1] - at[k] - SLAB));
  // Bassenger henger ned som en kasse i rommet under: taket der senkes til undersiden av bassenget.
  for (let k = 1; k < levels.length; k++) {
    const [lower, upper] = [levels[k - 1], levels[k]];
    for (const { x, z, i, depth } of poolsOver(lower, upper)) {
      const under = at[k] - at[k - 1] - SLAB - depth;
      if (under < ceilingAt(lower, x, z)) lower.ceilings[i] = dm(under);
    }
  }
  const wells = stairwells(room, at);
  for (const { k, dir, run, landing, gap } of wells) {
    const [lower, upper] = [levels[k], levels[k + 1]];
    // Etasje k: løpet stiger fra gulvet foran det til gulvet i etasjen over, der reposet ligger. Hele
    // trapperommet er åpent opp til taket i etasjen over (vegg der oppe), så bratte trapper får takhøyde.
    const before = run[0] - dir[0] - dir[1] * lower.w;
    const low = lower.tiles[before] === TILE.WALL ? 0 : lower.floors[before] / 10;
    run.forEach((i, j) => (lower.floors[i] = dm(low + ((gap - low) * (j + 1)) / run.length)));
    clearObjects(lower, run); // ingenting står i trappen
    const head = opening(lower, upper, landing, gap, [-dir[0], -dir[1]]);
    shaft(lower, upper, run, gap + head);
  }
  applyDrops(room, levels, at); // sklier ned fra etasjen over (core/slide-drops.js)
  applyLadders(room, levels, at); // stiger opp gjennom et hull i gulvet (core/ladders.js)
  applyElevators(room, levels); // heiser (core/elevators.js)
  return { levels, wells };
}

/**
 * Der man kommer inn i etasje k (i etasjene fra walkLevels): reposet fra trappen nedenfra, utgangen fra
 * stigen nedenfra, ellers foten av trappen eller stigen opp. { x, z } eller null.
 */
export function storeyEntry(levels, wells, k) {
  const { w } = levels[0];
  const cell = (i) => ({ x: (i % w) + 0.5, z: Math.floor(i / w) + 0.5 });
  const below = wells.find((well) => well.k + 1 === k);
  if (below) return cell(below.landing);
  const hole = levels[k].holes?.[0];
  if (hole) return { x: hole.x + hole.dir[0] + 0.5, z: hole.z + hole.dir[1] + 0.5 };
  const above = wells.find((well) => well.k === k);
  if (above) return cell(above.run[0]);
  const foot = levels[k].ladders?.[0];
  return foot ? cell(foot.i) : null;
}

/**
 * Rutene i hver etasje der trapper og stiger går av og på (i etasjene fra walkLevels): rutene som ikke
 * må stenges av noe som legges inn etterpå (gen/wrong.js). Liste med et Set per etasje.
 */
export function linkCells(levels, wells) {
  const { w } = levels[0];
  const keep = levels.map(() => new Set());
  for (const { k, dir, run, landing } of wells) {
    keep[k].add(run[0] - dir[0] - dir[1] * w).add(landing);
    keep[k + 1].add(landing);
  }
  levels.forEach((level, k) => {
    for (const { i, dir } of [...(level.ladders ?? []), ...(level.holes ?? [])]) keep[k].add(i).add(i + dir[0] + dir[1] * w);
    for (const { landing } of level.lifts ?? []) for (const [x, z] of landing) keep[k].add(z * w + x); // reposet foran heisen
  });
  return keep;
}

/** Etasjen man er i etter å ha stått i (x, z) i etasje k: man bytter midt på reposet. */
export function storeyAt(wells, k, x, z, w) {
  const [cx, cz] = [Math.floor(x), Math.floor(z)];
  const i = cz * w + cx;
  for (const well of wells) {
    if (well.landing !== i) continue;
    const [dx, dz] = well.dir;
    const s = dx ? (dx > 0 ? x - cx : 1 - (x - cx)) : dz > 0 ? z - cz : 1 - (z - cz);
    if (well.k === k && s > UP) return k + 1;
    if (well.k + 1 === k && s < DOWN) return well.k;
  }
  return k;
}
