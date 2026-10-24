// Original 1990s space carpet and painted arcade walls, with seamless wrapped motifs.
import { fbm } from './noise.js';
import { makeCanvas, pixelPass, shade, wrapped, blotch } from './paint.js';

export function arcadeCarpet(rand) {
  const S = 768, { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = '#111223'; ctx.fillRect(0, 0, S, S);
  for (let k = 0; k < 100; k++) {
    const color = ['111,48,157', '45,64,157', '148,40,111'][k % 3];
    blotch(ctx, S, rand() * S, rand() * S, 25 + rand() * 75, `rgba(${color},.48)`);
  }
  const inks = ['#b79946', '#b9683e', '#6f96af', '#9563ae', '#b85e91', '#55a5a0'];
  for (let k = 0; k < 1500; k++) {
    ctx.fillStyle = inks[k % inks.length];
    const s = .7 + rand() * 1.8; ctx.fillRect(rand() * S, rand() * S, s, s);
  }
  for (let k = 0; k < 66; k++) {
    const x = rand() * S, y = rand() * S, r = 5 + rand() * 10;
    const color = inks[k % inks.length], angle = rand() * Math.PI;
    wrapped(S, x, y, r * 2, (cx, cy) => {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle); ctx.fillStyle = color; ctx.strokeStyle = color;
      if (k % 3 === 0) {
        // Ringed planets.
        ctx.beginPath(); ctx.arc(0, 0, r * .65, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.5, r * .36, -.2, 0, Math.PI * 2); ctx.stroke();
      } else if (k % 3 === 1) {
        // Four-point starbursts.
        ctx.beginPath();
        for (let p = 0; p < 8; p++) {
          const a = p * Math.PI / 4, rr = p % 2 ? r * .2 : r;
          ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath(); ctx.fill();
      } else {
        // Swept comets and zigzags.
        ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-r, r * .4); ctx.lineTo(0, -r * .3);
        ctx.lineTo(r * .35, r * .3); ctx.lineTo(r, -r); ctx.stroke();
      }
      ctx.restore();
    });
  }
  const grain = fbm(S, 96, 2, rand);
  pixelPass(ctx, S, (x, y, i, d) => shade(d, i, .82 + grain[y * S + x] * .3 + (rand() - .5) * .24));
  return canvas;
}

export function arcadeWall(rand) {
  const S = 512, { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = '#242331'; ctx.fillRect(0, 0, S, S);
  const n = fbm(S, 16, 2, rand);
  pixelPass(ctx, S, (x, y, i, d) => shade(d, i, .93 + n[y * S + x] * .12));
  // A restrained cosmic frieze above the black lower wall, with teal/purple paint bands.
  for (const [y, color, width] of [[324, '#766095', 5], [334, '#456781', 3]]) {
    ctx.fillStyle = color; ctx.fillRect(0, y, S, width);
  }
  for (let k = 0; k < 20; k++) {
    const x = rand() * S, y = 120 + rand() * 170, r = 2 + rand() * 5;
    ctx.strokeStyle = k % 2 ? '#5c527d' : '#3f6773'; ctx.lineWidth = 1.5;
    wrapped(S, x, y, r * 2, (cx, cy) => {
      ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
      ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke();
    });
  }
  return canvas;
}

export function arcadePanel(rand) {
  const S = 256, { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = '#24252c'; ctx.fillRect(0, 0, S, S);
  for (let x = 0; x < S; x += 16) {
    ctx.fillStyle = '#191a23'; ctx.fillRect(x, 0, 2, S);
    ctx.fillStyle = '#30303b'; ctx.fillRect(x + 2, 0, 1, S);
  }
  pixelPass(ctx, S, (x, y, i, d) => shade(d, i, .95 + rand() * .1));
  return canvas;
}
