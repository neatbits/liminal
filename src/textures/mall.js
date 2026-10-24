// Teksturer for kjøpesenteret: blanke terrazzofliser, glatt puss, steinpanel nederst på
// veggene og en lys himling med skjøter.
import { fbm } from './noise.js';
import { makeCanvas, pixelPass, shade } from './paint.js';

/** Small polished cream tiles, dusty rose accents and teal diamond insets (30 cm grid). */
export function mallFloor(rand) {
  const S = 512, T = S / 8;
  const { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = '#a79a96'; ctx.fillRect(0, 0, S, S);
  for (let z = 0; z < 8; z++) for (let x = 0; x < 8; x++) {
    const rose = (x === 0 || z === 0) && (x + z) % 2 === 0;
    const colors = rose ? ['#c79c9b', '#cfa6a2'] : ['#ded3c6', '#e5d8cb', '#e3d5c9', '#d8c9c2'];
    ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
    ctx.fillRect(x * T + 1, z * T + 1, T - 2, T - 2);
    ctx.strokeStyle = 'rgba(255,248,235,0.28)'; ctx.lineWidth = 1;
    ctx.strokeRect(x * T + 2, z * T + 2, T - 4, T - 4);
  }
  // Sparse diamonds sit within the finer grid, rather than forming a checkerboard.
  for (const [x, z] of [[2, 2], [6, 6]]) {
    const cx = (x + 0.5) * T, cz = (z + 0.5) * T, r = T * 0.43;
    ctx.fillStyle = '#527d7c'; ctx.beginPath();
    ctx.moveTo(cx, cz - r); ctx.lineTo(cx + r, cz); ctx.lineTo(cx, cz + r); ctx.lineTo(cx - r, cz); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ac976f'; ctx.lineWidth = 2; ctx.stroke();
  }
  const chips = ['#9e9291', '#b8a9a3', '#f5ece1'];
  for (let k = 0; k < 2200; k++) {
    ctx.fillStyle = chips[k % chips.length];
    ctx.globalAlpha = 0.23;
    ctx.fillRect(rand() * S, rand() * S, 0.5 + rand(), 0.5 + rand());
  }
  ctx.globalAlpha = 1;
  return canvas;
}

/** Glatt, varmhvit puss. */
export function mallWall(rand) {
  const S = 256;
  const { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = '#e9ded2';
  ctx.fillRect(0, 0, S, S);
  const n = fbm(S, 16, 3, rand);
  pixelPass(ctx, S, (x, y, i, d) => shade(d, i, 0.97 + (n[y * S + x] - 0.5) * 0.06));
  return canvas;
}

/** Steinpanel nederst på veggen: to plater à 0,6 m i lys kalkstein, med skjøt. */
export function mallStone(rand) {
  const S = 256;
  const { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = '#a49a9e';
  ctx.fillRect(0, 0, S, S);
  for (let k = 0; k < 2; k++) {
    ctx.fillStyle = k ? '#d0c3c4' : '#c7babc';
    ctx.fillRect((k * S) / 2 + 1, 1, S / 2 - 2, S - 2);
  }
  const vein = fbm(S, 4, 4, rand, 0.6);
  pixelPass(ctx, S, (x, y, i, d) => shade(d, i, 0.93 + (vein[y * S + x] - 0.5) * 0.18));
  return canvas;
}

/** Perforert metallhimling med varm rosa tone, innrammet i 1,2 m store felt. */
export function mallCeiling(rand) {
  const S = 512;
  const T = S / 2;
  const { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = '#d1b9bc';
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#f0dadd';
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) ctx.fillRect(i * T + 1, j * T + 1, T - 2, T - 2);
  const n = fbm(S, 16, 2, rand);
  pixelPass(ctx, S, (x, y, i, d) => shade(d, i, 0.98 + (n[y * S + x] - 0.5) * 0.05));
  ctx.fillStyle = '#ac9297';
  for (let y = 8; y < S; y += 8) for (let x = 8; x < S; x += 8) {
    if (x % T < 6 || y % T < 6) continue;
    ctx.beginPath(); ctx.ellipse(x, y, 1.8, 1.3, 0, 0, Math.PI * 2); ctx.fill();
  }
  return canvas;
}

/** Butikkteppe: tett, blågrått nålefilt med et diskret rutemønster (2 m). */
export function shopCarpet(rand) {
  const S = 256;
  const { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = '#6f7682';
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(40,46,58,0.25)';
  ctx.lineWidth = 2;
  for (let k = 0; k <= 8; k++) {
    ctx.beginPath();
    ctx.moveTo((k * S) / 8, 0);
    ctx.lineTo((k * S) / 8, S);
    ctx.moveTo(0, (k * S) / 8);
    ctx.lineTo(S, (k * S) / 8);
    ctx.stroke();
  }
  const n = fbm(S, 32, 3, rand);
  pixelPass(ctx, S, (x, y, i, d) => shade(d, i, 0.92 + (n[y * S + x] - 0.5) * 0.12 + (rand() - 0.5) * 0.12));
  return canvas;
}
