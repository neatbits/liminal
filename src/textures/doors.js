// Dørblad: hele teksturen dekker ett dørblad (0,92 × 2 m), så lerretet (kvadratisk) strekkes
// i høyden. Fabrikkene tar en grunnfarge og gir en maler (rand) → canvas.
import { fbm } from './noise.js';
import { makeCanvas, pixelPass, shade } from './paint.js';

const S = 256;
const py = (m) => Math.round((m / 2) * S); // meter i høyden → piksler
const px = (m) => Math.round((m / 0.92) * S); // meter i bredden → piksler

function finish(ctx, rand, grain) {
  const fine = fbm(S, 32, 2, rand);
  const streak = grain ? fbm(S, 24, 4, rand, 0.5, 2) : null; // loddrette årer
  pixelPass(ctx, S, (x, y, i, d) => {
    let f = 0.98 + (fine[y * S + x] - 0.5) * 0.04 + (rand() - 0.5) * 0.02;
    if (streak) f *= 0.9 + streak[y * S + x] * 0.2;
    shade(d, i, f);
  });
}

/** Fyllingsdør med seks speil (to små øverst, to høye i midten, to nederst). */
export function doorPanel(color, { grain = false } = {}) {
  return (rand) => {
    const { canvas, ctx } = makeCanvas(S);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, S, S);
    const stile = px(0.12);
    const mid = px(0.06);
    const rows = [
      [py(0.12), py(0.46)],
      [py(0.58), py(1.28)],
      [py(1.42), py(1.86)],
    ];
    const cols = [
      [stile, S / 2 - mid / 2],
      [S / 2 + mid / 2, S - stile],
    ];
    for (const [y0, y1] of rows) {
      for (const [x0, x1] of cols) {
        ctx.fillStyle = 'rgba(0,0,0,0.05)';
        ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.fillRect(x0, y0, x1 - x0, 2);
        ctx.fillRect(x0, y0, 3, y1 - y0);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(x0, y1 - 2, x1 - x0, 2);
        ctx.fillRect(x1 - 3, y0, 3, y1 - y0);
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.strokeRect(x0 + 8.5, y0 + 4.5, x1 - x0 - 17, y1 - y0 - 9);
      }
    }
    finish(ctx, rand, grain);
    return canvas;
  };
}

/** Lamelldør (bod/skap): skrå lameller i to felt. */
export function doorLouver(color) {
  return (rand) => {
    const { canvas, ctx } = makeCanvas(S);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, S, S);
    const stile = px(0.1);
    const fields = [
      [py(0.1), py(0.92)],
      [py(1.06), py(1.9)],
    ];
    for (const [y0, y1] of fields) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(stile, y0, S - 2 * stile, y1 - y0);
      for (let y = y0; y < y1; y += 5) {
        const g = ctx.createLinearGradient(0, y, 0, y + 5);
        g.addColorStop(0, 'rgba(255,255,255,0.0)');
        g.addColorStop(0.6, 'rgba(0,0,0,0.0)');
        g.addColorStop(1, 'rgba(0,0,0,0.35)');
        ctx.fillStyle = color;
        ctx.fillRect(stile, y, S - 2 * stile, 4);
        ctx.fillStyle = g;
        ctx.fillRect(stile, y, S - 2 * stile, 5);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(stile, y0, S - 2 * stile, 2);
    }
    finish(ctx, rand, false);
    return canvas;
  };
}

/** Glatt dør (eventuelt med treårer). */
export function doorFlat(color, { grain = false } = {}) {
  return (rand) => {
    const { canvas, ctx } = makeCanvas(S);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, S, S);
    finish(ctx, rand, grain);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, 0, 2, S);
    ctx.fillRect(S - 2, 0, 2, S);
    return canvas;
  };
}
