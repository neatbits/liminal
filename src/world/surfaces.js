// Genererer alle flater i rommet som MeshData: gulv, trapper, tak, vegger, basseng, søyler,
// dekker og veggtopper (for oversiktsvisningen). Vegger og søyler bygges per etasje der ruten
// har dekke (se decks.js). Ren logikk – ingen three.js.
import { TILE, getTile } from '../core/level.js';
import { buildPillar } from './pillars.js';
import { waterCell } from '../core/pillar-water.js';
import { floorAt, topFloorAt, ceilingAt, edgeHeight, pillarBottom } from '../core/heights.js';
import { MeshData } from './mesher.js';
import { SIDES, addCaps } from './caps.js';
import { buildSteps, surfaceHeight, stepBreaks } from './stairs.js';
import { isEscalator } from '../core/escalators.js';
import { FINISH } from '../core/zones.js';
import { openSpans, clipSpans, buildDeck } from './decks.js';
import { windowInfo } from '../core/windows.js';
import { cornerShape, sideOpened } from '../core/corners.js';
import { buildCorner } from './corners.js';
import { archShape, buildArch } from './arches.js';
import { wallTextureMap } from './wall-textures.js';
import { mallRoof } from '../core/mall-roof.js';
import { isShopfront, shopfrontNormal } from '../core/shopfronts.js';
import { SHOP_INTERIORS, shopInteriorMap } from '../core/shop-interiors.js';

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
  const roof = mallRoof(level);
  const shops = shopInteriorMap(level);
  const wallUV = wallTextureMap(level);
  const out = {
    ...Object.fromEntries(SHOP_INTERIORS.flatMap((_, style) =>
      ['Floor', 'Wall', 'Ceiling'].map(surface => [`shop${surface}_${style}`, new MeshData(field)]))),
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
  // Formede hjørner (world/corners.js) skygges med de samme reglene som horizontal() under, så
  // gulvet og taket i hjørneruten glir over i naborutene uten skjøt.
  const cornerShade = ({ fy, cy }) => ({
    S,
    floor: { ao: (x, z) => cornerAO(x, z, (a, b) => isWall(a, b) || topFloorAt(level, a, b) > fy + 0.01, 0.12), edge: 1 - 2 * 0.12, full: 1 },
    ceiling: {
      ao: (x, z) => cornerAO(x, z, (a, b) => isWall(a, b) || ceilingAt(level, a, b) < cy - STEP, 0.1) * CEILING_GAIN,
      edge: (1 - 2 * 0.1) * CEILING_GAIN,
      full: CEILING_GAIN,
    },
  });

  for (let cz = 0; cz < level.h; cz++) {
    for (let cx = 0; cx < level.w; cx++) {
      const t = getTile(level, cx, cz);
      // Skrå/avrundet hjørne (core/corners.js): veggruten er åpnet mot hjørnet, gulvruten får en kile.
      const shape = t === TILE.WALL || t === TILE.FLOOR ? cornerShape(level, cx, cz) : null;
      if (t === TILE.WALL) {
        if (shape) buildCorner(shape, { floor: out.floor, ceiling: out.ceiling, wall: out.wall }, [{ lo: shape.fy, hi: shape.cy, base: shape.fy }], wallUV, cornerShade(shape));
        continue;
      }
      const fy = floorAt(level, cx, cz);
      const cy = ceilingAt(level, cx, cz);
      const wet = waterCell(level, cx, cz);
      const vBase = wet ? 0 : fy; // gulvlisten står på bassengkanten
      // Flislagte ruter (bad o.l.) får egne gulv- og veggflater med flismaterialene.
      const tiled = t !== TILE.WATER && level.finish[cz * level.w + cx] === FINISH.TILES;
      const style = shops[cz * level.w + cx] - 1;
      const floorMesh = style>=0 ? out[`shopFloor_${style}`] : tiled ? out.tileFloor : out.floor;
      const wallMesh = style>=0 ? out[`shopWall_${style}`] : tiled ? out.tileWall : out.wall;
      const ceilingMesh = style>=0 ? out[`shopCeiling_${style}`] : out.ceiling;
      if (wet) {
        // Bunnen mørkner mot bassengkanten og mot trinn opp til grunnere vann.
        horizontal(out.basin, cx, cz, fy, S, true, (x, z) => floorAt(level, x, z) > fy + STEP, 0.1);
      } else if (t === TILE.STAIRS) {
        if (!isEscalator(level, cx, cz)) buildSteps(floorMesh, level, cx, cz);
      } else if (!shape) {
        const closes = (x, z) => isWall(x, z) || topFloorAt(level, x, z) > fy + 0.01;
        horizontal(floorMesh, cx, cz, fy, S, true, closes, 0.12);
      }
      // Taket får mindre direkte lys – ellers blir det overeksponert rundt armaturene.
      const lower = (x, z) => isWall(x, z) || ceilingAt(level, x, z) < cy - STEP;
      // En bue har ikke flatt tak: det ville ligget skjult inne i buen og flimret mot toppen av den.
      const arch = t === TILE.DOOR && archShape(level, cx, cz);
      if (!shape && !arch && !roof?.mask[cz*level.w+cx]) horizontal(ceilingMesh, cx, cz, cy, S, false, lower, 0.1, CEILING_GAIN);
      if (arch) buildArch(wallMesh, arch);
      const spans = openSpans(level, cx, cz, vBase);
      if (shape) buildCorner(shape, { floor: floorMesh, ceiling: ceilingMesh, wall: wallMesh }, spans, wallUV, cornerShade(shape));
      if (t === TILE.PILLAR) {
        const bottom = pillarBottom(level, cx, cz);
        spans.forEach((sp, i) => buildPillar(wallMesh, level, cx, cz, i ? sp.lo : Math.min(sp.lo, bottom), sp.hi, sp.base));
      }
      buildDeck(level, cx, cz, { floorMesh, ceiling: ceilingMesh, wallMesh }, SIDES, S, CEILING_GAIN);

      for (const s of SIDES) {
        const nx = cx + s.dx;
        const nz = cz + s.dz;
        const L = [cx + s.L[0], cz + s.L[1]];
        const R = [cx + s.R[0], cz + s.R[1]];
        const originalU = L[0] * s.ux + L[1] * s.uz;
        const [uL, uR] = wallUV(L, R) ?? [originalU, originalU + 1];
        if (isWall(nx, nz)) {
          if (isShopfront(level, nx, nz) && shopfrontNormal(level, nx, nz)) continue;
          // Siden ligger i veggkilen, eller naboveggen er åpnet mot oss: ingen vegg her.
          if (sideOpened(shape, s.dx, s.dz) || sideOpened(cornerShape(level, nx, nz), -s.dx, -s.dz)) continue;
          const left = isWall(cx - s.ux, cz - s.uz) ? 0.8 : 1;
          const right = isWall(cx + s.ux, cz + s.uz) ? 0.8 : 1;
          const win = windowInfo(level, nx, nz);
          if (win && win.n[0] === -s.dx && win.n[1] === -s.dz) {
            // Vindu: vegg under og over åpningen, og smale stykker på sidene av den (karmen).
            const at = (t) => [L[0] + (R[0] - L[0]) * t, L[1] + (R[1] - L[1]) * t];
            for (const sp of [...clipSpans(spans, -Infinity, win.sill), ...clipSpans(spans, win.head, Infinity)]) {
              wallMesh.wall(L[0], L[1], R[0], R[1], s.n, uL, uR, sp.lo, sp.hi, [left, right], undefined, sp.base);
            }
            // Window-basis går motsatt vei av veggstripens L→R. Ingen stolper mellom delte glassruter.
            for (const [t0, t1] of [[0, win.right], [1 - win.left, 1]].filter(([a, b]) => b - a > 1e-6)) {
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
        if (wet) {
          const nfy = waterCell(level, nx, nz) ? floorAt(level, nx, nz) : Math.min(0, edgeHeight(level, nx, nz, -s.dx, -s.dz));
          if (nfy > fy + STEP) out.basin.wall(L[0], L[1], R[0], R[1], s.n, uL, uR, fy, nfy, [1, 1], { bottom: true, top: false });
        }
        if (!isEscalator(level, cx, cz)) cliffs(wallMesh, level, cx, cz, s, L, R);
      }
    }
  }
  addCaps(level, out);
  return out;
}
