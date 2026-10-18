// Hjelpere for generatorene.
import { TILE } from '../core/level.js';

/** Fyller et rektangel (inkluderende), klippet til innsiden av rommet (kantene forblir vegg). */
export function fillRect(level, x0, z0, x1, z1, tile) {
  const ax = Math.max(1, Math.min(x0, x1));
  const bx = Math.min(level.w - 2, Math.max(x0, x1));
  const az = Math.max(1, Math.min(z0, z1));
  const bz = Math.min(level.h - 2, Math.max(z0, z1));
  for (let z = az; z <= bz; z++) {
    for (let x = ax; x <= bx; x++) {
      const i = z * level.w + x;
      level.tiles[i] = tile;
      if (tile === TILE.WALL || tile === TILE.PILLAR) level.lights[i] = 0;
    }
  }
}

export function fillInterior(level, tile = TILE.FLOOR) {
  fillRect(level, 1, 1, level.w - 2, level.h - 2, tile);
}

/** Merker sammenhengende åpne områder. Returnerer { labels, sizes }. */
export function labelRegions(level) {
  const { w, h, tiles } = level;
  const labels = new Int32Array(w * h).fill(-1);
  const sizes = [];
  const queue = new Int32Array(w * h);
  for (let start = 0; start < tiles.length; start++) {
    if (tiles[start] === TILE.WALL || labels[start] !== -1) continue;
    const id = sizes.length;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    labels[start] = id;
    while (head < tail) {
      const i = queue[head++];
      const x = i % w;
      const z = (i / w) | 0;
      const next = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, z > 0 ? i - w : -1, z < h - 1 ? i + w : -1];
      for (const j of next) {
        if (j < 0 || labels[j] !== -1 || tiles[j] === TILE.WALL) continue;
        labels[j] = id;
        queue[tail++] = j;
      }
    }
    sizes.push(tail);
  }
  return { labels, sizes };
}

/** Beholder bare det største sammenhengende området; resten blir vegg. */
export function keepLargestRegion(level) {
  const { labels, sizes } = labelRegions(level);
  if (sizes.length <= 1) return;
  let best = 0;
  for (let i = 1; i < sizes.length; i++) if (sizes[i] > sizes[best]) best = i;
  for (let i = 0; i < labels.length; i++) {
    if (labels[i] !== -1 && labels[i] !== best) {
      level.tiles[i] = TILE.WALL;
      level.lights[i] = 0;
    }
  }
}
