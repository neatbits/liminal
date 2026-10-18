// Romklang etter rommet man står i: måler hvor langt det er til veggene i 16 retninger og hvor
// høyt taket er, og gjør det om til en «romstørrelse» 0..1 – trangt skap … stor hall. Ren logikk.
import { TILE, getTile } from '../core/level.js';
import { headAt, groundAt } from '../core/heights.js';
import { DOOR, doorInfo } from '../core/doors.js';

const RAYS = 16;
const STEP = 0.25;
const MAX = 30;

/** Stopper lyden her? Vegg, søyle eller lukket dør. */
function blocks(level, x, z) {
  const t = getTile(level, x, z);
  if (t === TILE.WALL || t === TILE.PILLAR) return true;
  return t === TILE.DOOR && doorInfo(level, x, z)?.state === DOOR.CLOSED;
}

/** Avstand til nærmeste hindring langs retningen (dx, dz), høyst MAX meter. */
export function rayLength(level, x, z, dx, dz) {
  for (let d = STEP; d < MAX; d += STEP) if (blocks(level, Math.floor(x + dx * d), Math.floor(z + dz * d))) return d;
  return MAX;
}

/**
 * @returns {{ size, open, height, tight }} size 0..1 (romstørrelsen), open = snittavstand til
 *          veggene (m), height = takhøyde over gulvet (m), tight = andel retninger med vegg
 *          nærmere enn 2 m
 */
export function measureRoom(level, x, z, y = null) {
  let sum = 0;
  let near = 0;
  for (let k = 0; k < RAYS; k++) {
    const a = (k / RAYS) * Math.PI * 2;
    const d = rayLength(level, x, z, Math.cos(a), Math.sin(a));
    sum += d;
    if (d < 2) near++;
  }
  const open = sum / RAYS;
  const floor = groundAt(level, x, z, y);
  const height = Math.max(1, headAt(level, x, z, y ?? floor) - floor);
  // Lengre til veggene og høyere tak gir større rom; en trang gang drar ned.
  const raw = (open * 0.55 + height * 1.4 - 4.5) / 14;
  const size = Math.max(0, Math.min(1, raw * (1 - (near / RAYS) * 0.5)));
  return { size, open, height, tight: near / RAYS };
}

/** Miks av kort og lang romklang for en romstørrelse: { small, large } (0..1). */
export function reverbMix(size) {
  return { small: 0.35 + (1 - size) * 0.25, large: Math.pow(size, 1.3) * 1.1 };
}
