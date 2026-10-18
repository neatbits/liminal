// Utganger: lukkede dører til ingensteds i ytterveggen (eller i en tykk vegg). I gåmodus
// fører en dør til ingensteds videre til et nytt, generert nivå (view3d/explore.js).
import { TILE, getTile, inBounds } from '../core/level.js';
import { floorAt } from '../core/heights.js';
import { DOOR } from '../core/doors.js';

const DIRS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
const solid = (level, x, z) => getTile(level, x, z) === TILE.WALL; // utenfor kartet er vegg

/** Kan veggruten (x, z) bli en utgang? Gulv på nøyaktig én side, vegg bak og på begge sider. */
export function exitCandidate(level, x, z) {
  if (!inBounds(level, x, z) || level.tiles[z * level.w + x] !== TILE.WALL) return false;
  const open = DIRS.filter(([dx, dz]) => !solid(level, x + dx, z + dz));
  if (open.length !== 1) return false;
  const [dx, dz] = open[0];
  if (getTile(level, x + dx, z + dz) !== TILE.FLOOR || floorAt(level, x + dx, z + dz) !== 0) return false;
  // Langs veggen: vegg på begge sider av døren.
  return solid(level, x - dz, z + dx) && solid(level, x + dz, z - dx);
}

/**
 * Setter inn opptil `count` utganger, spredt rundt i rommet og et stykke unna `spawn`.
 * @returns {Array<[x, z]>} rutene som fikk en utgang
 */
export function addExits(level, rand, count = 3, spawn = null) {
  const cand = [];
  for (let z = 0; z < level.h; z++) for (let x = 0; x < level.w; x++) if (exitCandidate(level, x, z)) cand.push([x, z]);
  for (let i = cand.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [cand[i], cand[j]] = [cand[j], cand[i]];
  }
  const spread = Math.max(6, Math.min(level.w, level.h) / 3);
  const placed = [];
  for (const [x, z] of cand) {
    if (placed.length >= count) break;
    if (spawn && Math.hypot(x + 0.5 - spawn.x, z + 0.5 - spawn.z) < 6) continue;
    if (placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < spread)) continue;
    if (!exitCandidate(level, x, z)) continue; // en nabo kan ha blitt dør
    level.tiles[z * level.w + x] = TILE.DOOR;
    level.lights[z * level.w + x] = 0;
    level.meta[z * level.w + x] = DOOR.CLOSED;
    placed.push([x, z]);
  }
  return placed;
}
