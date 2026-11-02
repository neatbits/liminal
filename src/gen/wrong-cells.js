// Felles for «Make it wrong» (gen/wrong.js, gen/wrong-more.js): å finne ruter og trekke blant dem. level.keep er
// rutene som ikke skal røres (der trapper går av og på, startpunktet). Ren logikk.
import { TILE, getTile } from '../core/level.js';

export const DIRS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

export const pick = (rand, list) => list[Math.floor(rand() * list.length)];

export const kept = (level, x, z) => !!level.keep?.has(z * level.w + x);

export const cellsOf = (level, test) => {
  const out = [];
  for (let z = 1; z < level.h - 1; z++) for (let x = 1; x < level.w - 1; x++) if (!kept(level, x, z) && test(x, z, z * level.w + x)) out.push([x, z]);
  return out;
};

export const floorCells = (level) => cellsOf(level, (x, z, i) => level.tiles[i] === TILE.FLOOR);

/** Gulvruter med gulv på alle åtte sider – midt i et rom, ikke i en gang. */
export const roomy = (level) =>
  cellsOf(level, (x, z) => {
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (getTile(level, x + dx, z + dz) !== TILE.FLOOR) return false;
    return true;
  });
