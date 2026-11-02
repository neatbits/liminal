// Planløsningene i Poolrooms (valgt i gen/layouts.js): katedral, vannpark, avgrunn og kanaler. Vannflaten
// ligger alltid i samme høyde, så det som varierer, er dybden, takhøyden og hvor mye som står under vann. Ren logikk.
import { TILE, getTile } from '../core/level.js';
import { randInt } from '../core/rng.js';
import { setPillar } from '../core/pillars.js';
import { frame, carve, raise, flood, corridorMaze, note } from './floorplan.js';
import { addPoolSlide } from './slides.js';

/** Sklier fra høye plattformer i hjørnene, ned i bassenget i midten (også lekerommets klatretårn). */
export function slideTowers(ctx, rect, steps, tries = 4) {
  let n = 0;
  for (let k = 0; k < tries; k++) if (addPoolSlide(ctx.level, rect, ctx.rand, { steps: randInt(ctx.rand, steps[0], steps[1]) })) n++;
  return n;
}

/** Katedral: en enorm hall, et tak langt der oppe, og søyler som står i vannet. */
export function cathedral(ctx, rect) {
  const { level, rand } = ctx;
  const f = frame(rect);
  const { U, V } = f;
  carve(ctx, rect);
  const [mu, mv] = [Math.floor(U / 2), Math.floor(V / 2)];
  // Fire bassenger med ulik dybde, delt av to brede bruer.
  const depths = [0.6, 1.3, 2.2, 3].sort(() => rand() - 0.5);
  [[3, 3, mu - 3, mv - 3], [mu + 2, 3, U - 4, mv - 3], [3, mv + 2, mu - 3, V - 4], [mu + 2, mv + 2, U - 4, V - 4]]
    .forEach(([a, b, c, d], k) => flood(ctx, f.box(a, b, c, d), depths[k]));
  for (let v = 6; v < V - 4; v += 8) {
    for (let u = 6; u < U - 4; u += 8) {
      const [x, z] = f.at(u, v);
      if (getTile(level, x, z) === TILE.WATER) setPillar(level, x, z, 3);
    }
  }
  raise(ctx, rect, 9 + randInt(rand, 0, 50) / 10);
}

/** Vannpark: en stor lagune og sklier fra høye plattformer. */
export function lagoon(ctx, rect) {
  carve(ctx, rect);
  flood(ctx, { x0: rect.x0 + 3, z0: rect.z0 + 3, x1: rect.x1 - 3, z1: rect.z1 - 3 }, 1.4);
  slideTowers(ctx, rect, [6, 10]);
}

/** Avgrunn: smale gangbroer over dypt vann, og lyset er for det meste borte. */
export function abyss(ctx, rect) {
  const { rand } = ctx;
  const f = frame(rect);
  const { U, V } = f;
  carve(ctx, rect);
  flood(ctx, f.box(1, 1, U - 2, V - 2), 3);
  const [du, dv] = [randInt(rand, 8, 11), randInt(rand, 7, 10)];
  for (let u = du; u < U - 3; u += du) carve(ctx, f.box(u, 0, u + (u % 2), V - 1));
  for (let v = dv; v < V - 3; v += dv) carve(ctx, f.box(0, v, U - 1, v + (v % 2)));
  const [mu, mv] = [Math.floor(U / 2), Math.floor(V / 2)];
  carve(ctx, f.box(mu - 2, mv - 2, mu + 2, mv + 2));
  ctx.level.bright = 0.55;
  note(ctx, 'bare', rect); // ingen ender, flamingoer eller stupebrett: det skal ikke se ut som en badeanstalt
}

/** Kanaler: lave, flislagte ganger under vann, tørre rom her og der, og dype sjakter. */
export function canals(ctx, rect) {
  const { level, rand } = ctx;
  const f = frame(rect);
  const { U, V } = f;
  corridorMaze(ctx, f, { pitch: 3, width: 2, tile: TILE.WATER, loops: 0.08 });
  flood(ctx, rect, 0.5, (x, z) => getTile(level, x, z) === TILE.WATER);
  for (let n = Math.max(2, Math.floor((U * V) / 500)); n > 0; n--) {
    const [u, v] = [randInt(rand, 0, U - 6), randInt(rand, 0, V - 6)];
    flood(ctx, f.box(u, v, u + 4, v + 4), 3);
  }
  const dry = [[0, 0], [U - 7, V - 7], [0, V - 7], [U - 7, 0], [Math.floor(U / 2) - 3, Math.floor(V / 2) - 3]];
  for (const [u, v] of dry) carve(ctx, f.box(u, v, u + 6, v + 6));
  raise(ctx, rect, 2.4);
}
