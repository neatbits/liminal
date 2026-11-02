// Planløsningene på sykehuset (valgt i gen/layouts.js): åpne sengesaler, operasjonsfløy, isolat og likhus. Ren logikk.
import { frame, carve, roomRow, glaze } from './floorplan.js';

/** Rader av rom på begge sider av brede ganger. depth: [min, maks], gang = bredden på gangene. Returnerer radene. */
function bands(ctx, rect, { depth: [lo, hi], gang, row }) {
  const f = frame(rect);
  const { U, V } = f;
  const count = Math.max(1, Math.floor((V + 1) / (lo * 2 + gang + 3)));
  const depth = Math.min(hi, Math.floor(((V + 1) / count - gang - 3) / 2));
  const pitch = depth * 2 + gang + 3;
  const top = Math.floor((V - (count * pitch - 1)) / 2);
  const inset = count > 1 ? gang + 1 : 0;
  let [first, last] = [0, 0];
  for (let b = 0; b < count; b++) {
    const v0 = top + b * pitch;
    const cv = v0 + depth + 1;
    if (!b) first = cv;
    last = cv + gang - 1;
    carve(ctx, f.box(0, cv, U - 1, last));
    row(f, f.box(inset, v0, U - 1 - inset, cv - 2), 1, cv - 1);
    row(f, f.box(inset, last + 2, U - 1 - inset, last + 1 + depth), -1, last + 1);
  }
  if (count > 1) for (const u of [0, U - gang]) carve(ctx, f.box(u, first, u + gang - 1, last));
}

/** Sengesaler: lange, åpne saler med senger langs veggene, og venterom innimellom. */
export function nightingale(ctx, rect) {
  bands(ctx, rect, {
    depth: [8, 10],
    gang: 3,
    row: (f, strip, dir) => roomRow(ctx, strip, f.across(dir), { width: [13, 18], kind: (r) => (r() < 0.8 ? 'nightingale' : 'waiting') }),
  });
}

/** Operasjonsfløy: flislagte stuer bak glass, med små vaskerom imellom. */
export function surgery(ctx, rect) {
  const lines = [];
  bands(ctx, rect, {
    depth: [7, 8],
    gang: 3,
    row: (f, strip, dir, wall) => {
      const rooms = roomRow(ctx, strip, f.across(dir), { width: [6, 9], kind: (r) => (r() < 0.75 ? 'theatre' : 'scrub') });
      lines.push(...rooms.map(({ rect: r }) => [f, r, wall]));
    },
  });
  ctx.after.push(() => {
    for (const [f, r, wall] of lines) {
      if (ctx.level.tiles[r.z0 * ctx.level.w + r.x0] === 0) continue;
      const [x0, z0] = f.along(1)[0] ? [r.x0, f.at(0, wall)[1]] : [f.at(0, wall)[0], r.z0];
      glaze(ctx, x0, z0, f.along(1), f.along(1)[0] ? r.x1 - r.x0 + 1 : r.z1 - r.z0 + 1);
    }
  });
}

/** Isolat: lange, svake ganger med små, lukkede rom tett i tett. */
export function isolation(ctx, rect) {
  bands(ctx, rect, {
    depth: [4, 4],
    gang: 2,
    row: (f, strip, dir) => roomRow(ctx, strip, f.across(dir), { width: [3, 3], kind: 'cell', locked: true }),
  });
}

/** Likhus: kalde, flislagte rom med skuffer langs veggene. */
export function morgue(ctx, rect) {
  bands(ctx, rect, {
    depth: [5, 7],
    gang: 2,
    row: (f, strip, dir) => roomRow(ctx, strip, f.across(dir), { width: [7, 11], kind: 'morgue', locked: true }),
  });
}
