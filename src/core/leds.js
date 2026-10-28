// LED-striper (laget «leds»): en farget remse under taket på veggruter, mot hver nabo man kan stå
// i. Ren logikk – 2D-skissen (editor/render-leds.js), 3D (world/led-strips.js) og lysbakingen
// (world/lighting.js) bruker de samme flatene fra ledFaces. Indeks 1–8; 0 = ingen.
import { TILE, LIGHT, canHaveLight, inBounds } from './level.js';
import { ceilingAt } from './heights.js';
import { openRegion } from './ops.js';

export const LED_COLORS = [
  null,
  '#ff4d9e', // 1 rosa
  '#00e5d4', // 2 teal
  '#ffaa00', // 3 amber
  '#3366ff', // 4 blå
  '#aa00ff', // 5 lilla
  '#22dd55', // 6 grønn
  '#ffeecc', // 7 varm hvit
  '#ff2244', // 8 rød
];

export const LED_NAMES = [null, 'Pink', 'Teal', 'Amber', 'Blue', 'Purple', 'Green', 'Warm white', 'Red'];

/** Lysstyrke per meter stripe, i forhold til et taklys. */
export const LED_POWER = 0.5;
/** Remsens høyde og avstand fra taket (m). Lyset sitter like under, litt ut fra veggen. */
export const LED_STRIP = 0.1;
export const LED_GAP = 0.01;

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Naboen er et sted man står (gulv, vann, trapp) – ikke en dør, der overliggeren dekker remsen. */
const faces = (tile) => canHaveLight(tile) && tile !== TILE.DOOR;

/**
 * Veggflatene med stripe: [{ x, z, dx, dz, color, ceil }] – veggruten (x, z) og retningen mot
 * naboen. Skrå/avrundede hjørner hoppes over (flaten er ikke lenger rett der).
 */
export function ledFaces(level) {
  const out = [];
  const { w, h, leds, tiles, corners } = level;
  if (!leds?.some((v) => v)) return out;
  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) {
      const i = z * w + x;
      const color = leds[i];
      if (!LED_COLORS[color] || tiles[i] !== TILE.WALL || corners[i]) continue;
      for (const [dx, dz] of DIRS) {
        const nx = x + dx;
        const nz = z + dz;
        if (!inBounds(level, nx, nz)) continue;
        const n = nz * w + nx;
        if (!faces(tiles[n]) || corners[n]) continue;
        out.push({ x, z, dx, dz, color, ceil: ceilingAt(level, nx, nz) });
      }
    }
  }
  return out;
}

/**
 * Lyskilder for bakingen: ett farget punkt per meter stripe, 15 cm ut fra veggen og like under
 * remsen. `hex` er fargen (lighting.js regner den om til lineært lys).
 */
export function ledLights(level) {
  return ledFaces(level).map(({ x, z, dx, dz, color, ceil }) => ({
    cx: x + dx,
    cz: z + dz,
    x: x + 0.5 + dx * 0.65,
    z: z + 0.5 + dz * 0.65,
    y: ceil - LED_GAP - LED_STRIP - 0.15,
    ceil,
    state: LIGHT.ON,
    group: 0,
    object: true,
    power: LED_POWER,
    hex: LED_COLORS[color],
  }));
}

/** Setter fargen `v` (0 = fjern) på veggrutene blant `indices`. Returnerer antall endrede. */
export function paintLeds(level, indices, v) {
  let changed = 0;
  for (const i of indices) {
    if (level.tiles[i] !== TILE.WALL || level.leds[i] === v) continue;
    level.leds[i] = v;
    changed++;
  }
  return changed;
}

/**
 * Rutene Fill gir stripe: klikk i et rom gir alle veggrutene rundt det (uten duplikater), klikk på
 * en vegg bare den ruten – ikke alle veggene i hele rommet, som henger sammen.
 */
export function ledFillCells(level, x, z) {
  if (!inBounds(level, x, z)) return [];
  if (level.tiles[z * level.w + x] === TILE.WALL) return [z * level.w + x];
  const out = new Set();
  for (const i of openRegion(level, x, z)) {
    const cx = i % level.w;
    const cz = (i / level.w) | 0;
    for (const [dx, dz] of DIRS) {
      const nx = cx + dx;
      const nz = cz + dz;
      if (inBounds(level, nx, nz) && level.tiles[nz * level.w + nx] === TILE.WALL) out.add(nz * level.w + nx);
    }
  }
  return [...out];
}
