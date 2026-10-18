// Vinduer i skissen: en lyseblå glassflate med sprosse langs veggens side mot rommet.
import { windowInfo } from '../core/windows.js';

export function drawWindow(ctx, view, level, x, z) {
  const win = windowInfo(level, x, z);
  if (!win) return;
  const s = view.scale;
  const [sx, sy] = view.toScreen(x, z);
  const [nx, nz] = win.n;
  const t = Math.max(2, s * 0.3); // tykkelse på glasset i skissen
  // Glasset ligger i veggruten, inntil siden som vender mot rommet.
  const rx = nx > 0 ? sx + s - t : nx < 0 ? sx : sx + s * 0.1;
  const ry = nz > 0 ? sy + s - t : nz < 0 ? sy : sy + s * 0.1;
  const rw = nx ? t : s * 0.8;
  const rh = nz ? t : s * 0.8;
  ctx.fillStyle = '#cfe8f3';
  ctx.fillRect(rx, ry, rw, rh);
  ctx.strokeStyle = 'rgba(40, 90, 120, 0.8)';
  ctx.lineWidth = 1;
  ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);
  ctx.beginPath();
  if (nx) {
    ctx.moveTo(rx, ry + rh / 2);
    ctx.lineTo(rx + rw, ry + rh / 2);
  } else {
    ctx.moveTo(rx + rw / 2, ry);
    ctx.lineTo(rx + rw / 2, ry + rh);
  }
  ctx.stroke();
}
