// Veggtopper for oversiktsvisningen («dukkehuset»). En vegg som grenser mot rom er like
// høy som det høyeste taket rundt seg; massiv vegg ligger på rommets takhøyde. Der en
// veggtopp er høyere enn naboen (lavere tak eller lavere veggtopp), lukkes spranget med
// en loddrett flate, så ingen hull vises ovenfra. Ren logikk – ingen three.js.
import { TILE, getTile, inBounds } from '../core/level.js';
import { ceilingAt } from '../core/heights.js';

// Sidene til en rute, sett innenfra. Normalen peker inn i ruten, (ux, uz) er «høyre».
export const SIDES = [
  { dx: 0, dz: -1, n: [0, 0, 1], L: [0, 0], R: [1, 0], ux: 1, uz: 0 },
  { dx: 0, dz: 1, n: [0, 0, -1], L: [1, 1], R: [0, 1], ux: -1, uz: 0 },
  { dx: -1, dz: 0, n: [1, 0, 0], L: [0, 1], R: [0, 0], ux: 0, uz: -1 },
  { dx: 1, dz: 0, n: [-1, 0, 0], L: [1, 0], R: [1, 1], ux: 0, uz: 1 },
];
const UP = [0, 1, 0];

/** Høyeste tak blant åpne naboer (8 retninger), eller -1 når veggen er massiv. */
export function capHeight(level, x, z) {
  let y = -1;
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      if ((dx || dz) && getTile(level, x + dx, z + dz) !== TILE.WALL) y = Math.max(y, ceilingAt(level, x + dx, z + dz));
    }
  }
  return y;
}

/** Legger veggtopper (og sprang mellom ulike høyder) i out.caps / out.mass. */
export function addCaps(level, out) {
  const { w, h } = level;
  const top = new Float64Array(w * h);
  const touches = new Uint8Array(w * h);
  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) {
      const i = z * w + x;
      if (level.tiles[i] !== TILE.WALL) continue;
      const y = capHeight(level, x, z);
      touches[i] = y >= 0 ? 1 : 0;
      top[i] = y >= 0 ? y : level.height;
    }
  }
  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) {
      const i = z * w + x;
      if (level.tiles[i] !== TILE.WALL) continue;
      const y = top[i];
      const mesh = touches[i] ? out.caps : out.mass;
      mesh.quad([x, y, z, 0, 0], [x, y, z + 1, 0, 1], [x + 1, y, z + 1, 1, 1], [x + 1, y, z, 1, 0], UP);
      for (const s of SIDES) {
        const nx = x + s.dx;
        const nz = z + s.dz;
        if (!inBounds(level, nx, nz)) continue;
        const j = nz * w + nx;
        const ny = level.tiles[j] === TILE.WALL ? top[j] : ceilingAt(level, nx, nz);
        if (ny >= y - 1e-6) continue;
        // Vender ut mot naboen: motsatt omløp og normal av sidene sett innenfra.
        const Lx = x + s.L[0];
        const Lz = z + s.L[1];
        const Rx = x + s.R[0];
        const Rz = z + s.R[1];
        mesh.quad([Rx, ny, Rz, 0, 0], [Lx, ny, Lz, 1, 0], [Lx, y, Lz, 1, 1], [Rx, y, Rz, 0, 1], [-s.n[0], 0, -s.n[2]]);
      }
    }
  }
}
