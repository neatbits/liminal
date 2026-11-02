// Planløsningene i lekerommet (valgt i gen/layouts.js): ballhav, myk labyrint, klatretårn og mørkt rom.
// Ballene er det dyreste her, så ballhavet har et tak på antall ruter. Ren logikk.
import { TILE, getTile } from '../core/level.js';
import { randInt } from '../core/rng.js';
import { paintLeds } from '../core/leds.js';
import { fillRect } from './util.js';
import { frame, carve, raise, flood, corridorMaze } from './floorplan.js';
import { slideTowers } from './pool-layouts.js';

export const PIT_MAX = 1800; // ruter med baller i ett hav: hver koster omtrent 70 tegnede baller
const LED_EVERY = 3; // én vegg-rute av så mange får LED: hver er en lyskilde bakingen må regne på
const MAX_LEDS = 300; // i ett bygg
const LED_COLORS = [1, 2, 4, 5, 6];

/** Midten av rektangelet, så stor at den holder seg under max ruter (ballene koster mest av alt her). */
function capped({ x0, z0, x1, z1 }, max) {
  const [w, h] = [x1 - x0 + 1, z1 - z0 + 1];
  const shrink = Math.min(1, Math.sqrt(max / (w * h)));
  const [mx, mz] = [Math.ceil((w - w * shrink) / 2), Math.ceil((h - h * shrink) / 2)];
  return { x0: x0 + mx, z0: z0 + mz, x1: x1 - mx, z1: z1 - mz };
}

/** Ballhav: hele gulvet er ballbinge, med øyer man kan stå på. */
export function ballsea(ctx, rect) {
  const { rand } = ctx;
  const f = frame(rect);
  const { U, V } = f;
  carve(ctx, rect);
  const sea = capped(f.box(2, 2, U - 3, V - 3), PIT_MAX); // store bygg: havet i midten, gulv rundt
  flood(ctx, sea);
  const island = (x, z, a, b) => carve(ctx, { x0: x, z0: z, x1: x + a, z1: z + b });
  for (let n = Math.max(3, Math.floor(((sea.x1 - sea.x0) * (sea.z1 - sea.z0)) / 170)); n > 0; n--) {
    const [a, b] = [randInt(rand, 3, 6), randInt(rand, 3, 6)];
    island(randInt(rand, sea.x0, Math.max(sea.x0, sea.x1 - a)), randInt(rand, sea.z0, Math.max(sea.z0, sea.z1 - b)), a, b);
  }
  const [cu, cv] = [Math.floor(U / 2), Math.floor(V / 2)];
  carve(ctx, f.box(cu - 2, cv - 2, cu + 2, cv + 2)); // man starter på en øy
}

/** Myk labyrint: lave ganger, små binger og krypehull gjennom veggene. */
export function softmaze(ctx, rect) {
  const { level, rand } = ctx;
  const f = frame(rect);
  const { U, V } = f;
  corridorMaze(ctx, f, { pitch: 3, width: 2, tile: TILE.FLOOR, loops: 0.05 });
  for (let n = Math.max(2, Math.floor((U * V) / 300)); n > 0; n--) {
    const [u, v] = [randInt(rand, 1, U - 7), randInt(rand, 1, V - 7)];
    carve(ctx, f.box(u, v, u + 5, v + 5));
    flood(ctx, f.box(u + 1, v + 1, u + 4, v + 4));
  }
  raise(ctx, rect, 2.3);
  // Krypehull der en vegg skiller to ganger: rett gjennom i stedet for rundt.
  for (let v = 1; v < V - 1; v++) {
    for (let u = 1; u < U - 1; u++) {
      const [x, z] = f.at(u, v);
      if (getTile(level, x, z) !== TILE.WALL || rand() > 0.05) continue;
      const across = [[1, 0], [0, 1]].find(([dx, dz]) => getTile(level, x + dx, z + dz) === TILE.FLOOR && getTile(level, x - dx, z - dz) === TILE.FLOOR
        && getTile(level, x + dz, z + dx) === TILE.WALL && getTile(level, x - dz, z - dx) === TILE.WALL);
      if (across) fillRect(level, x, z, x, z, TILE.CRAWL);
    }
  }
}

/** Klatretårn: en høy hall med stor binge og sklier fra plattformer høyt oppe. */
export function tower(ctx, rect) {
  const { rand } = ctx;
  carve(ctx, rect);
  flood(ctx, capped({ x0: rect.x0 + 3, z0: rect.z0 + 3, x1: rect.x1 - 3, z1: rect.z1 - 3 }, PIT_MAX));
  const n = slideTowers(ctx, rect, [5, 10]);
  raise(ctx, rect, n ? 8.5 + randInt(rand, 0, 15) / 10 : 7);
}

/** Mørkt rom: saler uten taklys. Bare LED-striper langs veggene lyser opp ballene. */
export function blacklight(ctx, rect) {
  const { level, rand } = ctx;
  const f = frame(rect);
  const { U, V } = f;
  const [cols, rows] = [Math.max(2, Math.floor(U / 14)), Math.max(1, Math.floor(V / 14))];
  const [cw, ch] = [Math.floor((U + 1) / cols), Math.floor((V + 1) / rows)];
  const halls = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const [u0, v0, u1, v1] = [c * cw, r * ch, (c + 1) * cw - 2, (r + 1) * ch - 2];
      carve(ctx, f.box(u0, v0, u1, v1));
      flood(ctx, capped(f.box(u0 + 3, v0 + 3, u1 - 3, v1 - 3), PIT_MAX / (cols * rows)));
      if (c) carve(ctx, f.box(u0 - 1, v0 + Math.floor(ch / 2) - 2, u0 - 1, v0 + Math.floor(ch / 2)));
      if (r) carve(ctx, f.box(u0 + Math.floor(cw / 2) - 2, v0 - 1, u0 + Math.floor(cw / 2), v0 - 1));
      halls.push(f.box(u0, v0, u1, v1));
    }
  }
  ctx.after.push(() => {
    for (const h of halls) {
      const color = LED_COLORS[Math.floor(rand() * LED_COLORS.length)];
      const cells = [];
      const perimeter = 2 * (h.x1 - h.x0 + h.z1 - h.z0 + 2);
      const every = Math.max(LED_EVERY, Math.ceil((perimeter * halls.length) / MAX_LEDS));
      for (let x = h.x0; x <= h.x1; x += every) for (const z of [h.z0 - 1, h.z1 + 1]) cells.push(z * level.w + x);
      for (let z = h.z0; z <= h.z1; z += every) for (const x of [h.x0 - 1, h.x1 + 1]) cells.push(z * level.w + x);
      paintLeds(level, cells, color);
    }
  });
}
