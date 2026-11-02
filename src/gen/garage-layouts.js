// Planløsningene i parkeringskjelleren (valgt i gen/layouts.js): plasser med tildekkede biler, oversvømt plan og
// lav krypt. Ren logikk.
import { TILE } from '../core/level.js';
import { randInt } from '../core/rng.js';
import { fillRect } from './util.js';
import { frame, carve, raise, flood, note } from './floorplan.js';

const BAND = 17; // plasser, kjørefelt, plasser og litt luft

const pillar = (ctx, x, z) => fillRect(ctx.level, x, z, x, z, TILE.PILLAR);

/** Noen trapperom i betong, så hallen ikke er helt tom. */
function cores(ctx, f, n) {
  const { rand } = ctx;
  for (let k = 0; k < n; k++) {
    const [u, v] = [randInt(ctx.rand, 2, f.U - 8), randInt(rand, 2, f.V - 8)];
    const r = f.box(u, v, u + randInt(rand, 3, 5), v + randInt(rand, 3, 5));
    fillRect(ctx.level, r.x0, r.z0, r.x1, r.z1, TILE.WALL);
  }
}

/** Plasser: rader med biler under presenning, søyler mellom plassene og brede kjørefelt. */
export function bays(ctx, rect) {
  const f = frame(rect);
  const { U, V } = f;
  carve(ctx, rect);
  const spots = [];
  for (let v0 = 1; v0 + 12 < V; v0 += BAND) {
    for (const [v, front] of [[v0 + 2, 1], [v0 + 12, -1]]) {
      for (let u = 2; u < U - 2; u++) {
        if ((u - 1) % 9 === 0) continue; // søylene står her
        if (u % 3 === 0) spots.push({ at: f.at(u, v), front: f.across(front) });
      }
      for (let u = 1; u < U - 1; u += 9) {
        const [x, z] = f.at(u, v + front * 2);
        pillar(ctx, x, z);
      }
    }
  }
  note(ctx, 'bays', rect, { spots });
  cores(ctx, f, Math.max(1, Math.floor((U * V) / 1200)));
}

/** Oversvømt plan: svart vann over hele kjelleren, bare tørt langs veggene. */
export function flooded(ctx, rect) {
  const f = frame(rect);
  const { U, V } = f;
  carve(ctx, rect);
  flood(ctx, f.box(2, 2, U - 3, V - 3), 0.5);
  for (let v = 5; v < V - 4; v += 7) {
    for (let u = 5; u < U - 4; u += 8) {
      const [x, z] = f.at(u, v);
      pillar(ctx, x, z);
    }
  }
}

/** Krypt: så lavt det går, med søyler så tett at man aldri ser langt. */
export function crypt(ctx, rect) {
  const f = frame(rect);
  const { U, V } = f;
  carve(ctx, rect);
  for (let v = 2; v < V - 1; v += 3) {
    for (let u = 2; u < U - 1; u += 3) {
      const [x, z] = f.at(u, v);
      pillar(ctx, x, z);
    }
  }
  cores(ctx, f, Math.max(1, Math.floor((U * V) / 900)));
  raise(ctx, rect, 2.2);
}
