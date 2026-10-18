// Teksturer for parkeringskjelleren: betongvegg, betonggulv og malt nedre felt.
import { fbm, periodicNoise, smoothstep } from './noise.js';
import { makeCanvas, pixelPass, blotch } from './paint.js';

function setRGB(d, i, rgb, f) {
  d[i] = rgb[0] * f;
  d[i + 1] = rgb[1] * f;
  d[i + 2] = rgb[2] * f;
  d[i + 3] = 255;
}

export function concreteWall(rand) {
  const S = 512;
  const { canvas, ctx } = makeCanvas(S);
  const n1 = fbm(S, 4, 6, rand);
  const streaks = periodicNoise(64, 1, rand);
  const base = [146, 144, 138];
  pixelPass(ctx, S, (x, y, i, d) => {
    const n = n1[y * S + x];
    let f = 0.78 + 0.34 * n + (rand() - 0.5) * 0.08;
    f *= 1 - 0.18 * smoothstep(0.62, 0.9, streaks((x / S) * 64, 0)) * (0.4 + 0.6 * n);
    if (y % 128 < 2) f *= 0.9;
    if (rand() < 0.004) f *= 0.55;
    setRGB(d, i, base, f);
  });
  return canvas;
}

export function concreteFloor(rand) {
  const S = 512;
  const { canvas, ctx } = makeCanvas(S);
  const n1 = fbm(S, 3, 6, rand);
  const base = [118, 117, 113];
  pixelPass(ctx, S, (x, y, i, d) => {
    let f = 0.82 + 0.28 * n1[y * S + x] + (rand() - 0.5) * 0.1;
    if (x < 2 || y < 2) f *= 0.62;
    setRGB(d, i, base, f);
  });
  for (let k = 0; k < 5; k++) blotch(ctx, S, rand() * S, rand() * S, 20 + rand() * 40, 'rgba(25,22,18,0.3)');
  return canvas;
}

export function garagePaint(rand) {
  const S = 256;
  const { canvas, ctx } = makeCanvas(S);
  const n = fbm(S, 6, 4, rand);
  const paint = [78, 104, 96];
  const bare = [140, 138, 132];
  pixelPass(ctx, S, (x, y, i, d) => {
    const v = n[y * S + x];
    const f = 0.9 + 0.12 * v + (rand() - 0.5) * 0.06;
    setRGB(d, i, v > 0.78 ? bare : paint, v > 0.78 ? f * 0.92 : f);
  });
  return canvas;
}
