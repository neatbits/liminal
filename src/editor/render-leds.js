// Tegner LED-striper i 2D-skissen: fargede remser på veggflatene fra core/leds.js (de samme som i 3D).
import { LED_COLORS, ledFaces } from '../core/leds.js';

export function drawLeds(ctx, view, level, r) {
  const s = view.scale;
  const thick = Math.max(2, s * 0.12);
  for (const { x, z, dx, dz, color } of ledFaces(level)) {
    if (x < r.x0 || x > r.x1 || z < r.z0 || z > r.z1) continue;
    const [sx, sy] = view.toScreen(x, z);
    ctx.fillStyle = LED_COLORS[color];
    if (dx === 1) ctx.fillRect(sx + s - thick, sy, thick, s);
    else if (dx === -1) ctx.fillRect(sx, sy, thick, s);
    else if (dz === 1) ctx.fillRect(sx, sy + s - thick, s, thick);
    else ctx.fillRect(sx, sy, s, thick);
  }
}
