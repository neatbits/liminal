// Planløsningene i kontoret (valgt i gen/layouts.js): åpent landskap, cellekontorer rundt en kjerne,
// konferanseetasje med glassvegger og arkiv. Hver tar (ctx, rect); båser og møbler settes inn av
// gen/cubicles.js og gen/furnish-rooms.js. Ren logikk.
import { frame, carve, door, roomRow, glaze } from './floorplan.js';

const SERVICE = (rand) => ['meeting', 'kitchen', 'copy', 'wc'][Math.floor(rand() * 4)];

/** Åpent landskap: en stor flate med båser, og en rad med små rom langs den ene siden. */
export function open(ctx, rect) {
  const f = frame(rect);
  carve(ctx, f.box(0, 5, f.U - 1, f.V - 1), 'cubicles');
  roomRow(ctx, f.box(0, 0, f.U - 1, 3), f.across(1), { width: [4, 6], kind: SERVICE });
}

/** Cellekontorer: små kontorer ytterst, en ringgang, og en kjerne med heis, toalett og kopirom. */
export function cells(ctx, rect) {
  const f = frame(rect);
  const { U, V } = f;
  const office = { width: [4, 5], kind: 'office' };
  roomRow(ctx, f.box(0, 0, U - 1, 4), f.across(1), office);
  roomRow(ctx, f.box(0, V - 5, U - 1, V - 1), f.across(-1), office);
  roomRow(ctx, f.box(0, 6, 4, V - 7), f.along(1), office);
  roomRow(ctx, f.box(U - 5, 6, U - 1, V - 7), f.along(-1), office);
  for (const [v0, v1] of [[6, 7], [V - 8, V - 7]]) carve(ctx, f.box(6, v0, U - 7, v1));
  for (const [u0, u1] of [[6, 7], [U - 8, U - 7]]) carve(ctx, f.box(u0, 6, u1, V - 7));
  const [a, b] = [Math.floor(U / 2) - 3, Math.floor(U / 2) + 2];
  carve(ctx, f.box(9, 9, a - 1, V - 10), 'wc');
  carve(ctx, f.box(a + 1, 9, b - 1, V - 10), 'lifts');
  carve(ctx, f.box(b + 1, 9, U - 10, V - 10), 'copy');
  // Heisen er åpen mot gangen på begge sider; de andre rommene har dør.
  for (const v of [8, V - 9]) carve(ctx, f.box(a + 2, v, b - 2, v));
  door(ctx, ...f.at(Math.floor((9 + a) / 2), 8));
  door(ctx, ...f.at(Math.floor((b + U - 10) / 2), V - 9));
}

/** Konferanseetasje: brede ganger med store møterom bak glassvegger på begge sider. */
export function conference(ctx, rect) {
  const f = frame(rect);
  const { U, V } = f;
  // Så mange bånd som får plass med rom på minst fem ruter, og så dypere rom.
  const bands = Math.max(1, Math.floor((V + 1) / 16));
  const depth = Math.min(9, Math.floor(((V + 1) / bands - 6) / 2));
  const band = depth * 2 + 5;
  const top = Math.floor((V - (bands * (band + 1) - 1)) / 2);
  const inset = bands > 1 ? 4 : 0; // gangene på tvers
  let [first, last] = [0, 0];
  const lines = [];
  for (let b = 0; b < bands; b++) {
    const v0 = top + b * (band + 1);
    const cv = v0 + depth + 1;
    if (!b) first = cv;
    last = cv + 2;
    carve(ctx, f.box(0, cv, U - 1, cv + 2));
    for (const [strip, dir, wall] of [[f.box(inset, v0, U - 1 - inset, cv - 2), 1, cv - 1], [f.box(inset, cv + 4, U - 1 - inset, cv + 3 + depth), -1, cv + 3]]) {
      for (const { rect: r } of roomRow(ctx, strip, f.across(dir), { width: [8, 11], kind: 'meeting' })) lines.push([r, wall]);
    }
  }
  if (bands > 1) for (const u of [0, U - 3]) carve(ctx, f.box(u, first, u + 2, last));
  ctx.after.push(() => {
    for (const [r, wall] of lines) {
      const horizontal = f.along(1)[0] !== 0;
      const [x, z] = f.at(horizontal ? r.x0 - rect.x0 : r.z0 - rect.z0, wall);
      glaze(ctx, x, z, f.along(1), (horizontal ? r.x1 - r.x0 : r.z1 - r.z0) + 1);
    }
  });
}

/** Arkiv: en gang gjennom bygget, og store, mørke saler med rader av hyller. */
export function archive(ctx, rect) {
  const f = frame(rect);
  const { U, V } = f;
  const cv = Math.floor(V / 2) - 1;
  carve(ctx, f.box(0, cv, U - 1, cv + 1));
  const halls = { width: [10, 15], kind: 'archive' };
  roomRow(ctx, f.box(0, 0, U - 1, cv - 2), f.across(1), halls);
  roomRow(ctx, f.box(0, cv + 3, U - 1, V - 1), f.across(-1), halls);
}
