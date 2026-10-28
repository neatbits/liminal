// Trapperom i skissen (core/stairwells.js): reposet over en trapp opp får stiplet ramme og ↑, og i
// etasjen over vises sjakten skravert (der er det vegg) med reposet og ↓.
const UP = '#6b4fa0';

function label(ctx, view, i, w, text) {
  const s = view.scale;
  const [sx, sy] = view.toScreen(i % w, Math.floor(i / w));
  ctx.save();
  ctx.strokeStyle = UP;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(sx + 1.5, sy + 1.5, s - 3, s - 3);
  if (s >= 12) {
    ctx.fillStyle = UP;
    ctx.font = `bold ${Math.round(s * 0.55)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, sx + s / 2, sy + s / 2);
  }
  ctx.restore();
}

/** runs: trappene opp fra denne etasjen; below: trappene opp fra etasjen under (throughRuns). */
export function drawStairwells(ctx, view, level, { runs, below }) {
  const s = view.scale;
  const w = level.w;
  for (const { landing } of runs) label(ctx, view, landing, w, '↑');
  if (!below.length) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(60, 45, 90, 0.55)';
  ctx.lineWidth = 1;
  for (const { run, landing } of below) {
    for (const i of run) {
      const [sx, sy] = view.toScreen(i % w, Math.floor(i / w));
      ctx.fillStyle = 'rgba(60, 45, 90, 0.35)';
      ctx.fillRect(sx, sy, s, s);
      ctx.beginPath();
      for (let k = -s; k < s; k += Math.max(4, s / 4)) {
        ctx.moveTo(sx + Math.max(0, k), sy + Math.max(0, -k));
        ctx.lineTo(sx + Math.min(s, s + k), sy + Math.min(s, s - k));
      }
      ctx.stroke();
    }
    label(ctx, view, landing, w, '↓');
  }
  ctx.restore();
}
