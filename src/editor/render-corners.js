// Skrå og avrundede hjørner i 2D-skissen (core/corners.js): delen av ruten mot hjørnet males i
// naboenes farge – veggkilen grå, det åpnede hjørnet i gulvets farge – med en tynn strek langs grensen.
import { TILE } from '../core/level.js';
import { getTheme } from '../core/themes.js';
import { cornerShape } from '../core/corners.js';

const WALL = '#5a5d62';
const EDGE = 'rgba(30,30,28,0.55)';

export function drawCorners(ctx, view, level, r) {
  if (!level.corners?.some((v) => v)) return;
  const floor = getTheme(level.theme).plan.floor;
  for (let z = r.z0; z <= r.z1; z++) {
    for (let x = r.x0; x <= r.x1; x++) {
      if (!level.corners[z * level.w + x]) continue;
      const shape = cornerShape(level, x, z);
      if (!shape) continue;
      ctx.beginPath();
      shape.near.forEach(([px, pz], k) => {
        const [sx, sy] = view.toScreen(px, pz);
        if (k) ctx.lineTo(sx, sy);
        else ctx.moveTo(sx, sy);
      });
      ctx.closePath();
      ctx.fillStyle = shape.own === TILE.FLOOR ? WALL : floor;
      ctx.fill();
      ctx.beginPath();
      shape.boundary.forEach(([px, pz], k) => {
        const [sx, sy] = view.toScreen(px, pz);
        if (k) ctx.lineTo(sx, sy);
        else ctx.moveTo(sx, sy);
      });
      ctx.strokeStyle = EDGE;
      ctx.lineWidth = Math.max(1, view.scale / 16);
      ctx.stroke();
    }
  }
}
