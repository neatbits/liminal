// Hvor mye av de stedbundne lydene man hører der gåeren står (view3d/walkmode.js).
import { LIGHT } from '../core/level.js';

/** TV-sus (0..1): nærmeste skjerm. */
export function staticLevel(screens, walker) {
  let best = 0;
  for (const s of screens ?? []) {
    const d2 = (s.x - walker.x) ** 2 + (s.z - walker.z) ** 2;
    best = Math.max(best, 1 / (1 + d2 * 0.7));
  }
  return best;
}

/** Lysrørsurr (0..1), vektet med blinkegruppenes tilstand. */
export function humLevel(field, walker, flicker) {
  let sum = 0;
  for (const l of field.near(walker.x, walker.z, 6)) {
    if (l.object) continue; // skjermer surrer ikke som lysrør
    const d2 = (l.x - walker.x) ** 2 + (l.z - walker.z) ** 2;
    const w = l.state === LIGHT.FLICKER ? flicker[l.group] : 1;
    sum += w / (1 + d2 * 0.3);
  }
  return Math.min(1, sum);
}
