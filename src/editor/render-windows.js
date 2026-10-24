// Vinduer i skissen: en lyseblå glassflate med sprosse langs veggens side mot rommet.
import { windowInfo } from '../core/windows.js';
import { isShopfront, shopfrontNormal } from '../core/shopfronts.js';

export function drawWindow(ctx, view, level, x, z) {
  const n = isShopfront(level, x, z) && shopfrontNormal(level, x, z);
  if (n) {
    const [sx, sy] = view.toScreen(x, z), s = view.scale;
    ctx.fillStyle = '#b1cbca'; ctx.fillRect(sx + 1, sy + 1, s - 2, s - 2);
    ctx.strokeStyle = '#547b7e'; ctx.lineWidth = 1;
    const edge = sy + (n > 0 ? s - 2 : 2);
    ctx.beginPath(); ctx.moveTo(sx, edge); ctx.lineTo(sx + s, edge); ctx.stroke();
    return;
  }
  const win = windowInfo(level, x, z);
  if (!win) return;
  const s = view.scale;
  const [sx, sy] = view.toScreen(x, z);
  const [nx, nz] = win.n;
  const t = Math.max(2, s * 0.3); // tykkelse på glasset i skissen
  if (level.theme === 'pool') {
    const low = nx ? (nx > 0 ? win.left : win.right) : (nz > 0 ? win.right : win.left);
    const high = nx ? (nx > 0 ? win.right : win.left) : (nz > 0 ? win.left : win.right);
    const x0 = nx ? (nx > 0 ? sx + s - t : sx) : sx + low * s;
    const y0 = nz ? (nz > 0 ? sy + s - t : sy) : sy + low * s;
    const w = nx ? t : s * (1 - low - high), h = nz ? t : s * (1 - low - high);
    ctx.fillStyle = '#cfe8f3'; ctx.fillRect(x0, y0, w, h);
    ctx.strokeStyle = 'rgba(40, 90, 120, 0.8)'; ctx.lineWidth = 1; ctx.beginPath();
    if (nx) {
      ctx.moveTo(x0, y0); ctx.lineTo(x0, y0 + h); ctx.moveTo(x0 + w, y0); ctx.lineTo(x0 + w, y0 + h);
      if (low) { ctx.moveTo(x0, y0); ctx.lineTo(x0 + w, y0); }
      if (high) { ctx.moveTo(x0, y0 + h); ctx.lineTo(x0 + w, y0 + h); }
    } else {
      ctx.moveTo(x0, y0); ctx.lineTo(x0 + w, y0); ctx.moveTo(x0, y0 + h); ctx.lineTo(x0 + w, y0 + h);
      if (low) { ctx.moveTo(x0, y0); ctx.lineTo(x0, y0 + h); }
      if (high) { ctx.moveTo(x0 + w, y0); ctx.lineTo(x0 + w, y0 + h); }
    }
    ctx.stroke(); return;
  }
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
