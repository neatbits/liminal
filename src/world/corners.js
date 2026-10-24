// Geometrien for skrå og avrundede hjørner (core/corners.js): gulv og tak over den åpne delen av
// ruten, og veggen langs grensen (rett eller buet), vendt mot det åpne. Veggtopp over den massive
// delen for oversikten. Ren logikk – lager MeshData med bakt lys.
import { TILE } from '../core/level.js';
import { faceQuad } from './mesher.js';

const UP = [0, 1, 0];
const DOWN = [0, -1, 0];

// Som de vanlige gulv- og takflatene (surfaces.js): taket får halvparten av det direkte lyset, og
// begge mørkner litt inn mot veggen (langs grensen).
const CEILING_GAIN = 0.5;
const FLOOR_EDGE = 0.88;
const CEILING_EDGE = 0.8;

/**
 * Vifte av trekanter fra poly[0] over resten av punktene, i høyden y (normal opp eller ned). gain:
 * lysstyrken, edge: ekstra mørkning i punktene langs veggen (alle unntatt midtpunktet).
 */
export function fan(mesh, poly, y, n, gain = 1, edge = 1) {
  const [c, ...rest] = poly;
  for (let i = 0; i + 1 < rest.length; i++) {
    const pts = [c, rest[i], rest[i + 1], rest[i + 1]].map(([x, z]) => [x, y, z]);
    const ao = [gain, gain * edge, gain * edge, gain * edge];
    faceQuad(mesh, pts, n, pts.map(([x, , z]) => [x, z]), null, ao);
  }
}

/**
 * Grensen må gå fra venstre mot høyre sett fra det åpne. UV følger lengden av hele grensen,
 * ikke separate, snudde segmenter. spans: [{ lo, hi, base }], som for de andre veggene (openSpans).
 */
function boundaryWall(mesh, boundary, spans, wallUV) {
  let u = 0;
  for (let i = 0; i + 1 < boundary.length; i++) {
    const [a, b] = [boundary[i], boundary[i + 1]];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = [-(b[1] - a[1]) / len, 0, (b[0] - a[0]) / len];
    const [uL, uR] = wallUV?.(a, b) ?? [u, u + len];
    for (const sp of spans) mesh.wall(a[0], a[1], b[0], b[1], n, uL, uR, sp.lo, sp.hi, [1, 1], undefined, sp.base);
    u += len;
  }
}

/** Korteste avstand fra (x, z) til banen (polylinje). */
function distanceTo(path, x, z) {
  let best = Infinity;
  for (let i = 0; i + 1 < path.length; i++) {
    const [[ax, az], [bx, bz]] = [path[i], path[i + 1]];
    const [dx, dz] = [bx - ax, bz - az];
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}

/**
 * Som fan, men hver trekant er delt i S × S, og hvert punkt får skyggen fra rutenettet (samme som
 * nabogulvet, surfaces.js) – mørkere inn mot den formede veggen, like sterkt som mot en vanlig vegg.
 * Kantene mot naboene får dermed de samme punktene og verdiene som naborutene: ingen skjøt i lyset.
 * @param shade { ao(x, z), edge, full }: rutenettskyggen, skyggen ved veggen og full styrke
 */
function shadedFan(mesh, poly, boundary, y, n, S, shade) {
  const [c, ...rest] = poly;
  // Kantene mot naborutene (første og siste side i vifta): bare rutenettskyggen, som naboen bruker.
  const shared = (x, z) => distanceTo([c, rest[0]], x, z) < 1e-6 || distanceTo([c, rest[rest.length - 1]], x, z) < 1e-6;
  const ao = ([x, , z]) => {
    const grid = shade.ao(x, z);
    if (shared(x, z)) return grid;
    return Math.min(grid, shade.edge + (shade.full - shade.edge) * Math.min(1, distanceTo(boundary, x, z) / 0.25));
  };
  for (let k = 0; k + 1 < rest.length; k++) {
    const [p, q] = [rest[k], rest[k + 1]];
    const at = (i, j) => [c[0] + ((p[0] - c[0]) * i + (q[0] - c[0]) * j) / S, y, c[1] + ((p[1] - c[1]) * i + (q[1] - c[1]) * j) / S];
    const tri = (a, b, d) => {
      const pts = [a, b, d, d];
      faceQuad(mesh, pts, n, pts.map(([x, , z]) => [x, z]), null, pts.map(ao));
    };
    for (let i = 0; i < S; i++) {
      for (let j = 0; i + j < S; j++) {
        tri(at(i, j), at(i + 1, j), at(i, j + 1));
        if (i + j < S - 1) tri(at(i + 1, j), at(i + 1, j + 1), at(i, j + 1));
      }
    }
  }
}

/**
 * Bygger en formet rute. Gulvruten (own FLOOR): gulv og tak bare over den åpne delen, og veggkilen
 * vendt mot rommet. Veggruten (own WALL): gulv og tak over hjørnet som er åpnet, og veggen vendt ut.
 * @param meshes { floor, ceiling, wall } MeshData, spans: høydene til veggen (som openSpans)
 * @param shade { S, floor, ceiling } fra surfaces.js (se shadedFan); uten: enkel vifte
 */
export function buildCorner(shape, meshes, spans, wallUV, shade = null) {
  const { fy, cy } = shape;
  const open = shape.own === TILE.FLOOR ? shape.far : shape.near;
  if (shade) {
    shadedFan(meshes.floor, open, shape.boundary, fy, UP, shade.S, shade.floor);
    shadedFan(meshes.ceiling, open, shape.boundary, cy, DOWN, shade.S, shade.ceiling);
  } else {
    fan(meshes.floor, open, fy, UP, 1, FLOOR_EDGE);
    fan(meshes.ceiling, open, cy, DOWN, CEILING_GAIN, CEILING_EDGE);
  }
  // Snu hele banen for innvendige hjørner, slik at nabosegmentene deler samme UV ved skjøten.
  const boundary = shape.own === TILE.FLOOR ? [...shape.boundary].reverse() : shape.boundary;
  boundaryWall(meshes.wall, boundary, spans, wallUV);
}

/** Veggtopp (oversikten) over den massive delen av ruten, i høyden y. */
export function cornerCap(mesh, shape, y) {
  fan(mesh, shape.own === TILE.FLOOR ? shape.near : shape.far, y, UP);
}
