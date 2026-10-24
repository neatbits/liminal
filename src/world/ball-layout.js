// Ballbinger (tema med `pit: 'balls'`): plassering, farge og bakt lys for hver ball. Ren logikk
// (ingen three.js), så den kan testes i Node; world/balls.js lager meshen.
import { TILE, WATER_SURFACE } from '../core/level.js';
import { PLAY_BALL_RADIUS, pitBallY } from '../core/play-balls.js';

export const BALL_RADIUS = PLAY_BALL_RADIUS;
const SPACING = 0.16;

/** Liten, fast pseudotilfeldighet per rute og ball (samme rom gir samme baller). */
function hash(a, b, c) {
  let h = (a * 73856093) ^ (b * 19349663) ^ (c * 83492791);
  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

/**
 * Ballene i rommet: to lag ved overflaten av hver bassengrute.
 * @returns {Array<{ x, y, z, color, light }>} color = indeks i temaets pitColors,
 *          light = bakt lys [r, g, b] (lineært)
 */
export function ballLayout(level, field = null, colors = 4) {
  const out = [];
  const n = Math.round(1 / SPACING);
  for (let cz = 0; cz < level.h; cz++) {
    for (let cx = 0; cx < level.w; cx++) {
      if (level.tiles[cz * level.w + cx] !== TILE.WATER) continue;
      const top = WATER_SURFACE + 0.06;
      const s = field ? field.sample(cx + 0.5, top, cz + 0.5, 0, 1, 0) : [1, 1, 1];
      const light = [s[0], s[1], s[2]];
      let k = 0;
      for (let layer = 0; layer < 2; layer++) {
        for (let j = 0; j < n; j++) {
          for (let i = 0; i < n; i++, k++) {
            if (layer === 1 && hash(cx, cz, k) < 0.5) continue; // nederste lag er glissent
            const jx = (hash(cx, cz, k + 1000) - 0.5) * 0.085;
            const jz = (hash(cx, cz, k + 2000) - 0.5) * 0.085;
            const off = layer ? SPACING / 2 : 0;
            const stagger = (j % 2 ? 1 : -1) * SPACING * 0.22;
            const x = Math.min(cx + 0.98, Math.max(cx + 0.02, cx + (i + 0.5) / n + off + stagger + jx));
            const z = Math.min(cz + 0.98, Math.max(cz + 0.02, cz + (j + 0.5) / n + off + jz));
            out.push({
              x,
              y: pitBallY(x, z) - layer * BALL_RADIUS * 1.5 + (hash(cx, cz, k + 3000) - 0.5) * 0.03,
              z,
              color: Math.floor(hash(cx, cz, k + 4000) * colors),
              light,
            });
          }
        }
      }
    }
  }
  return out;
}

export const WAKE_POINTS = 8;
export const WAKE_RADIUS = 0.6;

/**
 * Kjølvannet i ballbingen: punktene der spilleren har vasset (eller landet), som dytter
 * ballene til side og sakte gir seg igjen. values() gir [x, z, styrke, 0] per punkt til shaderen.
 */
export class Wake {
  constructor() {
    this.points = [];
  }

  /** Spilleren (eller et plask) i (x, z). Nytt punkt når man har flyttet seg et stykke. */
  touch(x, z, strength = 1) {
    const last = this.points[this.points.length - 1];
    if (last && Math.hypot(last.x - x, last.z - z) < 0.2) {
      last.s = Math.max(last.s, strength);
      return;
    }
    this.points.push({ x, z, s: strength });
    if (this.points.length > WAKE_POINTS) this.points.shift();
  }

  /** Ballene glir tilbake: styrken avtar over et par sekunder. */
  step(dt) {
    for (const p of this.points) p.s *= Math.exp(-dt / 1.6);
    this.points = this.points.filter((p) => p.s > 0.01);
  }

  values(out = new Float32Array(WAKE_POINTS * 4)) {
    out.fill(0);
    this.points.forEach((p, k) => out.set([p.x, p.z, Math.min(1.5, p.s), 0], k * 4));
    return out;
  }
}
