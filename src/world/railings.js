// Rekkverk i 3D: håndlist som følger trappen, spiler (to per trinn) og stolper der
// rekkverket slutter, og håndlist på veggen langs trapper. Ren logikk – MeshData med bakt lys.
import { TILE, getTile } from '../core/level.js';
import { groundAt } from '../core/heights.js';
import { railSides, RAIL_HEIGHT } from '../core/railings.js';
import { MeshData, faceQuad } from './mesher.js';
import { orientedBox } from './doors.js';
import { stepProfile, surfaceHeight } from './stairs.js';

const INSET = 0.05; // vernets senterlinje innenfor kanten
const WALL_GAP = 0.07; // håndlist på vegg: avstand fra veggen
const RAIL_W = 0.06;
const RAIL_H = 0.05;
const BAR = 0.025;
const POST = 0.09;

/** Bjelke med tverrsnitt w (vannrett) × h (loddrett) mellom senterpunktene a og b. */
export function beam(mesh, a, b, w, h) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const lh = Math.hypot(dx, dz);
  const len = Math.hypot(dx, dy, dz);
  const u = [dx / lh, dz / lh];
  const t = [-u[1], u[0]];
  const P = (p, s, k) => [p[0] + (t[0] * s * w) / 2, p[1] + (k * h) / 2, p[2] + (t[1] * s * w) / 2];
  const [a0, a1, a2, a3] = [P(a, -1, -1), P(a, 1, -1), P(a, 1, 1), P(a, -1, 1)];
  const [b0, b1, b2, b3] = [P(b, -1, -1), P(b, 1, -1), P(b, 1, 1), P(b, -1, 1)];
  // Oversidens normal = tverrvektoren × bjelkeretningen (begge enhetsvektorer, vinkelrette).
  const al = [dx / len, dy / len, dz / len];
  let up = [-t[1] * al[1], t[1] * al[0] - t[0] * al[2], t[0] * al[1]];
  if (up[1] < 0) up = up.map((v) => -v);
  faceQuad(mesh, [a3, a2, b2, b3], up);
  faceQuad(mesh, [a0, a1, b1, b0], up.map((v) => -v));
  faceQuad(mesh, [a1, b1, b2, a2], [t[0], 0, t[1]]);
  faceQuad(mesh, [a0, b0, b3, a3], [-t[0], 0, -t[1]]);
  faceQuad(mesh, [a0, a1, a2, a3], [-u[0], 0, -u[1]]);
  faceQuad(mesh, [b0, b1, b2, b3], [u[0], 0, u[1]]);
}

function post(mesh, p, size, y0, y1) {
  orientedBox(mesh, [p[0] - size / 2, p[1] - size / 2], [1, 0], size, [0, 1], 0, size, y0, y1);
}

/** Kanten på siden (dx, dz) som to punkter [x, z], fra lav til høy koordinat. */
function edge(x, z, dx, dz) {
  if (dx) return [[x + (dx > 0 ? 1 : 0), z], [x + (dx > 0 ? 1 : 0), z + 1]];
  return [[x, z + (dz > 0 ? 1 : 0)], [x + 1, z + (dz > 0 ? 1 : 0)]];
}

/** Fortsetter samme rekkverk inn i naboruten langs kanten (ende 0 eller 1)? */
function continues(level, x, z, side, end) {
  const s = end ? 1 : -1;
  const [nx, nz] = side.dx ? [x, z + s] : [x + s, z];
  return railSides(level, nx, nz).some((r) => r.dx === side.dx && r.dz === side.dz && r.kind === side.kind && r.y === side.y);
}

function railing(out, level, x, z, side) {
  const [E0, E1] = edge(x, z, side.dx, side.dz);
  const off = side.kind === 'guard' ? INSET : WALL_GAP;
  const at = (f) => [E0[0] + (E1[0] - E0[0]) * f - side.dx * off, E0[1] + (E1[1] - E0[1]) * f - side.dz * off];
  // Høyden leses alltid inne i denne ruten: et punkt på rutekanten ville ellers fått naboens
  // høyde, og håndlisten ville stått på skrå.
  const inCell = (p) => [Math.min(x + 0.999, Math.max(x + 0.001, p[0])), Math.min(z + 0.999, Math.max(z + 0.001, p[1]))];
  // Vern på et dekke står i dekkets høyde (side.y), ellers på gulvet/trappen.
  const g = (p) => side.y ?? groundAt(level, ...inCell(p));
  const foot = (p) => side.y ?? surfaceHeight(level, x, z, ...inCell(p));
  const top = (p, lift) => [p[0], g(p) + lift, p[1]];
  const ends = [at(0), at(1)];
  if (side.kind === 'wall') {
    beam(out.rail, top(ends[0], RAIL_HEIGHT - 0.05), top(ends[1], RAIL_HEIGHT - 0.05), 0.045, 0.045);
    for (const f of [0.25, 0.75]) {
      const p = at(f);
      const y = g(p) + RAIL_HEIGHT - 0.1;
      const q = [p[0] + side.dx * WALL_GAP * 0.5, p[1] + side.dz * WALL_GAP * 0.5];
      post(out.rail, q, 0.025, y, y + 0.03);
    }
    return;
  }
  beam(out.rail, top(ends[0], RAIL_HEIGHT), top(ends[1], RAIL_HEIGHT), RAIL_W, RAIL_H);
  const stairs = getTile(level, x, z) === TILE.STAIRS ? stepProfile(level, x, z) : null;
  const count = stairs ? 2 * stairs.n : 4;
  for (let k = 0; k < count; k++) {
    const p = at((k + 0.5) / count);
    post(out.bars, p, BAR, foot(p), g(p) + RAIL_HEIGHT - RAIL_H / 2);
  }
  ends.forEach((p, end) => {
    if (continues(level, x, z, side, end)) return;
    post(out.rail, p, POST, foot(p), g(p) + RAIL_HEIGHT + 0.08);
  });
}

/** @returns {{ rail, bars }} MeshData for håndlister/stolper og spiler */
export function buildRailings(level, field) {
  const out = { rail: new MeshData(field), bars: new MeshData(field) };
  for (let z = 0; z < level.h; z++) {
    for (let x = 0; x < level.w; x++) {
      for (const side of railSides(level, x, z)) railing(out, level, x, z, side);
    }
  }
  return out;
}
