import { makeCanvas } from './paint.js';
import { SHOP_PROFILES } from '../core/shopfronts.js';

/** One atlas for eight fictional shop identities, with period lettering and pinstripes. */
export function shopSigns() {
  const { canvas, ctx } = makeCanvas(1024);
  for (let row = 0; row < 8; row++) {
    const p = SHOP_PROFILES[row % 4], y = row * 128;
    ctx.fillStyle = p.color;
    ctx.fillRect(0, y, 1024, 128);
    ctx.strokeStyle = '#ead9b3'; ctx.lineWidth = 3;
    ctx.strokeRect(14, y + 9, 996, 110);
    ctx.fillStyle = p.ink; ctx.textAlign = 'center';
    ctx.font = row % 4 === 2 ? 'bold 52px monospace' : row % 4 === 0 ? '48px Georgia, serif' : 'bold 45px sans-serif';
    ctx.fillText(p.names[row < 4 ? 0 : 1], 512, y + 66, 950);
    ctx.font = '18px sans-serif';
    ctx.fillText(p.subtitle, 512, y + 99);
  }
  return canvas;
}
