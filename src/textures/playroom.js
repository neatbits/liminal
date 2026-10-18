// Teksturer for lekerommet: puslematter i skumgummi, lys malt vegg, et fargebånd nederst og
// bunnen av ballbingene.
import { fbm } from './noise.js';
import { makeCanvas, pixelPass, shade } from './paint.js';

const MAT = ['#c9483d', '#2f72b0', '#d9a92a', '#3f8f52'];

/** Puslematter: 4 × 4 matter à 0,6 m (tekstur 2,4 m) i fire farger, med «tenner» i skjøtene. */
export function foamMat(rand) {
  const S = 512;
  const T = S / 4;
  const { canvas, ctx } = makeCanvas(S);
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = MAT[(i + 2 * j) % 4];
      ctx.fillRect(i * T, j * T, T, T);
    }
  }
  // Tennene: små firkanter fra hver matte inn i naboen langs skjøtene.
  const tooth = T / 8;
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 4; i++) {
      for (let k = 1; k < 8; k += 2) {
        ctx.fillStyle = MAT[(i + 2 * j) % 4];
        ctx.fillRect((i + 1) * T - 1, j * T + k * tooth, tooth, tooth); // inn i matten til høyre
        ctx.fillRect(i * T + k * tooth, (j + 1) * T - 1, tooth, tooth); // inn i matten under
      }
    }
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 1;
  for (let k = 0; k <= 4; k++) {
    ctx.beginPath();
    ctx.moveTo(k * T + 0.5, 0);
    ctx.lineTo(k * T + 0.5, S);
    ctx.moveTo(0, k * T + 0.5);
    ctx.lineTo(S, k * T + 0.5);
    ctx.stroke();
  }
  const pores = fbm(S, 64, 2, rand);
  pixelPass(ctx, S, (x, y, i, d) => shade(d, i, 0.93 + (pores[y * S + x] - 0.5) * 0.12 + (rand() - 0.5) * 0.05));
  return canvas;
}

export function playWall(rand) {
  const S = 256;
  const { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = '#efe9de';
  ctx.fillRect(0, 0, S, S);
  const n = fbm(S, 32, 2, rand);
  pixelPass(ctx, S, (x, y, i, d) => shade(d, i, 0.97 + (n[y * S + x] - 0.5) * 0.05));
  return canvas;
}

/** Fargebånd nederst på veggen: blokker i rødt, gult, blått og grønt. */
export function playStripe(rand) {
  const S = 256;
  const { canvas, ctx } = makeCanvas(S);
  const colors = ['#d9473b', '#e8b52c', '#2f78bd', '#45995a'];
  for (let k = 0; k < 4; k++) {
    ctx.fillStyle = colors[k];
    ctx.fillRect((k * S) / 4, 0, S / 4, S);
  }
  const n = fbm(S, 16, 2, rand);
  pixelPass(ctx, S, (x, y, i, d) => shade(d, i, 0.95 + (n[y * S + x] - 0.5) * 0.08));
  return canvas;
}

/** Bunnen av ballbingen: mørkere, tett pakkede baller lenger ned (synes i glippene). */
export function ballBed(rand) {
  const S = 256;
  const { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = '#231d19';
  ctx.fillRect(0, 0, S, S);
  const colors = ['#8a2420', '#1f6431', '#9c7d14', '#1d4a8a'];
  for (let k = 0; k < 420; k++) {
    const x = rand() * S;
    const y = rand() * S;
    const r = 7 + rand() * 3;
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, colors[Math.floor(rand() * colors.length)]);
    g.addColorStop(1, '#120e0c');
    ctx.fillStyle = g;
    // Tegnes også på motsatt kant, så teksturen er sømløs.
    for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) {
      ctx.beginPath();
      ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return canvas;
}
