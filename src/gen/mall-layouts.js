// Planløsningene i kjøpesenteret (valgt i gen/layouts.js), ved siden av atriet med gallerier (classic, gen/mall.js):
// matsal under glasstak, en død handlegate der de fleste butikkene er stengt, og bakgangene med lager og
// personalrom. Butikkfrontene går alltid langs x (core/shopfronts.js). Ren logikk.
import { TILE } from '../core/level.js';
import { SHOPFRONT } from '../core/shopfronts.js';
import { randInt } from '../core/rng.js';
import { fillRect } from './util.js';
import { carve, raise, flood, note, corridorRows } from './floorplan.js';
import { shops } from './mall-shop-layout.js';
import { furnishShops } from './mall-shops.js';

const CAFE = 3; // SHOP_PROFILES: kafé
const MAX_OPEN = 16; // butikker med innredning i ett bygg: resten er tømt (hver gjenstand koster når neste settes inn)

/** Butikkradene møbleres etter at delene er bundet sammen, og de stengte dørene holdes lukket. */
function openShops(ctx, rows, style = null) {
  const { level, rand } = ctx;
  const list = rows.flatMap((r) => r.list);
  let open = list.filter((s) => !s.closed).length;
  for (const s of list) if (!s.closed && open > MAX_OPEN && rand() < 1 - MAX_OPEN / open) (s.closed = true), open--;
  if (style !== null) {
    for (const s of list) {
      s.style = style;
      for (let x = s.x0 + 1; x < s.x1; x++) if (level.tiles[s.front * level.w + x] !== TILE.DOOR) level.meta[s.front * level.w + x] = SHOPFRONT | (style << 2);
    }
  }
  ctx.locked.push(...rows.flatMap((r) => r.doors));
  ctx.after.push(() => furnishShops(level, rand, list));
}

/** Matsal: kafeer langs den ene veggen (begge når det er plass), og en høy hall med bord under glasstaket. */
export function foodcourt(ctx, rect) {
  const { level } = ctx;
  carve(ctx, rect);
  const both = rect.z1 - rect.z0 >= 26;
  const stall = { x0: rect.x0 + 1, x1: rect.x1 - 1, depth: 4 };
  const rows = [shops(level, ctx.rand, stall.x0, stall.x1, rect.z0, rect.z0 + stall.depth - 1, rect.z0 + stall.depth, -1, false, 0.25)];
  raise(ctx, { ...rect, z1: rect.z0 + stall.depth - 1 }, 3.4);
  if (both) {
    rows.push(shops(level, ctx.rand, stall.x0, stall.x1, rect.z1 - stall.depth + 1, rect.z1, rect.z1 - stall.depth, -1, false, 0.25));
    raise(ctx, { ...rect, z0: rect.z1 - stall.depth + 1 }, 3.4);
  }
  // Endene av kaferadene.
  const bands = [[rect.z0, rect.z0 + stall.depth], ...(both ? [[rect.z1 - stall.depth, rect.z1]] : [])];
  for (const [a, b] of bands) for (const x of [rect.x0, rect.x1]) fillRect(level, x, a, x, b, TILE.WALL);
  const hall = { x0: rect.x0, x1: rect.x1, z0: rect.z0 + stall.depth + 1, z1: both ? rect.z1 - stall.depth - 1 : rect.z1 };
  raise(ctx, hall, 7); // over 6 m: glasstak (core/mall-roof.js)
  const [hw, hh] = [hall.x1 - hall.x0 + 1, hall.z1 - hall.z0 + 1];
  let pool = null;
  if (hw >= 20 && hh >= 12) {
    const [cx, cz] = [Math.floor((hall.x0 + hall.x1) / 2), Math.floor((hall.z0 + hall.z1) / 2)];
    pool = { x0: cx - 2, x1: cx + 1, z0: cz - 1, z1: cz };
    flood(ctx, pool, 0.4);
  }
  note(ctx, 'foodcourt', hall, { pool });
  openShops(ctx, rows, CAFE);
}

/**
 * Handlegate som ingen går i lenger: lange gater med butikker på begge sider, de fleste stengt, og ganger i
 * endene som binder gatene sammen. Flere gater over hverandre når det er plass.
 */
export function promenade(ctx, rect) {
  const { level, rand } = ctx;
  const shop = randInt(rand, 5, 6);
  const street = randInt(rand, 5, 6);
  const band = shop * 2 + street + 2;
  const [xa, xb] = [rect.x0 + 4, rect.x1 - 4];
  const rows = [];
  let z = rect.z0;
  let last = rect.z0;
  for (; z + band - 1 <= rect.z1; z += band + 1) {
    carve(ctx, { x0: xa, x1: xb, z0: z, z1: z + band - 1 });
    const s = { z0: z + shop + 1, z1: z + shop + street };
    carve(ctx, { x0: rect.x0, x1: rect.x1, ...s });
    rows.push(shops(level, rand, xa, xb, z, z + shop - 1, z + shop, -1, rand() < 0.5, 0.55));
    rows.push(shops(level, rand, xa, xb, s.z1 + 2, z + band - 1, s.z1 + 1, -1, false, 0.55));
    note(ctx, 'promenade', { x0: xa, x1: xb, ...s });
    last = s.z1;
  }
  // Gangene i endene: fra den første gaten til den siste, utenfor butikkene.
  const first = rect.z0 + shop + 1;
  for (const x of [rect.x0, rect.x1 - 2]) carve(ctx, { x0: x, x1: x + 2, z0: first, z1: last });
  raise(ctx, rect, 4.6);
  openShops(ctx, rows);
}

const BACK = [['stockroom', 0.35], ['storage', 0.25], ['lounge', 0.15], ['wc', 0.1], ['bare', 0.15]];

/** Bakgangene: smale ganger med lager, bod og personalrom, lavt og svakt opplyst. */
export function service(ctx, rect) {
  const kind = (rand) => {
    let r = rand();
    for (const [k, p] of BACK) if ((r -= p) < 0) return k;
    return 'bare';
  };
  corridorRows(ctx, rect, { room: 5, width: [4, 8], kind, locked: 0.3 });
  raise(ctx, rect, 2.8);
}
