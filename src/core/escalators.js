// Rulletrapper bruker trappelaget: bit 0–1 = oppoverretning, 2 = motor, 3 = nedover.
// Vanlige trapper og eldre rom beholder oppførselen sin. Ingen ny formatversjon.
import { TILE, getTile } from './level.js';
import { groundAt, stairSpan } from './heights.js';
import { placeStairs, stairCells } from './stairs.js';

export const ESCALATOR = 4;
export const ESCALATOR_DOWN = 8;
export const ESCALATOR_SPEED = 0.45; // vannrett meter/sekund; samme fart i shader og gange

export function isEscalator(level, x, z) {
  return getTile(level, x, z) === TILE.STAIRS && !!(level.meta[z * level.w + x] & ESCALATOR);
}

export function placeEscalator(level, a, b, width = 2, down = false) {
  const n = placeStairs(level, a, b, width);
  for (const row of stairCells(a, b, width).rows) for (const [x, z] of row) {
    if (getTile(level, x, z) === TILE.STAIRS) level.meta[z * level.w + x] |= ESCALATOR | (down ? ESCALATOR_DOWN : 0);
  }
  return n;
}

/** Motorfart bare når føttene er ved trinnene, aldri mens man hopper eller faller. */
export function escalatorVelocity(level, x, z, feet, vy = 0) {
  const cx = Math.floor(x), cz = Math.floor(z);
  if (vy !== 0 || !isEscalator(level, cx, cz) || Math.abs(feet - groundAt(level, x, z)) > 0.35) return [0, 0];
  const { dir } = stairSpan(level, cx, cz);
  const speed = ESCALATOR_SPEED * (level.meta[cz * level.w + cx] & ESCALATOR_DOWN ? -1 : 1);
  return [dir[0] * speed, dir[1] * speed];
}

/** Sammenhengende løp; nabolaner med samme profil samles til én bred rulletrapp. */
export function escalatorRuns(level) {
  const lanes = [];
  const same = (x, z, meta) => isEscalator(level, x, z) && level.meta[z * level.w + x] === meta;
  for (let z = 0; z < level.h; z++) for (let x = 0; x < level.w; x++) {
    if (!isEscalator(level, x, z)) continue;
    const meta = level.meta[z * level.w + x];
    const { bottom, dir } = stairSpan(level, x, z);
    if (same(x - dir[0], z - dir[1], meta)) continue;
    let length = 1;
    while (same(x + dir[0] * length, z + dir[1] * length, meta)) length++;
    const { top } = stairSpan(level, x + dir[0] * (length - 1), z + dir[1] * (length - 1));
    const origin = [x + (dir[0] < 0 ? 1 : 0), z + (dir[1] < 0 ? 1 : 0)];
    lanes.push({ origin, dir, length, low: bottom, rise: top - bottom, down: !!(meta & ESCALATOR_DOWN), width: 1 });
  }
  lanes.sort((a, b) => a.origin[0] - b.origin[0] || a.origin[1] - b.origin[1]);
  const runs = [];
  for (const lane of lanes) {
    const across = lane.dir[0] ? 1 : 0, along = 1 - across;
    const run = runs.find((r) => r.dir[0] === lane.dir[0] && r.dir[1] === lane.dir[1] &&
      r.origin[along] === lane.origin[along] && r.origin[across] + r.width === lane.origin[across] &&
      r.length === lane.length && r.low === lane.low && r.rise === lane.rise && r.down === lane.down);
    if (run) run.width++;
    else runs.push(lane);
  }
  return runs;
}
