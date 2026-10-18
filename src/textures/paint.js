// Små hjelpere for å male sømløse teksturer på canvas.

export function makeCanvas(S) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  return { canvas, ctx };
}

/** Kjører fn(x, y, i, data) for hver piksel; fn endrer data[i..i+2] direkte. */
export function pixelPass(ctx, S, fn) {
  const img = ctx.getImageData(0, 0, S, S);
  const d = img.data;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) fn(x, y, (y * S + x) * 4, d);
  }
  ctx.putImageData(img, 0, 0);
}

/** Ganger RGB med f (og eventuelt fargeskift per kanal). */
export function shade(d, i, f, fr = 1, fg = 1, fb = 1) {
  d[i] = Math.max(0, Math.min(255, d[i] * f * fr));
  d[i + 1] = Math.max(0, Math.min(255, d[i + 1] * f * fg));
  d[i + 2] = Math.max(0, Math.min(255, d[i + 2] * f * fb));
}

/** Tegner noe på alle posisjoner det kan «vikle seg» rundt kantene. */
export function wrapped(S, x, y, r, draw) {
  for (const ox of [-S, 0, S]) {
    for (const oy of [-S, 0, S]) {
      const cx = x + ox;
      const cy = y + oy;
      if (cx + r < 0 || cy + r < 0 || cx - r > S || cy - r > S) continue;
      draw(cx, cy);
    }
  }
}

/** Myk, rund flekk (vannskade, olje) som tåler kantene. */
export function blotch(ctx, S, x, y, r, inner, outer = 'rgba(0,0,0,0)') {
  wrapped(S, x, y, r, (cx, cy) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** Flekk med mørkere kant – typisk tørket vannskade. */
export function stainRing(ctx, S, x, y, r, rgb, alpha) {
  wrapped(S, x, y, r, (cx, cy) => {
    const g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
    g.addColorStop(0, `rgba(${rgb},${alpha * 0.35})`);
    g.addColorStop(0.82, `rgba(${rgb},${alpha * 0.55})`);
    g.addColorStop(0.92, `rgba(${rgb},${alpha})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  });
}
