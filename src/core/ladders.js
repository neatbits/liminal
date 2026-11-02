// Stiger mellom etasjer: en stige står på en gulvrute i etasje k og går opp gjennom et hull i gulvet
// i etasje k + 1. Den lagres på gulvruten (meta: LADDER + retningen dit man går av og på, bit 0–1 som
// STAIR_DIRS): stigen står mot motsatt kant av hullet, og man klatrer på siden mot utgangen, vendt mot
// stigen – så man blir på sin side både opp og ned.
// applyLadders lager det runde hullet og åpningen gjennom etasjeskillet i etasjene slik de bygges og
// gås i (walkLevels i core/stairwells.js): hullet er vegg for kollisjonen der oppe (seams.hole: gulvet
// rundt hullet i stedet for vegger), og ruten under er åpen opp til taket der oppe (seams.hatch: himling
// rundt hullet og rund sjakt gjennom etasjeskillet, world/holes.js). Ren logikk.
import { shopfrontNormal } from './shopfronts.js';
import { TILE, LIGHT, getTile } from './level.js';
import { STAIR_DIRS, ceilingAt } from './heights.js';
import { storeyCount, storeyLevel } from './storeys.js';
import { dm, seamsOf } from './storey-seams.js';
import { clearObjects } from './object-pose.js';

export const LADDER = 4; // meta-bit på gulvruter
export const LADDER_TOP = 1.1; // m: stigen (håndtakene) stikker så høyt over gulvet der oppe
export const HOLE_R = 0.48; // m: radien på hullet (ruten er 1 m)

// Butikkfronter (core/shopfronts.js) bruker de samme bitene på gulvruter: en front er ingen stige. Fronter finnes bare i
// kjøpesenteret; ellers ville fliser på den ene siden av en stige (et bad, «Make it wrong») gjort den til en front.
export const isLadder = (level, i) => level.tiles[i] === TILE.FLOOR && (level.meta[i] & LADDER) !== 0
  && !(level.theme === 'mall' && shopfrontNormal(level, i % level.w, Math.floor(i / level.w)));
export const ladderDir = (level, i) => STAIR_DIRS[level.meta[i] & 3];

/** Stigene i en etasje: [{ i, x, z, dir }]. */
export function ladders(level) {
  const out = [];
  for (let i = 0; i < level.tiles.length; i++) {
    if (isLadder(level, i)) out.push({ i, x: i % level.w, z: Math.floor(i / level.w), dir: ladderDir(level, i) });
  }
  return out;
}

const plain = (level, x, z) => getTile(level, x, z) === TILE.FLOOR && !level.decks[z * level.w + x];

/** Hvorfor en stige i retning d ikke får plass i (x, z) i etasje k, eller null. */
export function ladderProblem(room, k, x, z, d) {
  const upper = storeyLevel(room, k + 1);
  if (!upper) return 'A ladder goes up to the floor above – add one with + Floor first.';
  const level = storeyLevel(room, k);
  if (!plain(level, x, z)) return 'A ladder stands on a floor cell.';
  const [dx, dz] = STAIR_DIRS[d];
  if (!plain(upper, x, z) || !plain(upper, x + dx, z + dz)) return 'The floor above needs floor over the ladder (the hole) and next to it (where you step off).';
  return null;
}

/**
 * Klikk med stigeverktøyet i (x, z) i etasje k: ny stige (helst mot en vegg), en eksisterende snus til
 * neste retning som får plass, eller (erase) fjernes. Returnerer { changed, problem }.
 */
export function toggleLadder(room, k, x, z, erase = false) {
  const level = storeyLevel(room, k);
  const i = z * level.w + x;
  if (erase) {
    if (!isLadder(level, i)) return { changed: false, problem: null };
    level.meta[i] &= ~(LADDER | 3);
    return { changed: true, problem: null };
  }
  const was = isLadder(level, i) ? level.meta[i] & 3 : -1;
  // Rekkefølgen: etter den forrige retningen; for en ny stige først de som setter stigen mot en vegg i
  // etasjen under (veggen er bak stigen, motsatt utgangen).
  const order = was >= 0 ? [1, 2, 3].map((s) => (was + s) % 4)
    : [0, 1, 2, 3].sort((a, b) => wallAt(level, x, z, (b + 2) % 4) - wallAt(level, x, z, (a + 2) % 4));
  let problem = null;
  for (const d of order) {
    problem = ladderProblem(room, k, x, z, d);
    if (problem) continue;
    level.meta[i] = (level.meta[i] & ~3) | LADDER | d;
    return { changed: true, problem: null };
  }
  return { changed: false, problem: was >= 0 ? null : problem };
}

const wallAt = (level, x, z, d) => (getTile(level, x + STAIR_DIRS[d][0], z + STAIR_DIRS[d][1]) === TILE.WALL ? 1 : 0);

/**
 * Hullene og åpningene for stigene, i etasjene fra walkLevels (at = etasjehøydene). Hver etasje får
 * `ladders` ({ i, x, z, dir, gap }: stigene som står i den) og `holes` (hullene i gulvet: samme, med
 * stigen i etasjen under). Stiger som ikke lenger får plass (endret etasje, trapperom), hoppes over.
 */
export function applyLadders(room, levels, at) {
  for (const level of levels) [level.ladders, level.holes] = [[], []];
  for (let k = 0; k < Math.min(levels.length, storeyCount(room)) - 1; k++) {
    const [lower, upper] = [levels[k], levels[k + 1]];
    const gap = at[k + 1] - at[k];
    for (const l of ladders(lower)) {
      const [x, z] = [l.x, l.z];
      const exit = (z + l.dir[1]) * upper.w + x + l.dir[0];
      if (lower.tiles[l.i] !== TILE.FLOOR || upper.tiles[l.i] !== TILE.FLOOR || upper.tiles[exit] !== TILE.FLOOR) continue;
      const head = ceilingAt(upper, x, z);
      const below = ceilingAt(lower, x, z); // himlingen rundt hullet sett nedenfra
      clearObjects(lower, [l.i]);
      clearObjects(upper, [l.i, exit]);
      lower.ceilings[l.i] = dm(gap + head); // åpent opp til taket der oppe
      lower.lights[l.i] = LIGHT.NONE;
      seamsOf(lower).clip.set(l.i, { y: below, keep: [0, 0] }); // over himlingen: den runde sjakten
      lower.seams.hatch.set(l.i, { y0: below, y1: gap, r: HOLE_R });
      lower.seams.noCeiling.add(l.i); // taket over hullet tegnes av etasjen over
      (lower.borrowed ??= []).push({ x: x + 0.5, z: z + 0.5, y: gap + head - 0.4, power: 0.6 });
      upper.tiles[l.i] = TILE.WALL; // hullet: ikke til å gå på (man klatrer ned med E)
      seamsOf(upper).hole.set(l.i, { y: 0, r: HOLE_R }); // gulvet rundt hullet
      const ladder = { ...l, gap, k };
      lower.ladders.push(ladder);
      upper.holes.push(ladder);
    }
  }
}
