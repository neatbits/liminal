// Stiger i skissen (core/ladders.js): i etasjen med stigen to vanger og trinn mot kanten motsatt
// utgangen, og en pil dit man går av og på; i etasjen over hullet (mørkt, med rekkverkslinje) og pilen.
import { ladders } from '../core/ladders.js';

const COLOR = '#6b4fa0'; // som trappene opp (render-stairwells.js)

function arrow(ctx, cx, cy, [dx, dz], len) {
  const [ex, ey] = [cx + dx * len, cy + dz * len];
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(ex, ey);
  ctx.moveTo(ex - dx * len * 0.35 - dz * len * 0.3, ey - dz * len * 0.35 + dx * len * 0.3);
  ctx.lineTo(ex, ey);
  ctx.lineTo(ex - dx * len * 0.35 + dz * len * 0.3, ey - dz * len * 0.35 - dx * len * 0.3);
  ctx.stroke();
}

/** level: etasjen som tegnes; below: etasjen under (eller null) – hullene der oppe kommer fra den. */
export function drawLadders(ctx, view, level, below) {
  const s = view.scale;
  ctx.save();
  ctx.strokeStyle = COLOR;
  ctx.lineWidth = Math.max(1, s * 0.06);
  for (const { x, z, dir } of ladders(level)) {
    const [sx, sy] = view.toScreen(x, z);
    const u = [-dir[1], dir[0]];
    const c = [sx + s / 2 - (dir[0] * s) / 3, sy + s / 2 - (dir[1] * s) / 3]; // stigen står mot kanten motsatt dir
    ctx.beginPath();
    for (const k of [-1, 1]) { // vangene
      ctx.moveTo(c[0] + u[0] * k * s * 0.25 - dir[0] * s * 0.12, c[1] + u[1] * k * s * 0.25 - dir[1] * s * 0.12);
      ctx.lineTo(c[0] + u[0] * k * s * 0.25 + dir[0] * s * 0.12, c[1] + u[1] * k * s * 0.25 + dir[1] * s * 0.12);
    }
    for (const t of [-0.08, 0.08]) { // trinnene
      ctx.moveTo(c[0] - u[0] * s * 0.25 + dir[0] * s * t, c[1] - u[1] * s * 0.25 + dir[1] * s * t);
      ctx.lineTo(c[0] + u[0] * s * 0.25 + dir[0] * s * t, c[1] + u[1] * s * 0.25 + dir[1] * s * t);
    }
    ctx.stroke();
    if (s >= 10) arrow(ctx, sx + s / 2 + (dir[0] * s) / 8, sy + s / 2 + (dir[1] * s) / 8, dir, s * 0.3);
  }
  for (const { x, z, dir } of below ? ladders(below) : []) {
    const [sx, sy] = view.toScreen(x, z);
    ctx.fillStyle = 'rgba(30, 24, 40, 0.55)';
    ctx.fillRect(sx + s * 0.1, sy + s * 0.1, s * 0.8, s * 0.8);
    ctx.strokeRect(sx + s * 0.1, sy + s * 0.1, s * 0.8, s * 0.8);
    if (s >= 10) {
      ctx.strokeStyle = '#ffffff';
      arrow(ctx, sx + s / 2, sy + s / 2, dir, s * 0.45); // dit man går av
      ctx.strokeStyle = COLOR;
    }
  }
  ctx.restore();
}
