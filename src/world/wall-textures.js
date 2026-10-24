// Kontinuerlige teksturkoordinater over formede hjørner og rette vegger som møter dem.
// Ren logikk: samme meterskala og retning som MeshData.wall, uten nye geometri-/tegnepass.
import { TILE, getTile, inBounds } from '../core/level.js';
import { cornerShape, sideOpened } from '../core/corners.js';
import { SIDES } from './caps.js';

const pointKey = ([x, z]) => `${x.toFixed(6)},${z.toFixed(6)}`;
const edgeKey = (a, b) => `${pointKey(a)}|${pointKey(b)}`;
const straight = (a, b) => Math.abs(a.dx * b.dz - a.dz * b.dx) < 1e-6 && a.dx * b.dx + a.dz * b.dz > 0;

/** Oppslag (L, R) → [uL, uR], eller undefined for vegger uten formede hjørner i samme løp. */
export function wallTextureMap(level) {
  const shapes = new Map();
  for (let i = 0; i < level.corners.length; i++) {
    if (!level.corners[i]) continue;
    const shape = cornerShape(level, i % level.w, Math.floor(i / level.w));
    if (shape) shapes.set(i, shape);
  }
  const uv = new Map();
  if (!shapes.size) return () => undefined;
  const edges = [];
  const starts = new Map();
  const ends = new Map();
  const add = (a, b, shaped, u = 0) => {
    const [dx, dz] = [b[0] - a[0], b[1] - a[1]];
    const edge = { a, b, dx, dz, shaped, u, len: Math.hypot(dx, dz) };
    edges.push(edge);
    for (const [map, p] of [[starts, a], [ends, b]]) {
      const key = pointKey(p);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(edge);
    }
  };
  for (let z = 0; z < level.h; z++) {
    for (let x = 0; x < level.w; x++) {
      const shape = shapes.get(z * level.w + x);
      if (shape) {
        const path = shape.own === TILE.FLOOR ? [...shape.boundary].reverse() : shape.boundary;
        for (let i = 0; i + 1 < path.length; i++) add(path[i], path[i + 1], true);
      }
      if (getTile(level, x, z) === TILE.WALL) continue;
      for (const s of SIDES) {
        const [nx, nz] = [x + s.dx, z + s.dz];
        if (getTile(level, nx, nz) !== TILE.WALL || sideOpened(shape, s.dx, s.dz)) continue;
        if (inBounds(level, nx, nz) && sideOpened(shapes.get(nz * level.w + nx), -s.dx, -s.dz)) continue;
        const [a, b] = [[x + s.L[0], z + s.L[1]], [x + s.R[0], z + s.R[1]]];
        add(a, b, false, a[0] * s.ux + a[1] * s.uz);
      }
    }
  }
  // Skarpe hjørner og tvetydige forgreninger avslutter løpet. Buen får med seg rette
  // nabovegger helt til neste slike brudd; dermed kuttes ikke et motiv ved buens ender.
  for (const edge of edges) {
    const at = pointKey(edge.b);
    const candidates = starts.get(at);
    if (candidates?.length !== 1 || ends.get(at).length !== 1) continue;
    const next = candidates[0];
    if (!edge.shaped && !next.shaped && !straight(edge, next)) continue;
    edge.next = next;
    next.prev = edge;
  }
  const visited = new Set();
  for (const edge of edges) {
    if (!edge.shaped || visited.has(edge)) continue;
    let start = edge;
    const back = new Set([edge]);
    while (start.prev && !back.has(start.prev)) {
      start = start.prev;
      back.add(start);
    }
    // Helt avrundede, lukkede løp må ha én skjøt. Legg den på en rett vegg fremfor i buen.
    if (start.prev) start = [...back].find((e) => !e.shaped) ?? start;
    let u = start.u;
    for (let e = start; e && !visited.has(e); e = e.next) {
      uv.set(edgeKey(e.a, e.b), [u, u + e.len]);
      u += e.len;
      visited.add(e);
    }
  }
  return (a, b) => uv.get(edgeKey(a, b));
}
