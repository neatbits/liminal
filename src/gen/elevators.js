// Heiser i genererte bygg med flere etasjer (core/elevators.js): av og til, i tillegg til trappen eller stigen (som
// fortsatt binder etasjene sammen, gen/mixed-floors.js). Sjakten legges helst inn i veggene, med dørene mot et rom, og
// stopper i flest mulig etasjer. Den rører aldri trapper, stiger, reposer, vann eller sklier, og stenger ikke noe inne:
// i hver etasje den stopper i, ligger reposet i hoveddelen av etasjen, og i de andre er sjakten allerede vegg.
// Eget frø fra rommets, så alt annet i bygget blir som før. Ren logikk.
import { TILE } from '../core/level.js';
import { mulberry32 } from '../core/rng.js';
import { storeyCount, storeyLevel, spawnStorey } from '../core/storeys.js';
import { footprint, elevatorStops, elevatorProblem } from '../core/elevators.js';
import { walkLevels, linkCells } from '../core/stairwells.js';
import { footprintCells } from '../core/object-pose.js';
import { slidesAt } from '../core/slides.js';
import { reachableCells } from './tapes.js';

export const ELEVATOR_CHANCE = [0.4, 0.6]; // bygg med to etasjer, og med flere
const TRIES = 400;
const CHECKS = 8; // så mange plasser som prøves med flomfylling
const MAIN = 0.5; // reposet må ligge i minst denne andelen av etasjens gulv

/** Rutene ingen heis får røre, per etasje: trappeløp, reposer, stiger og hull (fra etasjene slik de bygges). */
function heldCells(room) {
  const { levels, wells } = walkLevels(room);
  const keep = linkCells(levels, wells);
  for (const { k, run, landing } of wells) for (const s of [k, k + 1]) { for (const i of run) keep[s].add(i); keep[s].add(landing); }
  return keep;
}

const count = (cells) => cells.reduce((n, c) => n + c, 0);

/**
 * Prøver å legge en heis i bygget. chance: false = alltid når det går (tester). Returnerer heisen eller null.
 * Lagt til i room.elevators.
 */
export function addElevator(room, { chance = true } = {}) {
  const n = storeyCount(room);
  if (n < 2 || room.theme === 'mall') return null;
  const rand = mulberry32(((room.seed ?? 1) ^ 0xe1e7a) >>> 0);
  if (chance && rand() >= ELEVATOR_CHANCE[n > 2 ? 1 : 0]) return null;
  const { w, h } = room;
  const held = heldCells(room);
  const start = spawnStorey(room);
  const spawn = Math.floor(storeyLevel(room, start).spawn.z) * w + Math.floor(storeyLevel(room, start).spawn.x);
  const taken = Array.from({ length: n }, (_, k) => footprintCells(storeyLevel(room, k)));
  const candidates = [];
  for (let t = 0; t < TRIES; t++) {
    const e = { x: 1 + Math.floor(rand() * (w - 5)), z: 1 + Math.floor(rand() * (h - 5)), dir: Math.floor(rand() * 4) };
    if (elevatorProblem(room, e)) continue;
    const stops = elevatorStops(room, e);
    const f = footprint(e);
    const cells = f.all.map(([x, z]) => z * w + x);
    const landing = f.landing.map(([x, z]) => z * w + x);
    let walls = 0;
    let ok = true;
    for (let k = stops[0]; k <= stops[stops.length - 1] && ok; k++) {
      const level = storeyLevel(room, k);
      const stop = stops.includes(k);
      for (const i of cells) {
        const tile = level.tiles[i];
        if (tile === TILE.WALL) walls++;
        // Sjakten går bare gjennom vegg og vanlig gulv; der den går forbi, bare gjennom vegg.
        else if (!stop || tile !== TILE.FLOOR || level.floors[i] || level.decks[i] || level.meta[i] || slidesAt(level, i % w, Math.floor(i / w)).length) ok = false;
      }
      if ([...cells, ...landing].some((i) => held[k].has(i) || (k === start && i === spawn))) ok = false;
      if (stop && landing.some((i) => taken[k].has(i))) ok = false;
    }
    if (ok) candidates.push({ e, stops, cells, landing, score: stops.length * 100 + walls });
  }
  candidates.sort((a, b) => b.score - a.score);
  for (const c of candidates.slice(0, CHECKS)) {
    if (!c.stops.every((k) => keepsStorey(storeyLevel(room, k), c))) continue;
    room.elevators = [...(room.elevators ?? []), c.e];
    return c.e;
  }
  return null;
}

/** Ligger reposet i hoveddelen av etasjen, og stenger sjakten ingenting av derfra? */
function keepsStorey(level, { cells, landing }) {
  const [x, z] = [landing[0] % level.w, Math.floor(landing[0] / level.w)];
  const before = reachableCells(level, x + 0.5, z + 0.5);
  const after = reachableCells(level, x + 0.5, z + 0.5, new Set(cells));
  const floor = level.tiles.reduce((s, t) => s + (t === TILE.WALL ? 0 : 1), 0);
  return count(after) === count(before) - cells.filter((i) => before[i]).length && count(after) >= floor * MAIN;
}
