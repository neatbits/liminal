// Nøkkeltall for sidepanelet. Ren logikk.
import { TILE, LIGHT } from './level.js';
import { ceilingAt, floorAt, topFloorAt, depthAt } from './heights.js';

function span(range, v) {
  range[0] = Math.min(range[0], v);
  range[1] = Math.max(range[1], v);
}

/**
 * Areal, volum, tak-, gulv- og dybdespenn og antall lys. Takspennet regnes uten
 * døråpninger og trapper, dybdespennet bare for vann og gulvspennet bare for vanlig gulv.
 */
export function levelStats(level) {
  let floor = 0;
  let water = 0;
  let volume = 0;
  const ceil = [Infinity, -Infinity];
  const depth = [Infinity, -Infinity];
  const raised = [Infinity, -Infinity];
  const lights = [0, 0, 0, 0];
  for (let i = 0; i < level.tiles.length; i++) {
    const t = level.tiles[i];
    lights[level.lights[i]]++;
    if (t === TILE.WALL) continue;
    const x = i % level.w;
    const z = (i / level.w) | 0;
    const c = ceilingAt(level, x, z);
    floor++;
    const f = floorAt(level, x, z);
    volume += c - (t === TILE.STAIRS ? (f + topFloorAt(level, x, z)) / 2 : f);
    if (t !== TILE.DOOR && t !== TILE.STAIRS) span(ceil, c);
    if (t === TILE.WATER) {
      water++;
      span(depth, depthAt(level, x, z));
    } else if (t !== TILE.STAIRS) {
      span(raised, floorAt(level, x, z));
    }
  }
  return {
    floorArea: floor,
    waterArea: water,
    volume: Math.round(volume),
    ceiling: Number.isFinite(ceil[0]) ? ceil : [level.height, level.height],
    depth: Number.isFinite(depth[0]) ? depth : null,
    floor: Number.isFinite(raised[0]) ? raised : [0, 0],
    lights: lights[LIGHT.ON] + lights[LIGHT.FLICKER] + lights[LIGHT.BROKEN],
    flicker: lights[LIGHT.FLICKER],
    broken: lights[LIGHT.BROKEN],
  };
}
