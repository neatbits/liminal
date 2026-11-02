// Lights out (view3d/lights-out.js): strømmen er borte på hvert nivå, og sikringsskap på veggene slår den
// på igjen, ett om gangen. Skapene henger på en vegg ved en gulvrute man kan gå til, langt fra der man
// starter og fra hverandre. Ren logikk – meshene lages i view3d/fuses.js.
import { TILE } from '../core/level.js';
import { floorAt } from '../core/heights.js';
import { footprintCells } from '../core/object-pose.js';
import { reachableCells } from './tapes.js';

export const DARK_POWER = 0.05; // som et strømbrudd (view3d/events.js DARK)
export const FUSE_HEIGHT = 1.3; // midten av skapet over gulvet
const SIDES = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const LADDER_ROOM = 2.5; // m: ved en stige eller et hull er E for klatring (view3d/walkmode.js)

/** Hvor mange skap et nivå får: ett per ca. 350 m² gulv, 2–4. */
export function fuseCount(level) {
  let open = 0;
  for (const t of level.tiles) if (t === TILE.FLOOR) open++;
  return Math.max(2, Math.min(4, Math.round(open / 350)));
}

/** Strømmen når `on` av `total` skap er slått på: litt lys for hvert, fullt når alle er på. */
export function fusePower(on, total) {
  return on >= total ? 1 : DARK_POWER + ((1 - DARK_POWER) * on) / total;
}

/**
 * Skapene: [{ x, z, wall: [dx, dz], px, y, pz }] – ruten man står i, veggen skapet henger på, og midten
 * av skapet. Hvert nytt skap er det som ligger lengst unna startpunktet og skapene før (blant et
 * tilfeldig utvalg, så nivåene varierer).
 */
export function placeFuses(level, spawn, rand, count = fuseCount(level)) {
  const reach = spawn ? reachableCells(level, spawn.x, spawn.z) : null;
  const climbs = [...(level.ladders ?? []), ...(level.holes ?? [])]; // i etasjene fra walkLevels
  const spots = [];
  const occupied = footprintCells(level);
  for (let z = 1; z < level.h - 1; z++) {
    for (let x = 1; x < level.w - 1; x++) {
      const i = z * level.w + x;
      if (level.tiles[i] !== TILE.FLOOR || (reach && !reach[i])) continue; // også hevet gulv og under galleriene
      if (occupied.has(i) || climbs.some((l) => Math.hypot(l.x - x, l.z - z) < LADDER_ROOM)) continue;
      for (const [dx, dz] of SIDES) {
        const j = (z + dz) * level.w + x + dx;
        if (level.tiles[j] !== TILE.WALL || level.meta[j] & 1) continue; // ikke vinduer
        spots.push({ x, z, wall: [dx, dz] });
      }
    }
  }
  const out = [];
  const taken = spawn ? [[spawn.x, spawn.z]] : [];
  const sample = Math.min(spots.length, 60);
  while (out.length < count && spots.length) {
    let best = null;
    let far = -1;
    for (let k = 0; k < sample; k++) {
      const s = spots[Math.floor(rand() * spots.length)];
      const d = Math.min(...taken.map(([tx, tz]) => Math.hypot(s.x + 0.5 - tx, s.z + 0.5 - tz)), Infinity);
      if (d > far) [best, far] = [s, d];
    }
    if (!best || (out.length && far < 3)) break;
    const [dx, dz] = best.wall;
    out.push({ ...best, px: best.x + 0.5 + dx * 0.44, y: floorAt(level, best.x, best.z) + FUSE_HEIGHT, pz: best.z + 0.5 + dz * 0.44 });
    taken.push([best.x + 0.5, best.z + 0.5]);
  }
  return out;
}

/** Dørene til ingensteds er låst så lenge et skap er av (drømmegangen slipper gjennom, som med kassettene). */
export const fusesLocked = ({ left, drifting = false }) => left > 0 && !drifting;
