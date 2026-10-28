// Trapper i skissen: trinnstreker og en pil som peker oppover (som på en arkitekttegning),
// og forhåndsvisning av trappeløpet mens man drar.
import { stairSpan, STEP_RISE, STAIR_THROUGH } from '../core/heights.js';
import { isEscalator, ESCALATOR_DOWN } from '../core/escalators.js';

const LINE = 'rgba(70,55,35,0.55)';
const ARROW = '#5b4326';
const ACCENT = '#1f7a72';
const UP = '#6b4fa0'; // trapp opp til etasjen over
const ERASE = '#c0492f';

/** Punkt i ruten (x, z) der t går langs trappen fra bakkanten og s på tvers. */
function local(dir, x, z, t, s) {
  if (dir[0] > 0) return [x + t, z + s];
  if (dir[0] < 0) return [x + 1 - t, z + s];
  if (dir[1] > 0) return [x + s, z + t];
  return [x + s, z + 1 - t];
}

function arrow(ctx, view, from, to, size) {
  const [ax, ay] = view.toScreen(...from);
  const [bx, by] = view.toScreen(...to);
  const ang = Math.atan2(by - ay, bx - ax);
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.moveTo(bx - Math.cos(ang - 0.5) * size, by - Math.sin(ang - 0.5) * size);
  ctx.lineTo(bx, by);
  ctx.lineTo(bx - Math.cos(ang + 0.5) * size, by - Math.sin(ang + 0.5) * size);
  ctx.stroke();
}

export function drawStairs(ctx, view, level, x, z) {
  const s = view.scale;
  const { bottom, top, dir } = stairSpan(level, x, z);
  const motor = isEscalator(level, x, z);
  const down = motor && !!(level.meta[z * level.w + x] & ESCALATOR_DOWN);
  const n = Math.max(1, Math.round((top - bottom) / STEP_RISE));
  ctx.save();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  if (s / n >= 3) {
    ctx.beginPath();
    for (let k = 0; k < n; k++) {
      const [ax, ay] = view.toScreen(...local(dir, x, z, k / n, 0));
      const [bx, by] = view.toScreen(...local(dir, x, z, k / n, 1));
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
    }
    ctx.stroke();
  }
  if (s >= 8) {
    ctx.strokeStyle = motor ? ACCENT : level.meta[z * level.w + x] & STAIR_THROUGH ? UP : ARROW;
    ctx.lineWidth = 1.5;
    arrow(ctx, view, local(dir, x, z, down ? 0.85 : 0.15, 0.5), local(dir, x, z, down ? 0.15 : 0.85, 0.5), Math.max(3, s * 0.18));
  }
  ctx.restore();
}

/** Forhåndsvisning: rutene i løpet og en pil fra bunn til topp. */
export function drawStairsPreview(ctx, view, { dir, rows, erase, down = false }) {
  const s = view.scale;
  ctx.save();
  ctx.fillStyle = erase ? 'rgba(192,73,47,0.14)' : 'rgba(31,122,114,0.14)';
  ctx.strokeStyle = erase ? ERASE : ACCENT;
  ctx.lineWidth = 1.5;
  for (const row of rows) {
    for (const [x, z] of row) {
      const [sx, sy] = view.toScreen(x, z);
      ctx.fillRect(sx, sy, s, s);
      ctx.strokeRect(sx + 0.5, sy + 0.5, s, s);
    }
  }
  if (!erase) {
    const mid = Math.floor((rows[0].length - 1) / 2);
    const [x0, z0] = rows[0][mid];
    const [x1, z1] = rows[rows.length - 1][mid];
    ctx.lineWidth = 2;
    const from = local(dir, x0, z0, 0.1, 0.5), to = local(dir, x1, z1, 0.9, 0.5);
    arrow(ctx, view, down ? to : from, down ? from : to, Math.max(5, s * 0.3));
  }
  ctx.restore();
}
