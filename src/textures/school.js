// Teksturer for skolen og sykehuset: flekket linoleum, malte murblokker, metallskap i
// korridoren, blankt vinylgulv og mintgrønn maling.
import { fbm } from './noise.js';
import { makeCanvas, pixelPass, shade } from './paint.js';

/** Linoleumsfliser på 30 cm (8 per 2,4 m) med fine flekker; hver femte rad i en mørkere tone. */
export function schoolFloor(rand) {
  const S = 512;
  const T = S / 8;
  const { canvas, ctx } = makeCanvas(S);
  for (let j = 0; j < 8; j++) {
    for (let i = 0; i < 8; i++) {
      const dark = j % 4 === 3 ? 0.88 : 1;
      const v = Math.round((206 + (rand() - 0.5) * 6) * dark);
      ctx.fillStyle = `rgb(${v},${v - 2},${v - 12})`;
      ctx.fillRect(i * T, j * T, T, T);
    }
  }
  for (let k = 0; k < 5000; k++) {
    ctx.fillStyle = rand() < 0.5 ? 'rgba(90,85,75,0.35)' : 'rgba(255,255,250,0.35)';
    ctx.fillRect(rand() * S, rand() * S, 1 + rand() * 1.5, 1 + rand() * 1.5);
  }
  ctx.strokeStyle = 'rgba(70,65,55,0.25)';
  for (let k = 0; k <= 8; k++) {
    ctx.beginPath();
    ctx.moveTo(k * T + 0.5, 0);
    ctx.lineTo(k * T + 0.5, S);
    ctx.moveTo(0, k * T + 0.5);
    ctx.lineTo(S, k * T + 0.5);
    ctx.stroke();
  }
  const n = fbm(S, 8, 3, rand);
  pixelPass(ctx, S, (x, y, i, d) => shade(d, i, 0.97 + (n[y * S + x] - 0.5) * 0.08));
  return canvas;
}

/** Malte murblokker (40 × 20 cm, forskjøvet) i blek kremfarge. */
export function blockWall(rand) {
  const S = 256;
  const { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = '#c9c2ae';
  ctx.fillRect(0, 0, S, S);
  const bw = S / 2;
  const bh = S / 8;
  for (let j = 0; j < 8; j++) {
    for (let i = -1; i < 3; i++) {
      const x = i * bw + (j % 2 ? bw / 2 : 0);
      const v = 228 + Math.round((rand() - 0.5) * 6);
      ctx.fillStyle = `rgb(${v},${v - 4},${v - 22})`;
      ctx.fillRect(x + 2, j * bh + 2, bw - 4, bh - 4);
    }
  }
  const n = fbm(S, 16, 3, rand);
  pixelPass(ctx, S, (x, y, i, d) => shade(d, i, 0.96 + (n[y * S + x] - 0.5) * 0.1));
  return canvas;
}

/** Metallskap: fire dører à 30 cm med lufteslisser, håndtak og nummerskilt. */
export function lockers(rand) {
  // Høyere enn bred (1,2 × 1,85 m), så den lages uten makeCanvas.
  const W = 256;
  const H = 384;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const dw = W / 4;
  ctx.fillStyle = '#2e3a40';
  ctx.fillRect(0, 0, W, H);
  for (let k = 0; k < 4; k++) {
    const x = k * dw;
    const v = (rand() - 0.5) * 10;
    ctx.fillStyle = `rgb(${62 + v},${120 + v},${132 + v})`;
    ctx.fillRect(x + 2, 4, dw - 4, H - 8);
    // Lufteslisser øverst og nederst.
    ctx.fillStyle = 'rgba(15,25,30,0.7)';
    for (const top of [20, H - 70]) for (let s = 0; s < 6; s++) ctx.fillRect(x + 14, top + s * 8, dw - 28, 3);
    // Håndtak og et lite nummerskilt.
    ctx.fillStyle = '#b9c0c2';
    ctx.fillRect(x + dw - 16, H * 0.48, 6, 26);
    ctx.fillStyle = '#e8e4d8';
    ctx.fillRect(x + dw / 2 - 9, 76, 18, 10);
  }
  return canvas;
}

/** Blankt vinylbelegg i blek grønnblå, med svake flekker og en sveis hver 2. meter. */
export function wardFloor(rand) {
  const S = 512;
  const { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = '#b9cfc8';
  ctx.fillRect(0, 0, S, S);
  for (let k = 0; k < 3500; k++) {
    ctx.fillStyle = rand() < 0.5 ? 'rgba(80,110,100,0.25)' : 'rgba(255,255,255,0.3)';
    ctx.fillRect(rand() * S, rand() * S, 1.5, 1.5);
  }
  ctx.fillStyle = 'rgba(60,80,75,0.35)';
  ctx.fillRect(0, S / 2, S, 2);
  const n = fbm(S, 6, 3, rand);
  pixelPass(ctx, S, (x, y, i, d) => shade(d, i, 0.97 + (n[y * S + x] - 0.5) * 0.07));
  return canvas;
}

/** Mintgrønn maling (nederste del av veggen på sykehuset). */
export function wardMint(rand) {
  const S = 256;
  const { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = '#9fc9b6';
  ctx.fillRect(0, 0, S, S);
  const n = fbm(S, 16, 2, rand);
  pixelPass(ctx, S, (x, y, i, d) => shade(d, i, 0.97 + (n[y * S + x] - 0.5) * 0.06));
  return canvas;
}
