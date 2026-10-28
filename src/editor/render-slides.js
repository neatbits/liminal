// Vannsklier i skissen: et bånd i sklienes farge langs banen med ring på toppen og pil mot
// vannet. Sklier som ikke virker tegnes røde og stiplet, og mens man drar
// vises en merkelapp med høyden eller hva som er galt.
import { slidePath, SLIDE_COLORS } from '../core/slides.js';

const LABEL = '#2c6f86';
const RED = '#c0492f';

function band(ctx, view, path, alpha) {
  const s = view.scale;
  const ok = !path.problem;
  const pts = path.samples.map((p) => view.toScreen(p.x, p.z));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  const colour = SLIDE_COLORS[path.color].plan;
  ctx.strokeStyle = ok ? colour : RED;
  ctx.lineWidth = Math.max(3, s * 0.95);
  if (!ok) ctx.setLineDash([s * 0.4, s * 0.25]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = ok ? '#cdeef7' : '#f6d3c8';
  ctx.lineWidth = Math.max(1.5, s * (path.tube ? 0.55 : 0.7));
  ctx.stroke();
  // Ring på toppen og pil ved utløpet.
  const [hx, hy] = pts[0];
  ctx.fillStyle = ok ? colour : RED;
  ctx.beginPath();
  ctx.arc(hx, hy, Math.max(3, s * 0.22), 0, Math.PI * 2);
  ctx.fill();
  if (pts.length >= 2) {
    const [ex, ey] = pts[pts.length - 1];
    const [px, py] = pts[Math.max(0, pts.length - 3)];
    const a = Math.atan2(ey - py, ex - px);
    const r = Math.max(5, s * 0.35);
    ctx.beginPath();
    ctx.moveTo(ex + Math.cos(a) * r, ey + Math.sin(a) * r);
    ctx.lineTo(ex + Math.cos(a + 2.4) * r, ey + Math.sin(a + 2.4) * r);
    ctx.lineTo(ex + Math.cos(a - 2.4) * r, ey + Math.sin(a - 2.4) * r);
    ctx.fill();
  }
  ctx.restore();
}

function label(ctx, view, path) {
  const end = path.samples[path.samples.length - 1];
  const [x, y] = view.toScreen(end.x, end.z);
  const text = path.problem ?? `${path.h0.toFixed(1)} m → ${path.drop ? 'pool on the floor below' : 'water'} · ${path.length.toFixed(0)} m`;
  ctx.save();
  ctx.font = '600 11px system-ui, sans-serif';
  const tw = ctx.measureText(text).width + 12;
  ctx.fillStyle = path.problem ? RED : LABEL;
  ctx.fillRect(x + 10, y - 22, tw, 17);
  ctx.fillStyle = '#fff';
  ctx.fillText(text, x + 16, y - 10);
  ctx.restore();
}

/**
 * Alle sklier i rommet, og eventuelt sklien man tegner nå ({ points, tube, color, drop }). below: etasjen
 * under – skliene ned fra denne etasjen er lagret der (core/slide-drops.js) og vises svakere.
 */
export function drawSlides(ctx, view, level, preview, below = null) {
  for (const slide of level.slides) band(ctx, view, slidePath(level, slide), 1);
  for (const slide of below?.slides ?? []) if (slide.drop) band(ctx, view, slidePath(below, slide), 0.55);
  if (preview?.points.length >= 2) {
    const path = slidePath(preview.drop ? below : level, preview);
    band(ctx, view, path, 0.8);
    label(ctx, view, { ...path, drop: preview.drop });
  }
}
