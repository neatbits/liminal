// Planløsningene på skolen (valgt i gen/layouts.js): klasseromsfløy, gymsal, aula, bibliotek og kantine. Ren logikk.
import { randInt } from '../core/rng.js';
import { rectIndices } from '../core/ops.js';
import { FINISH, fillZone } from '../core/zones.js';
import { frame, carve, raise, roomRow, note } from './floorplan.js';

const DEPTH = [6, 8]; // klasserommene

/** Gulvet stiger i rader fra forkanten mot [dx, dz]: tribuner og sal. */
function terraces(ctx, rect, [dx, dz], rise) {
  const { level } = ctx;
  let top = 0;
  for (const i of rectIndices(level, rect)) {
    const [x, z] = [i % level.w, Math.floor(i / level.w)];
    const row = dx > 0 ? x - rect.x0 : dx < 0 ? rect.x1 - x : dz > 0 ? z - rect.z0 : rect.z1 - z;
    level.floors[i] = Math.round((row + 1) * rise * 10);
    top = Math.max(top, level.floors[i] / 10);
  }
  return top;
}

/** Klasseromsfløy: brede ganger med skap, og klasserom på begge sider. */
export function classrooms(ctx, rect) {
  const f = frame(rect);
  const { U, V } = f;
  const bands = Math.max(1, Math.floor((V + 1) / (DEPTH[0] * 2 + 6)));
  const depth = Math.min(DEPTH[1], Math.floor(((V + 1) / bands - 6) / 2));
  const pitch = depth * 2 + 6;
  const top = Math.floor((V - (bands * pitch - 1)) / 2);
  const inset = bands > 1 ? 4 : 0;
  let [first, last] = [0, 0];
  const halls = [];
  for (let b = 0; b < bands; b++) {
    const v0 = top + b * pitch;
    const cv = v0 + depth + 1;
    if (!b) first = cv;
    last = cv + 2;
    halls.push(carve(ctx, f.box(0, cv, U - 1, cv + 2)));
    roomRow(ctx, f.box(inset, v0, U - 1 - inset, cv - 2), f.across(1), { width: [6, 9], kind: 'classroom' });
    roomRow(ctx, f.box(inset, cv + 4, U - 1 - inset, cv + 3 + depth), f.across(-1), { width: [6, 9], kind: 'classroom' });
  }
  if (bands > 1) for (const u of [0, U - 3]) halls.push(carve(ctx, f.box(u, first, u + 2, last)));
  for (const r of halls) fillZone(ctx.level, 'finish', rectIndices(ctx.level, r), FINISH.TILES); // temaet tegner belegget som skap
}

/** Gymsal: høy sal med tribune langs den ene siden, og garderober med skap langs den andre. */
export function gym(ctx, rect) {
  const { rand } = ctx;
  const f = frame(rect);
  const { U, V } = f;
  const hall = carve(ctx, f.box(0, 6, U - 1, V - 1), 'gym');
  terraces(ctx, f.box(0, V - 4, U - 1, V - 1), f.across(1), 0.4);
  raise(ctx, hall, 6.5 + randInt(rand, 0, 15) / 10);
  roomRow(ctx, f.box(0, 0, U - 1, 4), f.across(1), { width: [6, 9], kind: 'changing' });
}

/** Aula: scene, og en sal der gulvet stiger bakover i lange rader. */
export function auditorium(ctx, rect) {
  const f = frame(rect);
  const { U, V } = f;
  carve(ctx, rect);
  const rows = Math.min(V - 10, 18);
  const stage = f.box(0, 0, U - 1, 4);
  terraces(ctx, f.box(0, 8, U - 1, 7 + rows), f.across(1), 0.3);
  for (const i of rectIndices(ctx.level, stage)) ctx.level.floors[i] = 9;
  const back = rows * 0.3;
  if (V > 8 + rows) for (const i of rectIndices(ctx.level, f.box(0, 8 + rows, U - 1, V - 1))) ctx.level.floors[i] = Math.round(back * 10);
  // Trinn opp på scenen i begge ender.
  for (const u of [0, U - 3]) {
    for (const i of rectIndices(ctx.level, f.box(u, 5, u + 2, 5))) ctx.level.floors[i] = 6;
    for (const i of rectIndices(ctx.level, f.box(u, 6, u + 2, 6))) ctx.level.floors[i] = 3;
  }
  note(ctx, 'seating', f.box(2, 9, U - 3, 7 + rows), { front: f.across(-1) });
  raise(ctx, rect, Math.max(7, back + 4));
}

/** Bibliotek: en høy sal med rader av bokhyller, og små rom langs den ene siden. */
export function library(ctx, rect) {
  const { rand } = ctx;
  const f = frame(rect);
  const { U, V } = f;
  const hall = carve(ctx, f.box(0, 5, U - 1, V - 1), 'library');
  raise(ctx, hall, 4.5 + randInt(rand, 0, 15) / 10);
  roomRow(ctx, f.box(0, 0, U - 1, 3), f.across(1), { width: [5, 7], kind: (r) => (r() < 0.5 ? 'office' : 'storage') });
}

/** Kantine: lange bord i en stor sal, og kjøkken bak disken. */
export function cafeteria(ctx, rect) {
  const { rand } = ctx;
  const f = frame(rect);
  const { U, V } = f;
  const hall = carve(ctx, f.box(0, 6, U - 1, V - 1), 'cafeteria', { front: f.across(1) });
  raise(ctx, hall, 3.5 + randInt(rand, 0, 5) / 10);
  carve(ctx, f.box(0, 0, U - 1, 4), 'kitchen');
  const mid = Math.floor(U / 2);
  carve(ctx, f.box(mid - 2, 5, mid + 2, 5)); // luken mot disken
}
