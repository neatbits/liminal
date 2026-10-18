// Genererer alle flater i rommet som MeshData: gulv, trapper, tak, vegger, basseng, søyler,
// dekker og veggtopper (for oversiktsvisningen). Vegger og søyler bygges per etasje der ruten
// har dekke (se decks.js). Ren logikk – ingen three.js.
import { TILE, getTile, PILLAR_SIZE } from '../core/level.js';
import { floorAt, topFloorAt, ceilingAt, edgeHeight } from '../core/heights.js';
import { MeshData } from './mesher.js';
import { SIDES, addCaps } from './caps.js';
import { buildSteps, surfaceHeight, stepBreaks } from './stairs.js';
import { FINISH } from '../core/zones.js';
import { openSpans, clipSpans, buildDeck } from './decks.js';
import { windowInfo, FRAME } from '../core/windows.js';

const UP = [0, 1, 0];
const DOWN = [0, -1, 0];
const CEILING_GAIN = 0.5;
const STEP = 1e-6;

/** Skygge i et gulv-/takhjørne: teller naboruter som «stenger» rundt punktet. */
function cornerAO(x, z, closes, step) {
  let n = 0;
  for (const [ox, oz] of [
    [-0.25, -0.25],
    [0.25, -0.25],
    [-0.25, 0.25],
    [0.25, 0.25],
  ]) {
    if (closes(Math.floor(x + ox), Math.floor(z + oz))) n++;
  }
  return 1 - n * step;
}

/** @param closes (x, z) → om naboruten «stenger» hjørnet (vegg, lavere tak, høyere gulv) */
function horizontal(mesh, cx, cz, y, S, facingUp, closes, step, gain = 1) {
  for (let j = 0; j < S; j++) {
    for (let i = 0; i < S; i++) {
      const x0 = cx + i / S;
      const x1 = cx + (i + 1) / S;
      const z0 = cz + j / S;
      const z1 = cz + (j + 1) / S;
      const ao = (x, z) => cornerAO(x, z, closes, step) * gain;
      if (facingUp) {
        mesh.quad([x0, y, z0, x0, z0], [x0, y, z1, x0, z1], [x1, y, z1, x1, z1], [x1, y, z0, x1, z0], UP, [
          ao(x0, z0),
          ao(x0, z1),
          ao(x1, z1),
          ao(x1, z0),
        ]);
      } else {
        mesh.quad([x0, y, z0, x0, z0], [x1, y, z0, x1, z0], [x1, y, z1, x1, z1], [x0, y, z1, x0, z1], DOWN, [
          ao(x0, z0),
          ao(x1, z0),
          ao(x1, z1),
          ao(x0, z1),
        ]);
      }
    }
  }
}

function pillar(mesh, cx, cz, y0, y1) {
  const h = PILLAR_SIZE / 2;
  const mx = cx + 0.5;
  const mz = cz + 0.5;
  const faces = [
    { n: [0, 0, -1], L: [mx + h, mz - h], R: [mx - h, mz - h], u: (x, z) => -x },
    { n: [0, 0, 1], L: [mx - h, mz + h], R: [mx + h, mz + h], u: (x) => x },
    { n: [-1, 0, 0], L: [mx - h, mz - h], R: [mx - h, mz + h], u: (x, z) => z },
    { n: [1, 0, 0], L: [mx + h, mz + h], R: [mx + h, mz - h], u: (x, z) => -z },
  ];
  for (const f of faces) {
    mesh.wall(f.L[0], f.L[1], f.R[0], f.R[1], f.n, f.u(...f.L), f.u(...f.R), y0, y1, [1, 1], undefined, y0);
  }
}

/**
 * Sider der denne ruten står høyere enn naboen (hevet gulv, trappevanger): loddrette flater
 * fra naboens overflate opp til vår, vendt mot naboen. Kanten deles der trinn skifter høyde.
 */
function cliffs(mesh, level, cx, cz, s, L, R) {
  const nx = cx + s.dx;
  const nz = cz + s.dz;
  const cuts = [0, 1, ...stepBreaks(level, cx, cz, L, R), ...stepBreaks(level, nx, nz, L, R)].sort((a, b) => a - b);
  const at = (f) => [L[0] + (R[0] - L[0]) * f, L[1] + (R[1] - L[1]) * f];
  const n = [-s.n[0], 0, -s.n[2]];
  for (let k = 0; k < cuts.length - 1; k++) {
    const [a, b] = [cuts[k], cuts[k + 1]];
    if (b - a < 1e-6) continue;
    const [mx, mz] = at((a + b) / 2);
    const mine = surfaceHeight(level, cx, cz, mx - s.dx * 1e-3, mz - s.dz * 1e-3);
    const theirs = surfaceHeight(level, nx, nz, mx + s.dx * 1e-3, mz + s.dz * 1e-3);
    if (mine <= theirs + 1e-4) continue;
    const [ax, az] = at(a);
    const [bx, bz] = at(b);
    // Vendt mot naboen: motsatt omløp av veggene sett innenfra.
    const u = (x, z) => x * s.ux + z * s.uz;
    mesh.wall(bx, bz, ax, az, n, u(bx, bz), u(ax, az), theirs, mine, [1, 1], { bottom: true, top: false }, theirs);
  }
}

/**
 * @param field lysfelt (createLightField)
 * @returns {{ floor, ceiling, wall, basin, tileFloor, tileWall, caps, mass }} MeshData per materialgruppe
 *          (caps = topp på vegger mot rom, mass = topp på massiv vegg).
 *          Selve vannflaten bygges i world/water/.
 */
export function buildSurfaces(level, field, { subdivide } = {}) {
  const out = {
    floor: new MeshData(field),
    ceiling: new MeshData(field),
    wall: new MeshData(field),
    tileFloor: new MeshData(field),
    tileWall: new MeshData(field),
    basin: new MeshData(field),
    caps: new MeshData(null),
    mass: new MeshData(null),
  };
  let open = 0;
  for (const t of level.tiles) if (t !== TILE.WALL) open++;
  const S = subdivide ?? (open > 5000 ? 1 : 2);
  const isWall = (x, z) => getTile(level, x, z) === TILE.WALL;

  for (let cz = 0; cz < level.h; cz++) {
    for (let cx = 0; cx < level.w; cx++) {
      const t = getTile(level, cx, cz);
      if (t === TILE.WALL) continue;
      const fy = floorAt(level, cx, cz);
      const cy = ceilingAt(level, cx, cz);
      const vBase = t === TILE.WATER ? 0 : fy; // gulvlisten står på bassengkanten
      // Flislagte ruter (bad o.l.) får egne gulv- og veggflater med flismaterialene.
      const tiled = t !== TILE.WATER && level.finish[cz * level.w + cx] === FINISH.TILES;
      const floorMesh = tiled ? out.tileFloor : out.floor;
      const wallMesh = tiled ? out.tileWall : out.wall;
      if (t === TILE.WATER) {
        // Bunnen mørkner mot bassengkanten og mot trinn opp til grunnere vann.
        horizontal(out.basin, cx, cz, fy, S, true, (x, z) => floorAt(level, x, z) > fy + STEP, 0.1);
      } else if (t === TILE.STAIRS) {
        buildSteps(floorMesh, level, cx, cz);
      } else {
        const closes = (x, z) => isWall(x, z) || topFloorAt(level, x, z) > fy + 0.01;
        horizontal(floorMesh, cx, cz, fy, S, true, closes, 0.12);
      }
      // Taket får mindre direkte lys – ellers blir det overeksponert rundt armaturene.
      const lower = (x, z) => isWall(x, z) || ceilingAt(level, x, z) < cy - STEP;
      horizontal(out.ceiling, cx, cz, cy, S, false, lower, 0.1, CEILING_GAIN);
      const spans = openSpans(level, cx, cz, vBase);
      if (t === TILE.PILLAR) for (const sp of spans) pillar(wallMesh, cx, cz, sp.lo, sp.hi);
      buildDeck(level, cx, cz, { floorMesh, ceiling: out.ceiling, wallMesh }, SIDES, S, CEILING_GAIN);

      for (const s of SIDES) {
        const nx = cx + s.dx;
        const nz = cz + s.dz;
        const L = [cx + s.L[0], cz + s.L[1]];
        const R = [cx + s.R[0], cz + s.R[1]];
        const uL = L[0] * s.ux + L[1] * s.uz;
        const uR = uL + 1;
        if (isWall(nx, nz)) {
          const left = isWall(cx - s.ux, cz - s.uz) ? 0.8 : 1;
          const right = isWall(cx + s.ux, cz + s.uz) ? 0.8 : 1;
          const win = windowInfo(level, nx, nz);
          if (win && win.n[0] === -s.dx && win.n[1] === -s.dz) {
            // Vindu: vegg under og over åpningen, og smale stykker på sidene av den (karmen).
            const f = FRAME / 2;
            const at = (t) => [L[0] + (R[0] - L[0]) * t, L[1] + (R[1] - L[1]) * t];
            for (const sp of [...clipSpans(spans, -Infinity, win.sill), ...clipSpans(spans, win.head, Infinity)]) {
              wallMesh.wall(L[0], L[1], R[0], R[1], s.n, uL, uR, sp.lo, sp.hi, [left, right], undefined, sp.base);
            }
            for (const [t0, t1] of [[0, f], [1 - f, 1]]) {
              const [A, B] = [at(t0), at(t1)];
              for (const sp of clipSpans(spans, win.sill, win.head)) wallMesh.wall(A[0], A[1], B[0], B[1], s.n, uL + t0, uL + t1, sp.lo, sp.hi, [1, 1], { bottom: false, top: false }, sp.base);
            }
            continue;
          }
          for (const sp of spans) wallMesh.wall(L[0], L[1], R[0], R[1], s.n, uL, uR, sp.lo, sp.hi, [left, right], undefined, sp.base);
          continue;
        }
        // Lavere tak hos naboen (døråpning, annen takhøyde): vegg fra deres tak opp til vårt.
        const ncy = ceilingAt(level, nx, nz);
        if (ncy < cy - STEP) {
          for (const sp of clipSpans(spans, ncy, cy)) {
            wallMesh.wall(L[0], L[1], R[0], R[1], s.n, uL, uR, sp.lo, sp.hi, [1, 1], { bottom: false, top: true }, sp.base);
          }
        }
        // Bassengkant: fra vår bunn opp til naboens bunn, eller til kanten (0) mot gulv.
        if (t === TILE.WATER) {
          const nfy = getTile(level, nx, nz) === TILE.WATER ? floorAt(level, nx, nz) : Math.min(0, edgeHeight(level, nx, nz, -s.dx, -s.dz));
          if (nfy > fy + STEP) out.basin.wall(L[0], L[1], R[0], R[1], s.n, uL, uR, fy, nfy, [1, 1], { bottom: true, top: false });
        }
        cliffs(wallMesh, level, cx, cz, s, L, R);
      }
    }
  }
  addCaps(level, out);
  return out;
}
