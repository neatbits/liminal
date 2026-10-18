// Vinduer i genererte rom: rader med vinduer i ytterveggen for temaene som har det (kontor,
// bassengrom, lekerom), og en tilfeldig tid på døgnet for lyset som kommer inn. Ren logikk.
import { TILE, getTile } from '../core/level.js';
import { canHoldWindow, paintWindows } from '../core/windows.js';

// Per tema: hvor mange av rutene i ytterveggen som kan få vindu (mønster: vindu, vindu, vegg …).
const PLANS = {
  office: { run: 2, gap: 1, chance: 0.85 },
  pool: { run: 3, gap: 1, chance: 0.9 },
  playroom: { run: 2, gap: 2, chance: 0.8 },
};

// Tiden på døgnet: oftest dag og gyllen time, av og til skumring, sjelden natt.
const SKY_ODDS = [
  ['day', 0.4],
  ['golden', 0.35],
  ['dusk', 0.2],
  ['night', 0.05],
];

export function pickSky(rand) {
  let r = rand();
  for (const [id, p] of SKY_ODDS) if ((r -= p) < 0) return id;
  return 'day';
}

/** Ruter i ytterkanten (og rett innenfor) som kan få vindu, i rekkefølge langs veggen. */
function edgeRuns(level) {
  const { w, h } = level;
  const lines = [];
  for (const z of [0, h - 1]) lines.push(Array.from({ length: w }, (_, x) => [x, z]));
  for (const x of [0, w - 1]) lines.push(Array.from({ length: h }, (_, z) => [x, z]));
  return lines;
}

/** Setter inn vinduer etter temaet. Returnerer antall vinduer. */
export function addWindows(level, rand) {
  const plan = PLANS[level.theme];
  if (!plan) return 0;
  let n = 0;
  for (const line of edgeRuns(level)) {
    let k = Math.floor(rand() * (plan.run + plan.gap));
    for (const [x, z] of line) {
      k = (k + 1) % (plan.run + plan.gap);
      if (k >= plan.run || getTile(level, x, z) !== TILE.WALL || !canHoldWindow(level, x, z)) continue;
      if (rand() < plan.chance) n += paintWindows(level, [[x, z]], true);
    }
  }
  if (n) level.sky = pickSky(rand);
  return n;
}
