// Korridorbygg (skolen, sykehuset): bånd med rom på begge sider av lange korridorer, og en
// tverrkorridor i hver ende som binder båndene sammen – man kan gå i ring. Rommene får dører
// mot korridoren. Ren logikk.
import { TILE } from '../core/level.js';
import { autoLights, rectIndices } from '../core/ops.js';
import { fillZone, FINISH } from '../core/zones.js';
import { randInt } from '../core/rng.js';
import { getTheme } from '../core/themes.js';
import { fillRect } from './util.js';
import { hangDoors } from './doors.js';

/**
 * @param o corridor: bredde, depth: [min, maks] romdybde, width: [min, maks] rombredde,
 *          lockers: korridorene får belegg (temaet tegner det som skap), baths: andel små,
 *          flislagte rom (bad), doors: { closed, ajar, open }
 */
export function corridorBuilding(level, rand, o) {
  const { w, h } = level;
  const cw = o.corridor;
  // Så mange bånd som får plass med minste romdybde, og så dypere rom om det er plass til det.
  const fixed = 1 + cw + 1 + 1; // vegg, korridor, vegg og skilleveggen mot neste bånd
  const bands = Math.max(1, Math.floor((h - 1) / (2 * o.depth[0] + fixed)));
  const depth = Math.max(o.depth[0], Math.min(o.depth[1], Math.floor(((h - 1) / bands - fixed) / 2), randInt(rand, ...o.depth)));
  const band = depth + 1 + cw + 1 + depth;
  const z0 = 1 + Math.floor((h - 2 - (bands * (band + 1) - 1)) / 2);
  // Tverrkorridorer i begge ender (bare én om huset er smalt).
  const xs = 1;
  const xe = w - 1 - cw;
  const ends = w >= 30 ? [xs, xe] : [xs];
  const top = z0;
  const bottom = z0 + bands * (band + 1) - 2;
  const corridors = [];
  for (const x of ends) fillRect(level, x, top, x + cw - 1, bottom, TILE.FLOOR);
  for (const x of ends) corridors.push({ x0: x, z0: top, x1: x + cw - 1, z1: bottom });
  const doors = [];
  const roomX0 = xs + cw + 1;
  const roomX1 = (ends.length > 1 ? xe : w - 1) - 2;
  for (let b = 0; b < bands; b++) {
    const bz = z0 + b * (band + 1);
    const cz = bz + depth + 1; // korridorens øverste rad
    fillRect(level, xs, cz, ends.length > 1 ? xe : w - 2, cz + cw - 1, TILE.FLOOR);
    corridors.push({ x0: xs, z0: cz, x1: ends.length > 1 ? xe : w - 2, z1: cz + cw - 1 });
    // Rom over og under korridoren.
    for (const [r0, r1, wallZ] of [
      [bz, bz + depth - 1, cz - 1],
      [cz + cw + 1, cz + cw + depth, cz + cw],
    ]) {
      let a = roomX0;
      while (a <= roomX1) {
        const small = rand() < (o.baths ?? 0);
        let e = a + (small ? randInt(rand, 2, 3) : randInt(rand, ...o.width)) - 1;
        if (roomX1 - e < 3) e = roomX1;
        fillRect(level, a, r0, e, r1, TILE.FLOOR);
        const door = randInt(rand, a, e);
        fillRect(level, door, wallZ, door, wallZ, TILE.DOOR);
        doors.push([door, wallZ]);
        if (small) fillZone(level, 'finish', rectIndices(level, { x0: a, z0: r0, x1: e, z1: r1 }), FINISH.TILES);
        a = e + 2;
      }
    }
  }
  if (o.lockers) for (const c of corridors) fillZone(level, 'finish', rectIndices(level, c), FINISH.TILES);
  autoLights(level, { spacing: getTheme(level.theme).lightSpacing, rand, flicker: 0.04, broken: 0.04 });
  hangDoors(level, rand, { ...o.doors, cells: doors });
  return { corridors, doors };
}

/** Skolen: brede korridorer med skap, klasserom på begge sider med dørene åpne eller på gløtt. */
export function school(level, rand) {
  corridorBuilding(level, rand, { corridor: 3, depth: [6, 8], width: [6, 9], lockers: true, doors: { closed: 0.2, ajar: 0.35, open: 0.45 } });
}

/** Sykehuset: lange ganger, pasientrom og små bad, de fleste dørene lukket. */
export function ward(level, rand) {
  corridorBuilding(level, rand, { corridor: 3, depth: [5, 6], width: [4, 5], baths: 0.2, doors: { closed: 0.55, ajar: 0.3, open: 0.15 } });
}
