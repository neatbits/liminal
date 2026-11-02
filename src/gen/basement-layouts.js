// Planløsningene i kjelleren (valgt i gen/layouts.js), ved siden av den gamle med stue og små rom (classic,
// gen/basement.js): boder langs smale ganger, fyrrom, tilfluktsrom med sovesaler og fellesvaskeri. Ren logikk.
import { TILE } from '../core/level.js';
import { fillRect } from './util.js';
import { frame, carve, raise, roomRow, corridorRows } from './floorplan.js';

/** Trekker en funksjon etter vektene i list: [[navn, andel], …]. */
const weighted = (list) => (rand) => {
  let r = rand();
  for (const [k, p] of list) if ((r -= p) < 0) return k;
  return list.at(-1)[0];
};

/** Boder: smale ganger med små, like rom på begge sider, de fleste låst. */
export function storage(ctx, rect) {
  corridorRows(ctx, rect, { room: 3, width: [2, 3], kind: weighted([['cage', 0.85], ['bare', 0.15]]), locked: 0.6 });
  raise(ctx, rect, 2.3);
}

/** Fyrrom: en høyere hall med kjeler og søyler, og låste tekniske rom langs den ene langveggen. */
export function boiler(ctx, rect) {
  const { level } = ctx;
  const f = frame(rect);
  const depth = 4;
  const hall = carve(ctx, f.box(0, 0, f.U - 1, f.V - depth - 2), 'boiler');
  roomRow(ctx, f.box(1, f.V - depth, f.U - 2, f.V - 1), f.across(-1), { width: [4, 6], kind: weighted([['storage', 0.6], ['bare', 0.4]]), locked: true });
  const [hu, hv] = [f.U, f.V - depth - 1];
  for (let u = 6; u < hu - 4; u += 7) {
    for (const v of [Math.floor(hv / 3), Math.floor((hv * 2) / 3)]) {
      const [x, z] = f.at(u, v);
      fillRect(level, x, z, x, z, TILE.PILLAR);
    }
  }
  raise(ctx, hall, 3.4);
}

/** Tilfluktsrom: lavt, med sovesaler med køyesenger og noen få rom til lager og toaletter. */
export function shelter(ctx, rect) {
  corridorRows(ctx, rect, { room: 6, width: [6, 10], kind: weighted([['bunks', 0.6], ['storage', 0.2], ['wc', 0.2]]), locked: 0.15 });
  raise(ctx, rect, 2.2);
}

/** Fellesvaskeri: vaskerom, tørkerom og boder langs gangene. */
export function laundry(ctx, rect) {
  corridorRows(ctx, rect, { room: 5, width: [4, 7], kind: weighted([['laundry', 0.4], ['drying', 0.25], ['cage', 0.2], ['wc', 0.15]]) });
}
