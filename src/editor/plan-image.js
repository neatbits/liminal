// Bakgrunnsbildet i skissen: én piksel per rute. Vann blir mørkere jo dypere det er, gulv
// med egen takhøyde tones lilla (høyere tak) eller grått (lavere tak), og hevede gulv brunt.
import { TILE, getTile, WATER_DEPTH, DEPTH_MIN, DEPTH_MAX } from '../core/level.js';
import { depthAt, deckAt } from '../core/heights.js';
import { getTheme } from '../core/themes.js';

const WALL = [90, 93, 98];
const MASS = [230, 227, 220]; // massiv vegg (uten åpne naboer) tegnes lyst, som papir
const DEEP = [34, 88, 124];
const SHALLOW = [255, 255, 255];
const HIGH = [190, 174, 238];
const LOW = [150, 142, 124];
const RAISED = [200, 162, 110];
const TILED = [205, 210, 214];
const DECK = [120, 150, 170]; // ruter med dekke (andre etasje) tones blågrått

export function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Vannfarge for en dybde: standarddybden gir temaets farge. */
export function waterColor(base, depth) {
  if (depth >= WATER_DEPTH) return mix(base, DEEP, ((depth - WATER_DEPTH) / (DEPTH_MAX - WATER_DEPTH)) * 0.85);
  return mix(base, SHALLOW, ((WATER_DEPTH - depth) / (WATER_DEPTH - DEPTH_MIN)) * 0.5);
}

/** Gulvfarge for en rute med takhøyden ceil, når rommets standard er room. */
export function floorColor(base, ceil, room) {
  const delta = ceil - room;
  if (delta > 1e-6) return mix(base, HIGH, 0.3 + Math.min(1, delta / 3) * 0.45);
  if (delta < -1e-6) return mix(base, LOW, 0.2 + Math.min(1, -delta / 0.5) * 0.2);
  return base;
}

/** Gulvfarge for et hevet gulv (eller toppen av en trapp) i høyden h. */
export function raisedColor(base, h) {
  return h > 1e-6 ? mix(base, RAISED, 0.25 + Math.min(1, h / 3) * 0.45) : base;
}

export function planImage(level) {
  const canvas = document.createElement('canvas');
  canvas.width = level.w;
  canvas.height = level.h;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(level.w, level.h);
  const theme = getTheme(level.theme);
  const floor = rgb(theme.plan.floor);
  const water = rgb(theme.plan.water);
  for (let z = 0; z < level.h; z++) {
    for (let x = 0; x < level.w; x++) {
      const i = z * level.w + x;
      const t = level.tiles[i];
      let c;
      if (t === TILE.WALL) {
        let touches = false;
        for (let dz = -1; dz <= 1 && !touches; dz++) {
          for (let dx = -1; dx <= 1; dx++) if (getTile(level, x + dx, z + dz) !== TILE.WALL) touches = true;
        }
        c = touches ? WALL : MASS;
      } else if (t === TILE.WATER) {
        // Ballbinger vises som konfetti i ballfargene, vann blir mørkere jo dypere det er.
        const pit = theme.pitColors;
        c = pit ? mix(rgb(pit[(x * 7 + z * 13) % pit.length]), SHALLOW, 0.35) : waterColor(water, depthAt(level, x, z));
      } else {
        const dm = level.ceilings[i];
        const base = level.finish[i] ? mix(floor, TILED, 0.6) : floor;
        c = raisedColor(dm ? floorColor(base, dm / 10, level.height) : base, level.floors[i] / 10);
        if (deckAt(level, x, z)) c = mix(c, DECK, 0.22);
      }
      img.data.set([Math.round(c[0]), Math.round(c[1]), Math.round(c[2]), 255], i * 4);
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}
