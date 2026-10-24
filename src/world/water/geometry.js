// Vannflaten som rene data. Posisjonene ligger i et lokalt XY-plan (normal +Z), slik
// three.js' Reflector/Refractor forventer – meshet roteres -90° om X og løftes til vannhøyden.
// Lokal (x, y) = verden (x, -z).
import { WATER_SURFACE } from '../../core/level.js';
import { floorAt } from '../../core/heights.js';
import { waterCell } from '../../core/pillar-water.js';
import { pillarContains } from '../../core/pillars.js';

const SUBDIVIDE = 2;
const UNLIT = [1, 1, 1, 0, 0, 0, 0];

/** 1 når alle ruter rundt punktet er vann, ellers 0 (demper forvrengning ved kanten). */
export function waterEdge(level, x, z) {
  if (pillarContains(level, x, z, .2)) return 0;
  for (const [ox, oz] of [
    [-0.25, -0.25],
    [0.25, -0.25],
    [-0.25, 0.25],
    [0.25, 0.25],
  ]) {
    if (!waterCell(level, Math.floor(x + ox), Math.floor(z + oz))) return 0;
  }
  return 1;
}

/**
 * @returns {{ pos, light, flick, edge, depth, index, vertexCount }}
 *          depth = vannsøylen under flaten i ruten (m), for dybdeavhengig farge.
 */
export function buildWaterData(level, field = null) {
  const out = { pos: [], light: [], flick: [], edge: [], depth: [], index: [], vertexCount: 0 };
  let column = 0;
  const vertex = (x, z) => {
    out.pos.push(x, -z, 0);
    const s = field ? field.sample(x, WATER_SURFACE, z, 0, 1, 0) : UNLIT;
    out.light.push(s[0], s[1], s[2]);
    out.flick.push(s[3], s[4], s[5], s[6]);
    out.edge.push(waterEdge(level, x, z));
    out.depth.push(column);
    return out.vertexCount++;
  };
  for (let cz = 0; cz < level.h; cz++) {
    for (let cx = 0; cx < level.w; cx++) {
      if (!waterCell(level, cx, cz)) continue;
      column = WATER_SURFACE - floorAt(level, cx, cz);
      for (let j = 0; j < SUBDIVIDE; j++) {
        for (let i = 0; i < SUBDIVIDE; i++) {
          const x0 = cx + i / SUBDIVIDE;
          const x1 = cx + (i + 1) / SUBDIVIDE;
          const z0 = cz + j / SUBDIVIDE;
          const z1 = cz + (j + 1) / SUBDIVIDE;
          // Mot klokken sett fra +Z lokalt (= ovenfra i verden).
          const a = vertex(x0, z0);
          const b = vertex(x0, z1);
          const c = vertex(x1, z1);
          const d = vertex(x1, z0);
          out.index.push(a, b, c, a, c, d);
        }
      }
    }
  }
  return out;
}
