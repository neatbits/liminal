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

/**
 * Bygger en formet rute. Gulvruten (own FLOOR): gulv og tak bare over den åpne delen, og veggkilen
 * vendt mot rommet. Veggruten (own WALL): gulv og tak over hjørnet som er åpnet, og veggen vendt ut.
 * @param meshes { floor, ceiling, wall } MeshData, spans: høydene til veggen (som openSpans)
 */
export function buildCorner(shape, meshes, spans, wallUV) {
  const { fy, cy } = shape;
  const open = shape.own === TILE.FLOOR ? shape.far : shape.near;
  fan(meshes.floor, open, fy, UP, 1, FLOOR_EDGE);
  fan(meshes.ceiling, open, cy, DOWN, CEILING_GAIN, CEILING_EDGE);
  // Snu hele banen for innvendige hjørner, slik at nabosegmentene deler samme UV ved skjøten.
  const boundary = shape.own === TILE.FLOOR ? [...shape.boundary].reverse() : shape.boundary;
  boundaryWall(meshes.wall, boundary, spans, wallUV);
}

/** Veggtopp (oversikten) over den massive delen av ruten, i høyden y. */
export function cornerCap(mesh, shape, y) {
  fan(mesh, shape.own === TILE.FLOOR ? shape.near : shape.far, y, UP);
}
