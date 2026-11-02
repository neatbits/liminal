// Heisene i skissen (core/elevators.js), i hver etasje: der heisen stopper vognen (metall), sjaktveggen og døren med
// en pil ut mot reposet, og etasjene den stopper i; der sjakten bare går forbi en mørk, kryssert blokk; ellers en
// svak stiplet kant.
import { footprint, elevatorStops, elevatorDir } from '../core/elevators.js';

const COLOR = '#6b4fa0'; // som trappene opp og stigene (render-stairwells.js, render-ladders.js)

function box(ctx, view, cells) {
  const xs = cells.map(([x]) => x);
  const zs = cells.map(([, z]) => z);
  const [x0, y0] = view.toScreen(Math.min(...xs), Math.min(...zs));
  const [x1, y1] = view.toScreen(Math.max(...xs) + 1, Math.max(...zs) + 1);
  return [x0, y0, x1 - x0, y1 - y0];
}

/** room: hele bygget; storey: etasjen som tegnes. */
export function drawElevators(ctx, view, room, storey) {
  const s = view.scale;
  ctx.save();
  ctx.lineWidth = Math.max(1, s * 0.06);
  for (const e of room.elevators ?? []) {
    const f = footprint(e);
    const stops = elevatorStops(room, e);
    const [x, y, w, h] = box(ctx, view, f.all);
    ctx.strokeStyle = COLOR;
    if (!stops.length || storey < stops[0] || storey > stops[stops.length - 1]) {
      ctx.setLineDash([s * 0.3, s * 0.2]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
      continue;
    }
    ctx.fillStyle = 'rgba(40, 32, 56, 0.75)';
    ctx.fillRect(x, y, w, h);
    if (!stops.includes(storey)) { // sjakten går forbi
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + w, y + h);
      ctx.moveTo(x + w, y); ctx.lineTo(x, y + h);
      ctx.stroke();
      ctx.strokeRect(x, y, w, h);
      continue;
    }
    const [cx, cy, cw, ch] = box(ctx, view, f.car);
    ctx.fillStyle = '#c9c7c1';
    ctx.fillRect(cx, cy, cw, ch);
    const [dx, dy, dw, dh] = box(ctx, view, f.door);
    ctx.fillStyle = '#9a978f';
    ctx.fillRect(dx, dy, dw, dh);
    ctx.strokeRect(x, y, w, h);
    const [ox, oz] = elevatorDir(e);
    const [mx, my] = [dx + dw / 2, dy + dh / 2];
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath(); // pilen ut av døren, mot reposet
    ctx.moveTo(mx - ox * s * 0.3, my - oz * s * 0.3);
    ctx.lineTo(mx + ox * s * 0.9, my + oz * s * 0.9);
    ctx.moveTo(mx + ox * s * 0.55 - oz * s * 0.3, my + oz * s * 0.55 + ox * s * 0.3);
    ctx.lineTo(mx + ox * s * 0.9, my + oz * s * 0.9);
    ctx.lineTo(mx + ox * s * 0.55 + oz * s * 0.3, my + oz * s * 0.55 - ox * s * 0.3);
    ctx.stroke();
    if (s >= 9) {
      ctx.fillStyle = '#2a2433';
      ctx.font = `${Math.round(Math.min(14, s * 0.42))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(stops.map((k) => k + 1).join('·'), cx + cw / 2, cy + ch / 2);
    }
  }
  ctx.restore();
}
