// Tegner lyspaneler i 2D-skissen: et svakt fargefyll med lys kant over rutene fra core/panels.js.
import { PANEL_COLORS, panelCells } from '../core/panels.js';

export function drawPanels(ctx, view, level, r) {
  const s = view.scale;
  for (const { x, z, type } of panelCells(level)) {
    if (x < r.x0 || x > r.x1 || z < r.z0 || z > r.z1) continue;
    const { hex } = PANEL_COLORS[type];
    const [sx, sy] = view.toScreen(x, z);
    ctx.fillStyle = hex + '40'; // ~25 % dekkevne
    ctx.fillRect(sx, sy, s, s);
    ctx.fillStyle = hex + 'cc'; // lysere kant øverst antyder taket
    ctx.fillRect(sx, sy, s, Math.max(2, s * 0.09));
  }
}
