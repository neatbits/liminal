// Vinduer i genererte rom: rader med vinduer i ytterveggen for temaene som har det (kontor,
// bassengrom, lekerom), og en tilfeldig tid på døgnet for lyset som kommer inn. Ren logikk.
import { TILE, getTile } from '../core/level.js';
import { canHoldWindow, paintWindows } from '../core/windows.js';

// Per tema: hvor mange av rutene i ytterveggen som kan få vindu (mønster: vindu, vindu, vegg …).
const PLANS = {
  office: { run: 2, gap: 1, chance: 0.85 },
  pool: { run: 2, gap: 2, chance: 0.75 },
  playroom: { run: 2, gap: 2, chance: 0.8 },
  school: { run: 3, gap: 1, chance: 0.9 },
  ward: { run: 1, gap: 1, chance: 0.85 },
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

/** Ytterveggen: rom på den ene siden og bare vegg ut til kanten av kartet på den andre. */
function exterior(level, x, z) {
  if (!canHoldWindow(level, x, z)) return null;
  for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    if (getTile(level, x + dx, z + dz) === TILE.WALL) continue;
    // (dx, dz) peker inn i rommet; bak veggen skal det bare være vegg ut til kanten.
    for (let k = 1; ; k++) {
      const [bx, bz] = [x - dx * k, z - dz * k];
      if (bx < 0 || bz < 0 || bx >= level.w || bz >= level.h) return [dx, dz];
      if (getTile(level, bx, bz) !== TILE.WALL) return null;
    }
  }
  return null;
}

/**
 * Rekker av ytterveggruter i rekkefølge langs veggen: rader for vinduer mot nord/sør og
 * kolonner for vinduer mot øst/vest, så mønsteret (vindu, vindu, vegg …) følger veggen.
 */
function edgeRuns(level) {
  const { w, h } = level;
  const lines = [];
  for (let z = 0; z < h; z++) lines.push(Array.from({ length: w }, (_, x) => [x, z]).filter(([x]) => exterior(level, x, z)?.[0] === 0));
  for (let x = 0; x < w; x++) lines.push(Array.from({ length: h }, (_, z) => [x, z]).filter(([, z]) => exterior(level, x, z)?.[1] === 0));
  return lines.filter((l) => l.length);
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
      if (k >= plan.run) continue;
      if (rand() < plan.chance) n += paintWindows(level, [[x, z]], true);
    }
  }
  if (n) level.sky = pickSky(rand);
  return n;
}
