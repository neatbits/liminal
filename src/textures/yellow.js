// Teksturer for Nivå 0: gult tapet, fuktig teppe og himlingsplater (brukes også av kontoret).
import { fbm, smoothstep } from './noise.js';
import { makeCanvas, pixelPass, shade, blotch, stainRing } from './paint.js';

export function wallpaperYellow(rand) {
  const S = 512;
  const { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = '#cdb96a';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 16; i++) {
    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(255,248,210,0.07)';
      ctx.fillRect(i * 32, 0, 32, S);
    }
    ctx.fillStyle = 'rgba(120,98,40,0.10)';
    ctx.fillRect(i * 32, 0, 1.5, S);
  }
  ctx.strokeStyle = 'rgba(122,100,42,0.22)';
  ctx.lineWidth = 1.6;
  for (let col = 1; col < 16; col += 2) {
    const cx = col * 32 + 16;
    for (let row = 0; row < 16; row++) {
      const cy = row * 32 + (col % 4 === 1 ? 8 : 24);
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy + 3);
      ctx.lineTo(cx, cy - 3);
      ctx.lineTo(cx + 6, cy + 3);
      ctx.stroke();
    }
  }
  const grime = fbm(S, 4, 5, rand);
  const mottle = fbm(S, 16, 3, rand);
  pixelPass(ctx, S, (x, y, i, d) => {
    const g = grime[y * S + x];
    const f = 0.86 + 0.2 * g + 0.06 * (mottle[y * S + x] - 0.5) + (rand() - 0.5) * 0.05;
    const stain = smoothstep(0.7, 0.88, g);
    shade(d, i, f * (1 - 0.08 * stain), 1, 1 - 0.02 * stain, 1 - 0.1 * stain);
  });
  for (let k = 0; k < 2; k++) stainRing(ctx, S, rand() * S, rand() * S, 30 + rand() * 50, '120,92,35', 0.07);
  return canvas;
}

export function carpetDamp(rand) {
  const S = 512;
  const { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = '#9c8c58';
  ctx.fillRect(0, 0, S, S);
  const damp = fbm(S, 3, 5, rand);
  const tuft = fbm(S, 32, 2, rand);
  pixelPass(ctx, S, (x, y, i, d) => {
    const f = 0.92 + (rand() - 0.5) * 0.24 + (tuft[y * S + x] - 0.5) * 0.22;
    const w = smoothstep(0.62, 0.88, damp[y * S + x]);
    shade(d, i, f * (1 - 0.14 * w), 1, 1 + 0.01 * w, 1 - 0.06 * w);
  });
  for (let k = 0; k < 3; k++) blotch(ctx, S, rand() * S, rand() * S, 18 + rand() * 40, 'rgba(60,48,20,0.12)');
  return canvas;
}

export function ceilingTiles(rand) {
  const S = 512;
  const T = 256;
  const { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = '#d8d2b8';
  ctx.fillRect(0, 0, S, S);
  for (let ty = 0; ty < 2; ty++) {
    for (let tx = 0; tx < 2; tx++) {
      ctx.fillStyle = rand() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
      ctx.fillRect(tx * T, ty * T, T, T);
      if (rand() < 0.3) {
        stainRing(ctx, S, tx * T + 60 + rand() * 136, ty * T + 60 + rand() * 136, 25 + rand() * 40, '150,120,60', 0.1);
      }
    }
  }
  for (let k = 0; k < 9000; k++) {
    ctx.fillStyle = `rgba(80,74,60,${0.2 + rand() * 0.25})`;
    ctx.fillRect(rand() * S, rand() * S, rand() < 0.3 ? 2 : 1, 1);
  }
  ctx.strokeStyle = 'rgba(100,95,80,0.22)';
  ctx.lineWidth = 1;
  for (let k = 0; k < 160; k++) {
    let x = rand() * S;
    let y = rand() * S;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < 4 + rand() * 4; s++) {
      x += (rand() - 0.5) * 6;
      y += (rand() - 0.5) * 6;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const n = fbm(S, 4, 3, rand);
  pixelPass(ctx, S, (x, y, i, d) => shade(d, i, 0.96 + 0.06 * n[y * S + x] + (rand() - 0.5) * 0.03));
  for (const e of [0, T, S]) {
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    ctx.fillRect(e + 4, 0, 2, S);
    ctx.fillRect(e - 6, 0, 2, S);
    ctx.fillRect(0, e + 4, S, 2);
    ctx.fillRect(0, e - 6, S, 2);
  }
  ctx.fillStyle = '#ebe8dd';
  for (const e of [0, T, S]) {
    ctx.fillRect(e - 4, 0, 8, S);
    ctx.fillRect(0, e - 4, S, 8);
  }
  return canvas;
}
