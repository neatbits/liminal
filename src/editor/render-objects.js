// Gjenstander i skissen: fotavtrykket sett ovenfra, med en tykk strek på forsiden og en
// forkortelse av navnet når det er plass.
import { OBJECTS, FACING, objectPose } from '../core/objects.js';

/** Stiplede ringer rundt stedene som skal vises fram: [{ x, z, r }] (highlight i editoren). */
export function drawHighlights(ctx, view, markers) {
  if (!markers?.length) return;
  const s = view.scale;
  ctx.save();
  ctx.strokeStyle = '#e8743b';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([6, 4]);
  for (const { x, z, r } of markers) {
    const [cx, cy] = view.toScreen(x, z);
    ctx.beginPath();
    ctx.arc(cx, cy, r * s, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawObjects(ctx, view, level) {
  if (!level.objects?.length) return;
  const s = view.scale;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.max(7, Math.min(11, s * 0.3))}px system-ui, sans-serif`;
  for (const o of level.objects) {
    const def = OBJECTS[o.id];
    if (!def) continue;
    const p = objectPose(level, o);
    const [x0, y0] = view.toScreen(p.x - p.w / 2, p.z - p.d / 2);
    const w = p.w * s;
    const d = p.d * s;
    if (def.mount === 'ceiling') {
      // Under taket (takvifte): bare et stiplet omriss, så gulvet under synes.
      ctx.save();
      ctx.strokeStyle = 'rgba(58, 52, 64, 0.7)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(x0 + w / 2, y0 + d / 2, w / 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      continue;
    }
    ctx.fillStyle = 'rgba(58, 52, 64, 0.85)';
    ctx.fillRect(x0, y0, w, d);
    // Forsiden: tykk, lys strek langs siden gjenstanden vender mot.
    const [fx, fz] = FACING[p.rot];
    ctx.strokeStyle = '#f2c14e';
    ctx.lineWidth = Math.max(1.5, s * 0.06);
    ctx.beginPath();
    if (fz) {
      const y = fz > 0 ? y0 + d : y0;
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + w, y);
    } else {
      const x = fx > 0 ? x0 + w : x0;
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y0 + d);
    }
    ctx.stroke();
    const text = def.label.split(' ').pop();
    if (s >= 28 && ctx.measureText(text).width < w - 4) {
      ctx.fillStyle = '#fff';
      ctx.fillText(text, x0 + w / 2, y0 + d / 2);
    }
  }
  ctx.restore();
}
