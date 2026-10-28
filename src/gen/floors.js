// Bygg med flere nesten like etasjer (core/storeys.js): etasjene over er kopier av etasje 0 med
// noen små feil («Make it wrong»), bundet sammen med trapperom (core/stairwells.js). Et trapperom
// legges bare der sjakten ikke stenger noe av i etasjen over, og løpet ikke stenger noe i etasjen
// under. Sjakten skrives inn som vegg i etasjen over, så skissen viser den.
import { TILE, LIGHT } from '../core/level.js';
import { STAIR_DIRS, STAIR_THROUGH } from '../core/heights.js';
import { storeyCount, storeyLevel, insertStorey, copyStorey, MAX_STOREYS } from '../core/storeys.js';
import { makeWrong } from './wrong.js';
import { footprintCells } from '../core/object-pose.js';

/** Temaer der genererte nivåer av og til får flere etasjer. */
export const FLOOR_THEMES = ['hotel', 'office', 'school', 'ward', 'basement'];
const RUN = 5; // trinn: ca. 0,6 m per trinn opp til etasjen over
const TRIES = 300;

const plain = (level, i) => level.tiles[i] === TILE.FLOOR && !level.floors[i] && !level.decks[i] && !level.corners[i] && !level.depths[i];
const open = (t) => t !== TILE.WALL && t !== TILE.PILLAR;

/** Henger alle åpne ruter (utenom `blocked`) sammen? */
function connected(level, blocked) {
  const { w, h, tiles } = level;
  let start = -1;
  let total = 0;
  for (let i = 0; i < w * h; i++) {
    if (!open(tiles[i]) || blocked.has(i)) continue;
    total++;
    if (start < 0) start = i;
  }
  if (start < 0) return false;
  const seen = new Uint8Array(w * h);
  const queue = [start];
  seen[start] = 1;
  let count = 0;
  while (queue.length) {
    const i = queue.pop();
    count++;
    const [x, z] = [i % w, Math.floor(i / w)];
    for (const [dx, dz] of STAIR_DIRS) {
      const [nx, nz] = [x + dx, z + dz];
      if (nx < 0 || nz < 0 || nx >= w || nz >= h) continue;
      const j = nz * w + nx;
      if (seen[j] || !open(tiles[j]) || blocked.has(j)) continue;
      seen[j] = 1;
      queue.push(j);
    }
  }
  return count === total;
}


/** Finner et løp i etasje `lower` med reposet på gulv i `upper`. Returnerer { d, cells, landing } eller null. */
function findRun(lower, upper, rand) {
  const { w, h } = lower;
  const taken = new Set([...footprintCells(lower), ...footprintCells(upper)]); // hele fotavtrykket
  for (let t = 0; t < TRIES; t++) {
    const d = Math.floor(rand() * 4);
    const [dx, dz] = STAIR_DIRS[d];
    const x0 = 2 + Math.floor(rand() * (w - 4));
    const z0 = 2 + Math.floor(rand() * (h - 4));
    const cells = Array.from({ length: RUN }, (_, k) => (z0 + dz * k) * w + x0 + dx * k);
    const [ex, ez] = [x0 + dx * RUN, z0 + dz * RUN];
    const [bx, bz] = [x0 - dx, z0 - dz];
    if (ex < 1 || ez < 1 || ex >= w - 1 || ez >= h - 1 || bx < 1 || bz < 1 || bx >= w - 1 || bz >= h - 1) continue;
    const landing = ez * w + ex;
    const approach = bz * w + bx;
    const all = [approach, ...cells, landing];
    if (!cells.every((i) => plain(lower, i)) || !plain(lower, approach) || !plain(upper, landing)) continue;
    if (all.some((i) => taken.has(i) || lower.tiles[i] === TILE.DOOR || upper.tiles[i] === TILE.DOOR)) continue;
    // Under: løpet og reposet er ikke til å gå på tvers av. Over: sjakten er vegg.
    if (!connected(lower, new Set([...cells, landing])) || !connected(upper, new Set(cells))) continue;
    return { d, cells, landing };
  }
  return null;
}

/**
 * Legger til opptil `count` etasjer over rommet (kopier av etasje 0, litt feil), hver med et trapperom
 * opp fra etasjen under. Returnerer antall etasjer bygget nå har.
 */
export function stackFloors(room, rand, count) {
  for (let k = 0; k < count && storeyCount(room) < MAX_STOREYS; k++) {
    const below = storeyLevel(room, storeyCount(room) - 1);
    const upper = copyStorey(room, 0); // uten trappene opp fra etasje 0 (hver etasje får sin egen)
    makeWrong(upper, 'subtle', rand); // nesten lik etasjen under
    const run = findRun(below, upper, rand);
    if (!run) break;
    run.cells.forEach((i, j) => {
      below.tiles[i] = TILE.STAIRS;
      below.floors[i] = (j + 1) * 6; // vanlig stigning i skissen; 3D regner høyden ut (core/stairwells.js)
      below.meta[i] = run.d | STAIR_THROUGH;
      below.lights[i] = LIGHT.NONE;
      upper.tiles[i] = TILE.WALL; // sjakten
      for (const key of ['lights', 'meta', 'floors', 'panels', 'leds']) upper[key][i] = 0;
    });
    below.lights[run.landing] = LIGHT.NONE;
    insertStorey(room, storeyCount(room), upper);
  }
  return storeyCount(room);
}
