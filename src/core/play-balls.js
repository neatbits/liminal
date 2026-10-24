// Faste variasjoner for lekeballer og høyden i ballmassens ujevne topplag. Ren logikk.
import { WATER_SURFACE } from './level.js';

export const PLAY_BALL_RADIUS = 0.075;
export const PLAY_BALL_LIMIT = 48; // samlet automatisk antall med ekte fysikk, uavhengig av romstørrelse

function hash(x, z, seed = 0) {
  let h = Math.imul(x, 73856093) ^ Math.imul(z, 19349663) ^ Math.imul(seed, 83492791);
  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

export function playBallOffset(o) {
  return [(hash(o.x, o.z, (o.v ?? 0) + 17) - 0.5) * 0.56, (hash(o.x, o.z, (o.v ?? 0) + 53) - 0.5) * 0.56];
}

/** Kontinuerlige hauger, ikke separate høyder per rute (som ville gitt synlige skjøter). */
export function pitBallY(x, z) {
  const gx = Math.floor(x / 2), gz = Math.floor(z / 2);
  const smooth = (t) => t * t * (3 - 2 * t);
  const tx = smooth(x / 2 - gx), tz = smooth(z / 2 - gz);
  const a = hash(gx, gz) * (1 - tx) + hash(gx + 1, gz) * tx;
  const b = hash(gx, gz + 1) * (1 - tx) + hash(gx + 1, gz + 1) * tx;
  return WATER_SURFACE + 0.06 + (a * (1 - tz) + b * tz) * 0.14;
}

/** Underlag for de få ekte ballene som hviler oppå den tegnede ballmassen. */
export function pitBallSupport(x, z) {
  return pitBallY(x, z) + PLAY_BALL_RADIUS * 0.9;
}
