// Ramper: gulv som skråner jevnt opp eller ned. En rampe er et trappeløp (TILE.STAIRS, core/stairs.js) med en glatt
// flate i stedet for trinn: samme retning, høyder og gange (groundAt stiger allerede jevnt i trapper). Den lagres med
// meta-biten for «rulletrapp ned» uten selve rulletrappbiten – en kombinasjon som ellers aldri brukes – så romformatet
// er det samme. Ren logikk.
import { TILE, getTile } from './level.js';
import { ESCALATOR, ESCALATOR_DOWN } from './escalators.js';
import { placeStairs, stairCells } from './stairs.js';

export const RAMP = ESCALATOR_DOWN;
export const RAMP_RISE = 0.2; // m per rute når rampen ikke ender på et høyere gulv (omtrent 11°)

export function isRamp(level, x, z) {
  return getTile(level, x, z) === TILE.STAIRS && (level.meta[z * level.w + x] & (ESCALATOR | RAMP)) === RAMP;
}

/** Legger en rampe fra a (bunn) til b (topp), `width` ruter bred. Returnerer antall ruter. */
export function placeRamp(level, a, b, width = 1) {
  const n = placeStairs(level, a, b, width, RAMP_RISE);
  for (const [x, z] of stairCells(a, b, width).rows.flat()) {
    if (getTile(level, x, z) === TILE.STAIRS) level.meta[z * level.w + x] |= RAMP;
  }
  return n;
}
