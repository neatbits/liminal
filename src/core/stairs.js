// Trapper: et rett trappeløp tegnet som en dragning fra bunn til topp. Høydene hentes fra
// gulvet før og etter løpet: ender trappen på et høyere gulv (repos), stiger den dit; ellers
// stiger den STAIR_RISE per rute – en trapp til ingensteds. Ren logikk.
import { TILE, getTile, setTile, inBounds, FLOOR_MAX } from './level.js';
import { STAIR_DIRS, STAIR_RISE, edgeHeight, topFloorAt, deckAt } from './heights.js';

/**
 * Rutene i løpet fra a til b langs den dominerende aksen, `width` ruter bredt.
 * @returns {{ dir: [dx, dz], rows: Array<Array<[x, z]>> }} rows[k] = rutene i trinn k
 */
export function stairCells(a, b, width = 1) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const alongX = Math.abs(dx) >= Math.abs(dz);
  const dir = alongX ? [Math.sign(dx) || 1, 0] : [0, Math.sign(dz) || 1];
  const len = (alongX ? Math.abs(dx) : Math.abs(dz)) + 1;
  const first = -Math.floor((Math.max(1, width) - 1) / 2);
  const rows = [];
  for (let k = 0; k < len; k++) {
    const row = [];
    for (let j = 0; j < Math.max(1, width); j++) {
      const lane = first + j;
      row.push(alongX ? [a[0] + dir[0] * k, a[1] + lane] : [a[0] + lane, a[1] + dir[1] * k]);
    }
    rows.push(row);
  }
  return { dir, rows };
}

/** Gulvhøyden på kanten mot løpet (et dekke går foran), eller null ved vegg og utenfor kartet. */
function landing(level, x, z, towards) {
  if (!inBounds(level, x, z) || getTile(level, x, z) === TILE.WALL) return null;
  return deckAt(level, x, z) || edgeHeight(level, x, z, towards[0], towards[1]);
}

/** Legger et trappeløp fra a (bunn) til b (topp). Returnerer antall trapperuter. */
export function placeStairs(level, a, b, width = 1) {
  let { dir, rows } = stairCells(a, b, width);
  const centre = Math.floor((Math.max(1, width) - 1) / 2);
  const ends = () => {
    const s = rows[0][centre];
    const e = rows[rows.length - 1][centre];
    return [
      landing(level, s[0] - dir[0], s[1] - dir[1], dir) ?? (inBounds(level, s[0], s[1]) ? topFloorAt(level, s[0], s[1]) : 0),
      landing(level, e[0] + dir[0], e[1] + dir[1], [-dir[0], -dir[1]]),
    ];
  };
  let [low, high] = ends();
  if (high !== null && high < low - 0.05) {
    // Dratt fra toppen og ned: snu løpet.
    rows = rows.reverse();
    dir = [-dir[0], -dir[1]];
    [low, high] = ends();
  }
  const top = high !== null && high > low + 0.05 ? high : Math.min(FLOOR_MAX, low + rows.length * STAIR_RISE);
  const d = STAIR_DIRS.findIndex(([x, z]) => x === dir[0] && z === dir[1]);
  let n = 0;
  rows.forEach((row, k) => {
    const dm = Math.round((low + ((top - low) * (k + 1)) / rows.length) * 10);
    for (const [x, z] of row) {
      if (x <= 0 || z <= 0 || x >= level.w - 1 || z >= level.h - 1) continue;
      setTile(level, x, z, TILE.STAIRS);
      const i = z * level.w + x;
      level.meta[i] = d;
      level.floors[i] = dm;
      n++;
    }
  });
  // En døråpning rett på toppen får trappens høyde (en dør oppe i trappen).
  const e = rows[rows.length - 1][centre];
  const [ax, az] = [e[0] + dir[0], e[1] + dir[1]];
  if (getTile(level, ax, az) === TILE.DOOR) level.floors[az * level.w + ax] = Math.round(top * 10);
  return n;
}

/** Viskelær: trapperuter i løpet blir vanlig gulv igjen (i høyde 0). */
export function removeStairs(level, a, b, width = 1) {
  let n = 0;
  for (const row of stairCells(a, b, width).rows) {
    for (const [x, z] of row) {
      if (getTile(level, x, z) !== TILE.STAIRS) continue;
      setTile(level, x, z, TILE.FLOOR);
      level.floors[z * level.w + x] = 0;
      n++;
    }
  }
  return n;
}
