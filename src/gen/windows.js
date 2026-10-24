// Vinduer i genererte rom: rader med vinduer i ytterveggen for temaene som har det (kontor,
// bassengrom, lekerom), og en tilfeldig tid på døgnet for lyset som kommer inn. Ren logikk.
import { TILE, getTile } from '../core/level.js';
import { canHoldWindow, paintWindows } from '../core/windows.js';
import { topFloorAt, ceilingAt } from '../core/heights.js';

// Per tema: hvor mange av rutene i ytterveggen som kan få vindu (mønster: vindu, vindu, vegg …).
const PLANS = {
  office: { run: 2, gap: 1, chance: 0.85 },
  playroom: { run: 2, gap: 2, chance: 0.8 },
  school: { run: 3, gap: 1, chance: 0.9 },
  ward: { run: 1, gap: 1, chance: 0.85 },
};
const DENSITY = 0.25; // omtrent en fjerdedel av den tidligere mengden; håndmalte vinduer er urørt

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
  const rows = Array.from({ length: h }, () => []);
  const cols = Array.from({ length: w }, () => []);
  for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) {
    const n = exterior(level, x, z);
    if (n) (n[0] === 0 ? rows[z] : cols[x]).push([x, z]);
  }
  return [...rows, ...cols].filter((line) => line.length);
}

/** Poolrooms: sjeldne glassfelt på 3–5 m, bare langs sammenhengende yttervegger med like høyder. */
function poolWindows(level, lines, rand) {
  const runs = [];
  for (const line of lines) {
    let run = [], previous = null;
    for (const [x, z] of line) {
      const n = exterior(level, x, z);
      const floor = topFloorAt(level, x + n[0], z + n[1]);
      const ceil = ceilingAt(level, x + n[0], z + n[1]);
      const key = `${n}|${floor}|${ceil}`;
      if (previous && (Math.abs(previous.x - x) + Math.abs(previous.z - z) !== 1 || previous.key !== key)) {
        if (run.length >= 3) runs.push(run);
        run = [];
      }
      run.push([x, z]);
      previous = { x, z, key };
    }
    if (run.length >= 3) runs.push(run);
  }
  let count = 0;
  for (const run of runs) {
    let k = Math.min(run.length - 3, 1 + Math.floor(rand() * 6));
    while (k + 3 <= run.length) {
      const width = Math.min(3 + Math.floor(rand() * 3), run.length - k);
      // Behold håndmalte vinduer; ikke bygg automatiske felt inntil dem.
      const empty = run.slice(Math.max(0, k - 1), k + width + 1).every(([x, z]) => !(level.meta[z * level.w + x] & 1));
      if (empty && rand() < 0.55) count += paintWindows(level, run.slice(k, k + width), true);
      k += width + 12 + Math.floor(rand() * 9);
    }
  }
  return count;
}

/** Setter inn vinduer etter temaet. Returnerer antall vinduer. */
export function addWindows(level, rand) {
  if (level.theme === 'pool') {
    const n = poolWindows(level, edgeRuns(level), rand);
    if (n) level.sky = pickSky(rand);
    return n;
  }
  const plan = PLANS[level.theme];
  if (!plan) return 0;
  let n = 0;
  for (const line of edgeRuns(level)) {
    let k = Math.floor(rand() * (plan.run + plan.gap));
    for (const [x, z] of line) {
      k = (k + 1) % (plan.run + plan.gap);
      if (k >= plan.run) continue;
      if (rand() < plan.chance * DENSITY) n += paintWindows(level, [[x, z]], true);
    }
  }
  if (n) level.sky = pickSky(rand);
  return n;
}
