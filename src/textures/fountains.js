// Små dekorative mosaikkfliser og rosa kalkstein, brukt bare i kjøpesenterets bassenger.
import { fbm } from './noise.js';
import { makeCanvas, pixelPass, shade } from './paint.js';

export function mallMosaic(rand) {
  const S = 512, N = 10, T = S / N;
  const { canvas, ctx } = makeCanvas(S);
  const colors = ['#46645f', '#58756d', '#678277', '#405c59', '#7c9080'];
  ctx.fillStyle = '#9b9884';
  ctx.fillRect(0, 0, S, S);
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
    ctx.fillRect(x * T + 1, z * T + 1, T - 2, T - 2);
    ctx.fillStyle = 'rgba(224,230,211,0.13)';
    ctx.fillRect(x * T + 2, z * T + 2, T - 4, 2);
    // Diskrete lyse diamanter, uten bassengmarkeringer eller svømmebaner.
    if ((x === 2 || x === 7) && (z === 2 || z === 7)) {
      ctx.fillStyle = '#baaa78';
      ctx.beginPath(); ctx.moveTo((x + 0.5) * T, (z + 0.23) * T);
      ctx.lineTo((x + 0.77) * T, (z + 0.5) * T); ctx.lineTo((x + 0.5) * T, (z + 0.77) * T);
      ctx.lineTo((x + 0.23) * T, (z + 0.5) * T); ctx.closePath(); ctx.fill();
    }
  }
  const n = fbm(S, 16, 3, rand);
  pixelPass(ctx, S, (x, y, i, d) => shade(d, i, 0.96 + (n[y * S + x] - 0.5) * 0.12));
  return canvas;
}

export function fountainStone(rand) {
  const S = 512;
  const { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = '#c9b8b0';
  ctx.fillRect(0, 0, S, S);
  const n = fbm(S, 4, 4, rand);
  pixelPass(ctx, S, (x, y, i, d) => shade(d, i, 0.96 + (n[y * S + x] - 0.5) * 0.23 + (rand() - 0.5) * 0.05));
  ctx.fillStyle = 'rgba(103,92,89,0.4)';
  ctx.fillRect(0, 0, 2, S); ctx.fillRect(0, 0, S, 2);
  return canvas;
}
