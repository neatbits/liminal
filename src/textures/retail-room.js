// Surface finishes for the quieter shops: large porcelain, technical tiles and a café checker.
import { makeCanvas, pixelPass, shade } from './paint.js';

function tiles(rand, cells, colors, grout, flecks = true) {
  const S = 512, T = S / cells, { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = grout; ctx.fillRect(0, 0, S, S);
  for (let y = 0; y < cells; y++) for (let x = 0; x < cells; x++) {
    ctx.fillStyle = colors[(x + y) % colors.length];
    ctx.fillRect(x * T + 1, y * T + 1, T - 2, T - 2);
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.strokeRect(x * T + 2, y * T + 2, T - 4, T - 4);
  }
  if (flecks) for (let i = 0; i < 1700; i++) {
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.09)' : 'rgba(30,30,40,.07)';
    ctx.fillRect(rand() * S, rand() * S, 1, 1);
  }
  pixelPass(ctx, S, (x, y, i, d) => shade(d, i, .97 + rand() * .06));
  return canvas;
}

export const retailFloor = rand => tiles(rand, 4, ['#d7cbb8', '#e0d5c3'], '#9e9588');
export const electronicsFloor = rand => tiles(rand, 4, ['#52616b', '#596771'], '#373f48');
export const cafeFloor = rand => tiles(rand, 8, ['#dacdb5', '#9a6b61'], '#a89786');

export function electronicsWall(rand) {
  const S = 512, { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = '#a9b5b9'; ctx.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 32) {
    ctx.fillStyle = '#65757e'; ctx.fillRect(0, y, S, 3);
    ctx.fillStyle = '#c5cdd0'; ctx.fillRect(0, y + 3, S, 1);
  }
  // Low blue-grey kick panel, matching the cool metal shelves and CRTs.
  ctx.fillStyle = '#546773'; ctx.fillRect(0, S * .73, S, S * .27);
  ctx.fillStyle = '#799ca7'; ctx.fillRect(0, S * .73, S, 5);
  pixelPass(ctx, S, (x, y, i, d) => shade(d, i, .97 + rand() * .06));
  return canvas;
}

export function cafeTiles(rand) {
  const S = 512, W = S / 4, H = S / 8, { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = '#9b8579'; ctx.fillRect(0, 0, S, S);
  for (let y = 0; y < 8; y++) for (let x = -1; x <= 4; x++) {
    ctx.fillStyle = y % 2 ? '#874f59' : '#925c63';
    ctx.fillRect(x * W + (y % 2) * W / 2 + 1, y * H + 1, W - 2, H - 2);
    ctx.fillStyle = 'rgba(255,240,224,.14)';
    ctx.fillRect(x * W + (y % 2) * W / 2 + 2, y * H + 2, W - 4, 2);
  }
  pixelPass(ctx, S, (x, y, i, d) => shade(d, i, .96 + rand() * .08));
  return canvas;
}
