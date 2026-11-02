// Planløsningene i Level 0 (valgt i gen/layouts.js), ved siden av det vanlige oppsettet, som er det vanligste:
// trang labyrint, søylehall, høye kløfter, lave rom, lange, tomme haller og en stor sal med bakke ned. Samme gule rom,
// men feil på hver sin måte. Ren logikk.
import { TILE, getTile } from '../core/level.js';
import { randInt } from '../core/rng.js';
import { fillRect } from './util.js';
import { frame, carve, raise, corridorMaze, door } from './floorplan.js';
import { placeRamp, RAMP_RISE } from '../core/ramps.js';
import { put } from './furnish-sets.js';
import { rectIndices } from '../core/ops.js';

/** Små rom strødd utover, så ingen gang er helt lik den forrige. */
function pockets(ctx, f, n, [lo, hi]) {
  const { rand } = ctx;
  for (let k = 0; k < n; k++) {
    const [a, b] = [randInt(rand, lo, hi), randInt(rand, lo, hi)];
    const [u, v] = [randInt(rand, 0, Math.max(0, f.U - a - 1)), randInt(rand, 0, Math.max(0, f.V - b - 1))];
    carve(ctx, f.box(u, v, u + a, v + b));
  }
}

/** Labyrint: trange ganger som svinger hele tiden, og små rom man havner i. */
export function maze(ctx, rect) {
  const f = frame(rect);
  corridorMaze(ctx, f, { pitch: 3, width: 2, tile: TILE.FLOOR, loops: 0.15 });
  pockets(ctx, f, Math.max(3, Math.floor((f.U * f.V) / 260)), [3, 6]);
}

/** Søylehall: en flate uten ende, med tynne søyler i rutenett og et veggstykke her og der. */
export function pillars(ctx, rect) {
  const { level, rand } = ctx;
  const f = frame(rect);
  const { U, V } = f;
  carve(ctx, rect);
  const step = randInt(rand, 4, 6);
  for (let v = 2; v < V - 1; v += step) {
    for (let u = 2; u < U - 1; u += step) {
      const [x, z] = f.at(u, v);
      if (rand() < 0.93) fillRect(level, x, z, x, z, TILE.PILLAR);
    }
  }
  for (let n = Math.floor((U * V) / 300); n > 0; n--) {
    const horizontal = rand() < 0.5;
    const [x, z] = f.at(randInt(rand, 3, U - 8), randInt(rand, 3, V - 8));
    const len = randInt(rand, 3, 6);
    fillRect(level, x, z, x + (horizontal ? len : 0), z + (horizontal ? 0 : len), TILE.WALL);
  }
}

/** Kløfter: smale ganger med tak langt der oppe. */
export function canyon(ctx, rect) {
  const f = frame(rect);
  corridorMaze(ctx, f, { pitch: 5, width: 3, tile: TILE.FLOOR, loops: 0.12 });
  pockets(ctx, f, Math.max(2, Math.floor((f.U * f.V) / 500)), [4, 8]);
  raise(ctx, rect, 5.5 + randInt(ctx.rand, 0, 20) / 10); // lyset skal fortsatt nå gulvet
}

/** Lave rom: en bred flate med tak rett over hodet, og krypehull der veggene møtes. */
export function lowrooms(ctx, rect) {
  const { level, rand } = ctx;
  const f = frame(rect);
  const { U, V } = f;
  carve(ctx, rect);
  for (let n = Math.floor((U * V) / 45); n > 0; n--) {
    const horizontal = rand() < 0.5;
    const [x, z] = f.at(randInt(rand, 2, U - 3), randInt(rand, 2, V - 3));
    const len = randInt(rand, 3, 9);
    fillRect(level, x, z, x + (horizontal ? len : 0), z + (horizontal ? 0 : len), TILE.WALL);
  }
  for (let v = 1; v < V - 1; v++) {
    for (let u = 1; u < U - 1; u++) {
      const [x, z] = f.at(u, v);
      if (getTile(level, x, z) !== TILE.WALL || rand() > 0.04) continue;
      const through = [[1, 0], [0, 1]].some(([dx, dz]) => getTile(level, x + dx, z + dz) === TILE.FLOOR && getTile(level, x - dx, z - dz) === TILE.FLOOR
        && getTile(level, x + dz, z + dx) === TILE.WALL && getTile(level, x - dz, z - dx) === TILE.WALL);
      if (through) fillRect(level, x, z, x, z, TILE.CRAWL);
    }
  }
  raise(ctx, rect, 2.2);
}

/**
 * Sal med bakke ned: en labyrint oppe, en stor sal der gulvet skråner jevnt ned i hele bredden, og en dør i bunnen til
 * labyrinten nede. Gulvet kan ikke ligge under 0, så alt oppe er hevet like mye som bakken faller (bygges etter at delene
 * er bundet sammen, ctx.after). Man starter oppe, i en gang med åpningen inn til salen rett foran seg.
 */
export function slope(ctx, rect) {
  const { level, rand } = ctx;
  const f = frame(rect);
  const { U, V } = f;
  const flip = rand() < 0.5; // hvilken ende som er oppe
  const u = (k) => (flip ? U - 1 - k : k);
  const at = (a, v) => f.at(u(a), v);
  const box = (a0, v0, a1, v1) => f.box(u(a0), v0, u(a1), v1);
  const low = randInt(rand, 6, 9); // labyrinten nede
  const L = Math.min(randInt(rand, 20, 25), U - low - 2 - 10); // salen: repos (3), bakken og flaten nede (5)
  const run = L - 8;
  const W = Math.min(V, randInt(rand, 12, 18));
  const v0 = Math.floor((V - W) / 2);
  const vc = v0 + Math.floor((W - 1) / 2); // midtlinjen, slik stairCells legger banene
  const a1 = U - low - 2;
  const a0 = a1 - L + 1;
  const drop = Math.round(run * RAMP_RISE * 10) / 10;
  maze(ctx, box(0, 0, a0 - 2, V - 1));
  maze(ctx, box(a1 + 2, 0, U - 1, V - 1));
  const hall = carve(ctx, box(a0, v0, a1, v0 + W - 1));
  const back = Math.max(2, a0 - 8);
  carve(ctx, box(back, vc - 1, a0 - 1, vc + 1)); // gangen inn, med åpningen i veggen
  carve(ctx, box(a1 + 2, vc - 1, a1 + 4, vc + 1));
  door(ctx, ...at(a1 + 1, vc)); // døren ut i bunnen
  level.start = at(back, vc).map((c) => c + 0.5);
  ctx.after.push(() => {
    const ceil = Math.round((drop + level.height) * 10);
    for (const i of rectIndices(level, box(0, 0, a0 - 1, V - 1))) {
      if (level.tiles[i] === TILE.WALL) continue;
      level.floors[i] = Math.round(drop * 10);
      level.ceilings[i] = Math.max(level.ceilings[i], ceil);
    }
    for (const i of rectIndices(level, box(a0, v0, a0 + 2, v0 + W - 1))) level.floors[i] = Math.round(drop * 10);
    placeRamp(level, at(a0 + 2 + run, vc), at(a0 + 3, vc), W);
    raise(ctx, hall, drop + level.height + 0.3 + randInt(rand, 0, 6) / 10);
    // Av og til noen rader stoler nede, vendt mot veggen med døren – som om noe skulle skje der.
    if (rand() < 0.6) {
      const face = f.along(1)[0] ? (flip ? 1 : 3) : flip ? 2 : 0; // nedover bakken (FACING)
      for (const a of [a1 - 2, a1 - 3]) {
        for (let v = v0 + 1; v < v0 + W - 1; v++) if (Math.abs(v - vc) > 1 && rand() < 0.8) put(level, 'woodenchair', ...at(a, v), face);
      }
    }
  });
}

/**
 * Haller: lange, brede, tomme rom etter hverandre, med én rad lysrør langs midten, mørke vinduer inn til nabohallen og
 * en klynge stoler innerst (møblert i gen/furnish-halls.js). Åpningene mellom hallene veksler mellom endene.
 */
export function halls(ctx, rect) {
  const { level, rand } = ctx;
  const f = frame(rect);
  const { U, V } = f;
  const alongX = rect.x1 - rect.x0 >= rect.z1 - rect.z0; // hallene går langs den lengste siden
  // Lyst og klart, som i et tomt kontorbygg: sterkere lys og mindre dis enn ellers i Level 0, så man ser helt inn.
  level.bright = Math.max(level.bright ?? 1, 1.3);
  level.fog = Math.min(level.fog ?? 1, 0.45);
  const list = [];
  for (let v = 0; v + 6 <= V;) {
    const wide = Math.min(V - v, randInt(rand, 6, 9));
    if (wide < 6) break;
    list.push([v, v + wide - 1]);
    v += wide + 1;
  }
  list.forEach(([v0, v1], k) => {
    const room = f.box(0, v0, U - 1, v1);
    // Vinduene sitter på veggen mot neste hall (den første og siste har bare én nabo).
    const toward = k < list.length - 1 ? 1 : k ? -1 : 0;
    carve(ctx, room, 'hall', { alongX, windows: toward, end: rand() < 0.5 ? -1 : 1 });
    raise(ctx, room, 2.9 + randInt(rand, 0, 3) / 10);
    if (k) {
      const u = k % 2 ? randInt(rand, 1, 3) : U - 3 - randInt(rand, 0, 2);
      carve(ctx, f.box(u, v0 - 1, u + 1, v0 - 1)); // åpningen fra hallen før
    }
  });
  // Én rad lysrør langs midten av hver hall (etter at lysene er lagt ut i gen/layouts.js).
  ctx.lights.push(() => {
    for (const [v0, v1] of list) {
      for (let v = v0; v <= v1; v++) for (let u = 0; u < U; u++) { const [x, z] = f.at(u, v); level.lights[z * level.w + x] = 0; }
      const mid = Math.floor((v0 + v1) / 2);
      for (let u = 1; u < U - 1; u += 2) { const [x, z] = f.at(u, mid); if (getTile(level, x, z) === TILE.FLOOR) level.lights[z * level.w + x] = 1; }
    }
  });
}
