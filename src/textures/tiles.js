// Teksturer for bassengrommene, kontoret og flislagte rom (bad, vaskerom).
import { fbm } from './noise.js';
import { makeCanvas, pixelPass, shade } from './paint.js';

export function poolTilesWith(rand, base, grout, N = 8) {
  const S = 512;
  const T = S / N;
  const { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = grout;
  ctx.fillRect(0, 0, S, S);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const v = Math.round((rand() - 0.5) * 8);
      ctx.fillStyle = `rgb(${base[0] + v},${base[1] + v},${base[2] + v})`;
      const x = i * T + 2;
      const y = j * T + 2;
      ctx.fillRect(x, y, T - 4, T - 4);
      const g = ctx.createLinearGradient(x, y, x + T, y + T);
      g.addColorStop(0, 'rgba(255,255,255,0.12)');
      g.addColorStop(0.5, 'rgba(255,255,255,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.05)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, T - 4, T - 4);
    }
  }
  const n = fbm(S, 4, 3, rand);
  pixelPass(ctx, S, (x, y, i, d) => shade(d, i, 0.97 + 0.05 * (n[y * S + x] - 0.5) + (rand() - 0.5) * 0.03));
  return canvas;
}

/**
 * Fliser med et farget bånd (Poolrooms, «Pink & cyan» i core/looks.js): `rows` rader, der radene i [from, to) har
 * båndets farge. Teksturen dekker hele den nedre delen av veggen én gang (1 × 1,25 m), så båndet ligger i fast høyde.
 */
export function poolTilesBand(rand, base, grout, band, bandGrout, rows = 10, [from, to] = [6, 9]) {
  const S = 512;
  const N = 8;
  const [T, R] = [S / N, S / rows];
  const { canvas, ctx } = makeCanvas(S);
  for (let j = 0; j < rows; j++) {
    const inBand = rows - 1 - j >= from && rows - 1 - j < to; // rad 0 er nederst på veggen (bunnen av teksturen)
    const [c, g] = inBand ? [band, bandGrout] : [base, grout];
    ctx.fillStyle = g;
    ctx.fillRect(0, j * R, S, R);
    for (let i = 0; i < N; i++) {
      const v = Math.round((rand() - 0.5) * 8);
      ctx.fillStyle = `rgb(${c[0] + v},${c[1] + v},${c[2] + v})`;
      ctx.fillRect(i * T + 2, j * R + 2, T - 4, R - 4);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(i * T + 2, j * R + 2, T - 4, 3);
    }
  }
  const n = fbm(S, 4, 3, rand);
  pixelPass(ctx, S, (x, y, i, d) => shade(d, i, 0.97 + 0.05 * (n[y * S + x] - 0.5) + (rand() - 0.5) * 0.03));
  return canvas;
}

export function poolTiles(rand) {
  return poolTilesWith(rand, [234, 239, 239], '#b7c2c3');
}

export function poolTilesBlue(rand) {
  return poolTilesWith(rand, [140, 196, 212], '#76a6b3');
}

/** Hvite veggfliser, 15 cm (fire per tekstur på 0,6 m). */
export function tileWallWhite(rand) {
  return poolTilesWith(rand, [236, 236, 231], '#c4c4bd', 4);
}

/** Grå gulvfliser, 30 cm (tre per tekstur på 0,9 m). */
export function tileFloorGrey(rand) {
  return poolTilesWith(rand, [112, 114, 115], '#8a8c8c', 3);
}

export function officeWall(rand, base = '#cbc7ba') {
  const S = 256;
  const { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);
  const n = fbm(S, 4, 5, rand);
  pixelPass(ctx, S, (x, y, i, d) => shade(d, i, 0.95 + 0.1 * (n[y * S + x] - 0.5) + (rand() - 0.5) * 0.04));
  return canvas;
}

export function officeCarpet(rand, base = [84, 90, 102]) {
  const S = 512;
  const { canvas, ctx } = makeCanvas(S);
  const n = fbm(S, 8, 3, rand);
  pixelPass(ctx, S, (x, y, i, d) => {
    const dir = ((x >> 8) + (y >> 8)) & 1;
    const s = Math.sin((dir ? x : y) * 1.1 + n[y * S + x] * 8) * 0.5 + 0.5;
    let f = 0.85 + 0.12 * s + (rand() - 0.5) * 0.25;
    const fleck = rand();
    if (fleck < 0.03) f += 0.35;
    else if (fleck < 0.06) f -= 0.25;
    if ((x & 255) < 2 || (y & 255) < 2) f *= 0.72;
    d[i] = base[0] * f;
    d[i + 1] = base[1] * f;
    d[i + 2] = base[2] * f;
    d[i + 3] = 255;
  });
  return canvas;
}
