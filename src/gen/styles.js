// Én generator per tema. Alle tar (level, rand) og fyller rommet på stedet.
import { TILE, LIGHT } from '../core/level.js';
import { autoLights } from '../core/ops.js';
import { randInt } from '../core/rng.js';
import { getTheme } from '../core/themes.js';
import { fillInterior, fillRect, keepLargestRegion } from './util.js';
import { recursiveDivision, punchLoops } from './division.js';
import { hangDoors, doorsInWalls } from './doors.js';
import { addPoolSlide } from './slides.js';
import { poolPillars } from './pool-pillars.js';

// Dører legges inn til slutt i hver stil, så tidligere rom (samme frø) beholder utformingen.

function lights(level, rand, flicker, broken) {
  autoLights(level, { spacing: getTheme(level.theme).lightSpacing, rand, flicker, broken });
}

/** Nivå 0: store åpne flater oppdelt av tilfeldige veggstykker. */
export function backrooms(level, rand) {
  const { w, h } = level;
  fillInterior(level);
  const segments = Math.floor((w * h) / 16);
  for (let i = 0; i < segments; i++) {
    const x = randInt(rand, 1, w - 2);
    const z = randInt(rand, 1, h - 2);
    if (rand() < 0.7) {
      const len = randInt(rand, 2, 7);
      const horizontal = rand() < 0.5;
      for (let k = 0; k < len; k++) {
        fillRect(level, horizontal ? x + k : x, horizontal ? z : z + k, horizontal ? x + k : x, horizontal ? z : z + k, TILE.WALL);
      }
    } else {
      fillRect(level, x, z, x + randInt(rand, 0, 2), z + randInt(rand, 0, 2), TILE.WALL);
    }
  }
  const halls = Math.max(1, Math.floor((w * h) / 700));
  for (let i = 0; i < halls; i++) {
    const x = randInt(rand, 1, w - 8);
    const z = randInt(rand, 1, h - 8);
    fillRect(level, x, z, x + randInt(rand, 4, 10), z + randInt(rand, 4, 10), TILE.FLOOR);
  }
  keepLargestRegion(level);
  lights(level, rand, 0.05, 0.04);
}

/** Kontor: rom og ganger via rekursiv oppdeling, med dører og noen ekstra løkker. */
export function office(level, rand) {
  fillInterior(level);
  const leaves = recursiveDivision(level, rand, { minRoom: 3, wideChance: 0.2, stopChance: 0.25, maxStopArea: 120 });
  punchLoops(level, rand, Math.ceil(leaves.length / 4));
  lights(level, rand, 0.04, 0.06);
  hangDoors(level, rand, { closed: 0.15, ajar: 0.3, open: 0.45 });
}

/** Hotell: lange, svingete ganger (labyrint med 2 ruters bredde) og noen små lobbyer. */
export function hotel(level, rand) {
  const cw = Math.floor((level.w - 1) / 3);
  const ch = Math.floor((level.h - 1) / 3);
  const visited = new Uint8Array(cw * ch);
  const carveCell = (i, j) => fillRect(level, 1 + 3 * i, 1 + 3 * j, 2 + 3 * i, 2 + 3 * j, TILE.FLOOR);
  const carveBetween = (i, j, di, dj) => {
    if (di) fillRect(level, 3 + 3 * Math.min(i, i + di), 1 + 3 * j, 3 + 3 * Math.min(i, i + di), 2 + 3 * j, TILE.FLOOR);
    else fillRect(level, 1 + 3 * i, 3 + 3 * Math.min(j, j + dj), 2 + 3 * i, 3 + 3 * Math.min(j, j + dj), TILE.FLOOR);
  };
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  const stack = [[Math.floor(cw / 2), Math.floor(ch / 2), 0]];
  visited[stack[0][1] * cw + stack[0][0]] = 1;
  carveCell(stack[0][0], stack[0][1]);
  while (stack.length) {
    const [i, j, last] = stack[stack.length - 1];
    const options = dirs
      .map((d, k) => [d, k])
      .filter(([[di, dj]]) => {
        const ni = i + di;
        const nj = j + dj;
        return ni >= 0 && nj >= 0 && ni < cw && nj < ch && !visited[nj * cw + ni];
      });
    if (!options.length) {
      stack.pop();
      continue;
    }
    const straight = options.find(([, k]) => k === last);
    const [[di, dj], k] = straight && rand() < 0.7 ? straight : options[Math.floor(rand() * options.length)];
    visited[(j + dj) * cw + (i + di)] = 1;
    carveCell(i + di, j + dj);
    carveBetween(i, j, di, dj);
    stack.push([i + di, j + dj, k]);
  }
  for (let j = 0; j < ch; j++) {
    for (let i = 0; i < cw; i++) {
      if (i + 1 < cw && rand() < 0.06) carveBetween(i, j, 1, 0);
      if (j + 1 < ch && rand() < 0.06) carveBetween(i, j, 0, 1);
    }
  }
  const lobbies = Math.floor((cw * ch) / 40);
  for (let n = 0; n < lobbies; n++) {
    const i = randInt(rand, 0, Math.max(0, cw - 2));
    const j = randInt(rand, 0, Math.max(0, ch - 2));
    fillRect(level, 1 + 3 * i, 1 + 3 * j, 5 + 3 * i, 5 + 3 * j, TILE.FLOOR);
  }
  lights(level, rand, 0.05, 0.05);
  // Lukkede dører mellom ganger som ikke henger sammen – dører du ikke husker.
  doorsInWalls(level, rand, 0.25, { nowhere: false, minGap: 4 });
}

/** Bassengrom: store haller med brede åpninger, vann i midten og søyler i de største. */
export function pool(level, rand) {
  fillInterior(level);
  // Store haller: rommene deles ikke opp under 8 ruter, stopper ofte tidlig og har brede åpninger.
  const leaves = recursiveDivision(level, rand, {
    minRoom: 8,
    wideChance: 0.8,
    wideWidth: 5,
    doorTile: TILE.FLOOR,
    stopChance: 0.45,
    maxStopArea: 500,
  });
  const big = [];
  for (const r of leaves) {
    const rw = r.x1 - r.x0 + 1;
    const rh = r.z1 - r.z0 + 1;
    if (rw * rh < 24 || rand() > 0.7) continue;
    const inset = rw * rh > 300 ? 3 : rw * rh > 100 ? 2 : 1;
    fillRect(level, r.x0 + inset, r.z0 + inset, r.x1 - inset, r.z1 - inset, TILE.WATER);
    if (inset >= 2) big.push(r);
    if (rw >= 9 && rh >= 9 && rand() < 0.5) {
      poolPillars(level, r, inset);
    }
  }
  lights(level, rand, 0.02, 0.02);
  // En vannsklie i det største bassengrommet som har plass (plattform, trapp og sklie).
  big.sort((a, b) => (b.x1 - b.x0) * (b.z1 - b.z0) - (a.x1 - a.x0) * (a.z1 - a.z0));
  for (const r of big) if (addPoolSlide(level, r, rand)) break;
}

/** Parkeringskjeller: stor hall med søylerader og noen trappe-/heiskjerner. */
export function garage(level, rand) {
  const { w, h } = level;
  fillInterior(level);
  for (let z = 1; z < h - 1; z++) {
    for (let x = 1; x < w - 1; x++) if (x % 7 === 3 && z % 6 === 3) fillRect(level, x, z, x, z, TILE.PILLAR);
  }
  const cores = Math.max(1, Math.floor((w * h) / 900));
  for (let i = 0; i < cores; i++) {
    const x = randInt(rand, 2, w - 8);
    const z = randInt(rand, 2, h - 8);
    fillRect(level, x, z, x + randInt(rand, 3, 5), z + randInt(rand, 3, 5), TILE.WALL);
  }
  keepLargestRegion(level);
  lights(level, rand, 0.06, 0.08);
}

/** Den uendelige gangen: én lang hotellgang med dørnisjer på begge sider. */
export function corridor(level) {
  const { w } = level;
  fillRect(level, 2, 3, w - 3, 4, TILE.FLOOR);
  for (let x = 5; x < w - 4; x += 6) {
    fillRect(level, x, 2, x, 2, TILE.DOOR);
    fillRect(level, x, 1, x, 1, TILE.FLOOR);
    fillRect(level, x + 3, 5, x + 3, 5, TILE.DOOR);
    fillRect(level, x + 3, 6, x + 3, 6, TILE.FLOOR);
  }
  for (let x = 3; x < w - 3; x += 4) {
    level.lights[3 * w + x] = x % 36 === 23 ? LIGHT.FLICKER : LIGHT.ON;
  }
  hangDoors(level, () => 0, { closed: 1 });
}
