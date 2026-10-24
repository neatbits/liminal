// Nivå 0: jevnt gult tapet og teppe med diskret tekstur. Standardhimlingen deles med
// andre temaer; Level 0 velger en egen, renere variant uten vannskader.
import { fbm } from './noise.js';
import { makeCanvas, pixelPass, shade, stainRing } from './paint.js';

export function wallpaperYellow(rand) {
  const S = 512;
  const { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = '#d8c47e';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 16; i++) {
    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(255,248,210,0.07)';
      ctx.fillRect(i * 32, 0, 32, S);
    }
    ctx.fillStyle = 'rgba(120,98,40,0.06)';
    ctx.fillRect(i * 32, 0, 1.5, S);
  }
  ctx.strokeStyle = 'rgba(122,100,42,0.16)';
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
  const paper = fbm(S, 4, 4, rand);
  const mottle = fbm(S, 16, 3, rand);
  pixelPass(ctx, S, (x, y, i, d) => {
    const f = 0.99 + 0.055 * (paper[y * S + x] - 0.5) + 0.02 * (mottle[y * S + x] - 0.5) + (rand() - 0.5) * 0.018;
    shade(d, i, f);
  });
  return canvas;
}

export function carpetDamp(rand) { // historisk teksturnøkkel; nå et jevnere, velholdt teppe
  const S = 512;
  const { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = '#b4a374';
  ctx.fillRect(0, 0, S, S);
  const pile = fbm(S, 3, 3, rand);
  const tuft = fbm(S, 32, 2, rand);
  pixelPass(ctx, S, (x, y, i, d) => {
    const fiber = Math.sin(x * 2.1) * Math.sin(y * 1.7) * 0.012;
    const f = 0.98 + (rand() - 0.5) * 0.09 + (tuft[y * S + x] - 0.5) * 0.08 +
      (pile[y * S + x] - 0.5) * 0.035 + fiber;
    shade(d, i, f);
  });
  return canvas;
}

export function ceilingTiles(rand, { clean = false } = {}) {
  const S = 512;
  const T = 256;
  const { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = clean ? '#e3dfcf' : '#d8d2b8';
  ctx.fillRect(0, 0, S, S);
  for (let ty = 0; ty < 2; ty++) {
    for (let tx = 0; tx < 2; tx++) {
      const alpha = clean ? 0.025 : 0.05;
      ctx.fillStyle = rand() < 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
      ctx.fillRect(tx * T, ty * T, T, T);
      if (!clean && rand() < 0.3) {
        stainRing(ctx, S, tx * T + 60 + rand() * 136, ty * T + 60 + rand() * 136, 25 + rand() * 40, '150,120,60', 0.1);
      }
    }
  }
  for (let k = 0; k < (clean ? 2600 : 9000); k++) {
    ctx.fillStyle = `rgba(80,74,60,${clean ? 0.08 + rand() * 0.08 : 0.2 + rand() * 0.25})`;
    ctx.fillRect(rand() * S, rand() * S, rand() < 0.3 ? 2 : 1, 1);
  }
  ctx.strokeStyle = clean ? 'rgba(100,95,80,0.09)' : 'rgba(100,95,80,0.22)';
  ctx.lineWidth = 1;
  for (let k = 0; k < (clean ? 40 : 160); k++) {
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
  ctx.fillStyle = clean ? '#f1eee3' : '#ebe8dd';
  for (const e of [0, T, S]) {
    ctx.fillRect(e - 4, 0, 8, S);
    ctx.fillRect(0, e - 4, S, 8);
  }
  return canvas;
}

export function levelZeroCeiling(rand) {
  return ceilingTiles(rand, { clean: true });
}
