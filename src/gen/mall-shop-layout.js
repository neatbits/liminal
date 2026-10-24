// Shop footprints and perpendicular courts. Saved geometry carries the layout identity.
import { TILE } from '../core/level.js';
import { SHOPFRONT } from '../core/shopfronts.js';
import { randInt } from '../core/rng.js';
import { fillRect } from './util.js';
import { openArcadeCourt } from './mall-arcades.js';

function shops(level, rand, x0, x1, z0, z1, front, court = -1, recess = false) {
  const doors = [],
    list = [],
    north = front > z1;
  fillRect(level, x0, front, x1, front, TILE.WALL);
  let a = x0,
    style = randInt(rand, 0, 3);
  if (court >= 0) style = north ? 0 : 2;
  while (a <= x1) {
    let b = a + randInt(rand, 7, 11) - 1;
    if (x1 - b < 8) b = x1;
    if (b < x1) fillRect(level, b + 1, z0, b + 1, z1, TILE.WALL);
    const closed = rand() < 0.2;
    if (list.length === court && b < x1) {
      openArcadeCourt(level, { x0: a, x1: b, front }, north);
      a = b + 2;
      court = -1;
      continue;
    }
    // Keep at least four metres of shop depth, including in standard-size malls.
    const inset = recess && list.length % 2 === 1 ? Math.max(0, Math.min(2, z1 - z0 - 3)) : 0;
    const f = front + (north ? -inset : inset);
    const s = {
      x0: a,
      x1: b,
      z0: north ? z0 : z0 + inset,
      z1: north ? z1 - inset : z1,
      front: f,
      closed,
      style,
    };
    if (inset) {
      fillRect(level, a, f, b, front, TILE.FLOOR);
      fillRect(level, a, f, b, f, TILE.WALL);
    }
    list.push(s);
    const d = Math.floor((a + b) / 2);
    fillRect(level, d, f, closed ? d : d + 1, f, closed ? TILE.DOOR : TILE.FLOOR);
    if (closed) doors.push([d, f]);
    for (let x = a + 1; x < b; x++)
      if (level.tiles[f * level.w + x] !== TILE.DOOR) level.meta[f * level.w + x] = SHOPFRONT | (style << 2);
    style = (style + 1) % 4;
    a = b + 2;
  }
  return { doors, list };
}

export const MALL_PLANS = ['gallery', 'cross-court', 'terraces'];
export function mallPlan(level, arcades, requested) {
  if (!arcades || level.w < 48) return 'gallery';
  if (MALL_PLANS.includes(requested)) return requested;
  return MALL_PLANS[(Math.imul(level.seed ?? 1, 2654435761) >>> 0) % 3];
}

export function mallShopRows(level, rand, shop, arcades, requested) {
  const { w, h } = level,
    x0 = arcades?.x0 ?? 2,
    x1 = arcades?.x1 ?? w - 3;
  const plan = mallPlan(level, arcades, requested),
    rows = [];
  for (const [z0, z1, front, index] of [
    [arcades?.north ?? 1, shop, shop + 1, 2],
    [h - 1 - shop, arcades?.south ?? h - 2, h - 2 - shop, 1],
  ]) {
    if (plan === 'cross-court') {
      const mid = Math.floor(w / 2),
        court = { x0: mid - 3, x1: mid + 3, front };
      rows.push(
        shops(level, rand, x0, court.x0 - 2, z0, z1, front),
        shops(level, rand, court.x1 + 2, x1, z0, z1, front),
      );
      for (const x of [court.x0 - 1, court.x1 + 1]) fillRect(level, x, z0, x, z1, TILE.WALL);
      openArcadeCourt(level, court, front > z1);
    } else rows.push(shops(level, rand, x0, x1, z0, z1, front, arcades ? index : -1, plan === 'terraces'));
  }
  return rows;
}
