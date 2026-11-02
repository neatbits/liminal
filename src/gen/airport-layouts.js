// Planløsningene i flyplassterminalen (valgt i gen/layouts.js): en lang gang med gater på sidene (glassvegger mot
// rullebanen der de ligger mot ytterveggen), en høy innsjekkingshall og en bagasjehall med bånd. Rommene møbleres etter
// funksjon i gen/furnish-airport.js. Ren logikk.
import { TILE } from '../core/level.js';
import { randInt } from '../core/rng.js';
import { fillRect } from './util.js';
import { frame, carve, raise, door, roomRow } from './floorplan.js';

/** Trekker en funksjon etter vektene: [[navn, andel], …]. */
const weighted = (list) => (rand) => {
  let r = rand();
  for (const [k, p] of list) if ((r -= p) < 0) return k;
  return list.at(-1)[0];
};

const SIDE_ROOM = weighted([['gate', 0.62], ['eatery', 0.12], ['dutyfree', 0.12], ['wc', 0.09], ['office', 0.05]]);
const OPEN = ['gate', 'eatery', 'dutyfree']; // åpne mot gangen; de andre har en dør

/** Gangen: høyt tak midt i, og gater (og en og annen kafé, butikk eller toalett) på en eller begge sider. */
export function concourse(ctx, rect) {
  const { rand } = ctx;
  const f = frame(rect);
  const { U, V } = f;
  const W = Math.min(V - 6, randInt(rand, 6, 8));
  const two = V >= W + 14;
  const c0 = two ? Math.floor((V - W) / 2) : V - W;
  const walk = carve(ctx, f.box(0, c0, U - 1, c0 + W - 1), 'concourse', { along: f.along(1) });
  raise(ctx, walk, 4.8 + randInt(rand, 0, 12) / 10);
  for (const side of two ? [-1, 1] : [-1]) {
    const [v0, v1] = side < 0 ? [0, c0 - 2] : [c0 + W + 1, V - 1];
    if (v1 - v0 < 4) continue;
    const wall = side < 0 ? c0 - 1 : c0 + W; // veggen mot gangen
    for (let u = 0; u < U;) {
      let kind = SIDE_ROOM(rand);
      let width = OPEN.includes(kind) ? randInt(rand, 8, 12) : randInt(rand, 4, 6);
      if (U - (u + width) < 5) width = U - u;
      if (width < 4) break;
      if (width < 7 && kind === 'gate') kind = 'eatery';
      const room = carve(ctx, f.box(u, v0, u + width - 1, v1), kind, { front: f.across(-side), along: f.along(1) });
      raise(ctx, room, kind === 'gate' ? 3.6 : 3.1);
      if (OPEN.includes(kind)) carve(ctx, f.box(u + 1, wall, u + width - 2, wall)); // bred åpning, en pilar i hver ende
      else door(ctx, ...f.at(u + Math.floor(width / 2), wall));
      u += width + 1;
    }
  }
}

/** Innsjekkingshallen: høy, med søyler, glassvegg foran og en rad med kontorer og toaletter bak skrankene. */
export function checkin(ctx, rect) {
  const { level, rand } = ctx;
  const f = frame(rect);
  const { U, V } = f;
  const back = V >= 18 ? 5 : 0;
  const hall = carve(ctx, f.box(0, 0, U - 1, V - 1 - (back ? back + 1 : 0)), 'checkin', { front: f.across(-1), along: f.along(1) });
  raise(ctx, hall, 6.5 + randInt(rand, 0, 15) / 10);
  const hv = V - (back ? back + 1 : 0);
  for (let u = 4; u < U - 3; u += 7) {
    for (let v = 3; v < hv - 6; v += 6) { const [x, z] = f.at(u, v); fillRect(level, x, z, x, z, TILE.PILLAR); }
  }
  if (back) roomRow(ctx, f.box(1, V - back, U - 2, V - 1), f.across(-1), { width: [5, 8], kind: weighted([['office', 0.45], ['wc', 0.35], ['storage', 0.2]]) });
}

/** Bagasjehallen: lavere, med plass til båndene, og toaletter og et hittegodskontor bak. */
export function baggage(ctx, rect) {
  const { rand } = ctx;
  const f = frame(rect);
  const { U, V } = f;
  const back = V >= 18 ? 5 : 0;
  const hall = carve(ctx, f.box(0, 0, U - 1, V - 1 - (back ? back + 1 : 0)), 'baggage', { front: f.across(-1), along: f.along(1) });
  raise(ctx, hall, 4.4 + randInt(rand, 0, 8) / 10);
  if (back) roomRow(ctx, f.box(1, V - back, U - 2, V - 1), f.across(-1), { width: [5, 8], kind: weighted([['wc', 0.5], ['office', 0.5]]) });
}
