// Teksturer for kjøpesenteret: blanke terrazzofliser, glatt puss, steinpanel nederst på
// veggene og en lys himling med skjøter.
import { fbm } from './noise.js';
import { makeCanvas, pixelPass, shade } from './paint.js';

/** Terrazzo: 4 × 4 fliser à 0,6 m i to beigetoner (rutemønster) med flekker og blank glans. */
export function mallFloor(rand) {
  const S = 512;
  const T = S / 4;
  const { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = '#a99c86';
  ctx.fillRect(0, 0, S, S);
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = (i + j) % 2 ? '#e3d8c4' : '#d6c8ae';
      ctx.fillRect(i * T + 1, j * T + 1, T - 2, T - 2);
    }
  }
  // Flekkene i terrazzoen: små steinbiter i brunt, grått og hvitt.
  const chips = ['#8d7d66', '#b6ab98', '#f4efe4', '#6f6a62', '#c9a982'];
  for (let k = 0; k < 2600; k++) {
    ctx.fillStyle = chips[Math.floor(rand() * chips.length)];
    const r = 0.6 + rand() * 1.6;
    ctx.beginPath();
    ctx.arc(rand() * S, rand() * S, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 4; i++) {
      const g = ctx.createLinearGradient(i * T, j * T, (i + 1) * T, (j + 1) * T);
      g.addColorStop(0, 'rgba(255,255,255,0.10)');
      g.addColorStop(0.6, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(i * T + 1, j * T + 1, T - 2, T - 2);
    }
  }
  const n = fbm(S, 8, 3, rand);
  pixelPass(ctx, S, (x, y, i, d) => shade(d, i, 0.97 + (n[y * S + x] - 0.5) * 0.08));
  return canvas;
}

/** Glatt, varmhvit puss. */
export function mallWall(rand) {
  const S = 256;
  const { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = '#ece5d7';
  ctx.fillRect(0, 0, S, S);
  const n = fbm(S, 16, 3, rand);
  pixelPass(ctx, S, (x, y, i, d) => shade(d, i, 0.97 + (n[y * S + x] - 0.5) * 0.06));
  return canvas;
}

/** Steinpanel nederst på veggen: to plater à 0,6 m i lys kalkstein, med skjøt. */
export function mallStone(rand) {
  const S = 256;
  const { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = '#9d907a';
  ctx.fillRect(0, 0, S, S);
  for (let k = 0; k < 2; k++) {
    ctx.fillStyle = k ? '#cfc2a8' : '#c9bba0';
    ctx.fillRect((k * S) / 2 + 1, 1, S / 2 - 2, S - 2);
  }
  const vein = fbm(S, 4, 4, rand, 0.6);
  pixelPass(ctx, S, (x, y, i, d) => shade(d, i, 0.93 + (vein[y * S + x] - 0.5) * 0.18));
  return canvas;
}

/** Himling: lyse gipsplater på 1,2 m med smale skjøter. */
export function mallCeiling(rand) {
  const S = 256;
  const T = S / 2;
  const { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = '#c9c4ba';
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#efebe3';
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) ctx.fillRect(i * T + 1, j * T + 1, T - 2, T - 2);
  const n = fbm(S, 16, 2, rand);
  pixelPass(ctx, S, (x, y, i, d) => shade(d, i, 0.98 + (n[y * S + x] - 0.5) * 0.05));
  return canvas;
}
