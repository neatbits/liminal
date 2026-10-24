// Stupebrett ved noen av bassengene (Poolrooms): foten på kanten, brettet rett ut over vannet, og
// dypere vann der man lander. Store bassenger kan få to. Ren logikk.
import { TILE, getTile } from '../core/level.js';
import { FACING, objectFits } from '../core/objects.js';
import { ceilingAt, depthAt } from '../core/heights.js';
import { fillZone } from '../core/zones.js';
import { basins } from './variety.js';
import { pillarContains } from '../core/pillars.js';

const AHEAD = 6; // vannruter rett fram (brettet rekker ca. 4 m ut, resten er til å lande)
const DEEP = 2.8; // dybden der man lander (m)
const HEADROOM = 2.9; // takhøyde over brettet (står man på det, er hodet ca. 2,6 m oppe)
const MIN_BASIN = 30; // vannruter

/** Kan et brett stå i gulvruten (x, z) og peke i retning (dx, dz) ut over bassenget `inBasin`? */
function spot(level, x, z, dx, dz, inBasin) {
  if (getTile(level, x, z) !== TILE.FLOOR || getTile(level, x - dx, z - dz) !== TILE.FLOOR) return false;
  for (let k = 1; k <= AHEAD; k++) {
    const cx=x+dx*k,cz=z+dz*k;
    if (!inBasin(cx,cz)||getTile(level,cx,cz)!==TILE.WATER||pillarContains(level,cx+.5,cz+.5,.5)) return false;
  }
  for (let k = 0; k <= 4; k++) if (ceilingAt(level, x + dx * k, z + dz * k) < HEADROOM) return false;
  return true;
}

/** Vannet der man lander blir dypt: 3 ruter bredt, fra 2 til AHEAD ruter ut. */
function deepEnd(level, x, z, dx, dz, inBasin) {
  const cells = [];
  for (let k = 2; k <= AHEAD; k++) {
    for (let s = -1; s <= 1; s++) {
      const [cx, cz] = [x + dx * k + dz * s, z + dz * k + dx * s];
      if (inBasin(cx, cz) && depthAt(level, cx, cz) < DEEP) cells.push(cz * level.w + cx);
    }
  }
  if (cells.length) fillZone(level, 'depth', cells, DEEP);
}

/**
 * Setter stupebrett ved noen av bassengene: hvert basseng (minst MIN_BASIN ruter) får ett med
 * sjansen `chance`, og et til med sjansen `second` (minst 4 ruter fra det første). deepEnds: vannet
 * der man lander blir dypt. Returnerer antall.
 */
export function addDivingBoards(level, rand, { chance = 0.5, second = 0.35, deepEnds = true } = {}) {
  let placed = 0;
  for (const cells of basins(level)) {
    if (cells.length < MIN_BASIN || rand() >= chance) continue;
    const set = new Set(cells);
    const inBasin = (x, z) => x >= 0 && z >= 0 && x < level.w && z < level.h && set.has(z * level.w + x);
    const spots = [];
    for (const c of cells) {
      const [wx, wz] = [c % level.w, Math.floor(c / level.w)];
      // Gulvruten bak vannruten, med brettet pekende inn over vannet.
      FACING.forEach(([dx, dz], rot) => {
        const [x, z] = [wx - dx, wz - dz];
        if (spot(level, x, z, dx, dz, inBasin)) spots.push({ x, z, rot, dx, dz });
      });
    }
    const boards = [];
    const want = rand() < second ? 2 : 1;
    while (spots.length && boards.length < want) {
      const s = spots.splice(Math.floor(rand() * spots.length), 1)[0];
      if (boards.some((b) => Math.hypot(b.x - s.x, b.z - s.z) < 4)) continue;
      const o = { id: 'divingboard', x: s.x, z: s.z, rot: s.rot };
      const next = [...(level.objects ?? []), o];
      if (!objectFits({ ...level, objects: next }, o, next)) continue;
      level.objects = next;
      if (deepEnds) deepEnd(level, s.x, s.z, s.dx, s.dz, inBasin);
      boards.push(s);
      placed++;
    }
  }
  return placed;
}
