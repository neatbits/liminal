// Teksturer for kjelleren: rent, beige teppe (med svake støvsugerstriper) og matt malt vegg.
import { fbm } from './noise.js';
import { makeCanvas, pixelPass, shade } from './paint.js';

export function carpetClean(rand) {
  const S = 512;
  const { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = '#d4c7af';
  ctx.fillRect(0, 0, S, S);
  const tuft = fbm(S, 64, 2, rand);
  const soft = fbm(S, 4, 3, rand);
  pixelPass(ctx, S, (x, y, i, d) => {
    // Fire striper per flis: annenhver vei med støvsugeren gir litt ulik glans.
    const stripe = Math.floor((x / S) * 4) % 2 ? 1.025 : 0.985;
    const f = stripe * (0.94 + (rand() - 0.5) * 0.16 + (tuft[y * S + x] - 0.5) * 0.14 + (soft[y * S + x] - 0.5) * 0.05);
    shade(d, i, f);
  });
  return canvas;
}

export function paintBeige(rand) {
  const S = 256;
  const { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = '#e6dac6';
  ctx.fillRect(0, 0, S, S);
  const peel = fbm(S, 48, 2, rand);
  const broad = fbm(S, 3, 3, rand);
  pixelPass(ctx, S, (x, y, i, d) => {
    shade(d, i, 0.97 + (peel[y * S + x] - 0.5) * 0.05 + (broad[y * S + x] - 0.5) * 0.04 + (rand() - 0.5) * 0.015);
  });
  return canvas;
}
