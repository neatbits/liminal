// Teksturer for hotellgangen: mønstret teppe, tapet, trepanel og hvitt puss.
import { fbm, periodicNoise } from './noise.js';
import { makeCanvas, pixelPass, shade } from './paint.js';

function diamond(ctx, cx, cy, r) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
}

export function hotelCarpet(rand) {
  const S = 512;
  const C = 128;
  const { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = '#6e161a';
  ctx.fillRect(0, 0, S, S);
  for (let cy = 0; cy < 4; cy++) {
    for (let cx = 0; cx < 4; cx++) {
      const x = cx * C + C / 2;
      const y = cy * C + C / 2;
      diamond(ctx, x, y, 60);
      ctx.strokeStyle = '#b07a38';
      ctx.lineWidth = 6;
      ctx.stroke();
      diamond(ctx, x, y, 34);
      ctx.fillStyle = '#4c0e12';
      ctx.fill();
      ctx.strokeStyle = '#c98a3e';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#d9963f';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = '#c98a3e';
  for (let cy = 0; cy <= 4; cy++) {
    for (let cx = 0; cx <= 4; cx++) {
      diamond(ctx, cx * C, cy * C, 9);
      ctx.fill();
    }
  }
  const n = fbm(S, 8, 3, rand);
  pixelPass(ctx, S, (x, y, i, d) => shade(d, i, 0.88 + (rand() - 0.5) * 0.22 + 0.08 * (n[y * S + x] - 0.5)));
  return canvas;
}

export function hotelWallpaper(rand) {
  const S = 512;
  const W = 64;
  const { canvas, ctx } = makeCanvas(S);
  for (let i = 0; i < S / W; i++) {
    ctx.fillStyle = i % 2 ? '#b59f7c' : '#c2ad8a';
    ctx.fillRect(i * W, 0, W, S);
    ctx.fillStyle = 'rgba(150,118,70,0.5)';
    ctx.fillRect(i * W, 0, 2, S);
    for (let j = 0; j < S / W; j++) {
      ctx.fillStyle = i % 2 ? 'rgba(120,95,60,0.35)' : 'rgba(150,115,70,0.45)';
      if (i % 2) {
        ctx.beginPath();
        ctx.arc(i * W + W / 2, j * W, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        diamond(ctx, i * W + W / 2, j * W + W / 2, 7);
        ctx.fill();
      }
    }
  }
  const n = fbm(S, 3, 4, rand);
  pixelPass(ctx, S, (x, y, i, d) => shade(d, i, 0.9 + 0.16 * n[y * S + x] + (rand() - 0.5) * 0.06));
  return canvas;
}

export function hotelWood(rand) {
  const S = 512;
  const { canvas, ctx } = makeCanvas(S);
  const grain = periodicNoise(48, 2, rand);
  const fine = fbm(S, 64, 2, rand, 0.5, 4);
  const base = [88, 54, 32];
  pixelPass(ctx, S, (x, y, i, d) => {
    const g = grain((x / S) * 48 + fine[y * S + x] * 0.8, (y / S) * 2);
    const f = 0.8 + 0.3 * g + (rand() - 0.5) * 0.06;
    d[i] = base[0] * f;
    d[i + 1] = base[1] * f;
    d[i + 2] = base[2] * f;
    d[i + 3] = 255;
  });
  for (let p = 0; p < 2; p++) {
    const x = p * 256 + 30;
    const y = 50;
    const w = 196;
    const h = 372;
    ctx.fillStyle = 'rgba(255,200,150,0.05)';
    ctx.fillRect(x, y, w, h);
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(255,215,170,0.16)';
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(0, 0, 2, S);
  ctx.fillRect(S - 1, 0, 1, S);
  ctx.fillRect(255, 0, 3, S);
  return canvas;
}

export function plaster(rand) {
  const S = 256;
  const { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = '#ded8cc';
  ctx.fillRect(0, 0, S, S);
  const n = fbm(S, 4, 4, rand);
  pixelPass(ctx, S, (x, y, i, d) => shade(d, i, 0.95 + 0.08 * n[y * S + x] + (rand() - 0.5) * 0.03));
  return canvas;
}
