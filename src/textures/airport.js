// Teksturer for flyplassterminalen (core/themes-airport.js): et mørkt, mønstret teppe som i en 90-tallsterminal, lyse
// veggpaneler med fuger, en himling av metallspiler og gule oversiktsskilt med svart tekst. Ingen eksterne bilder.
import { fbm } from './noise.js';
import { makeCanvas, pixelPass, shade } from './paint.js';

/** Blågrått teppe med små, skjeve figurer i rødt, oker og turkis på et fint prikkemønster. */
export function airportCarpet(rand) {
  const S = 512;
  const { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = '#2b3446';
  ctx.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < S; x += 8) {
    ctx.fillStyle = 'rgba(120,140,170,0.18)';
    ctx.fillRect(x, y, 2, 2);
  }
  const colors = ['#a8473b', '#c79a3e', '#3c8f8c', '#7b5ea8'];
  const C = 64;
  for (let cy = 0; cy < S / C; cy++) for (let cx = 0; cx < S / C; cx++) {
    const x = cx * C + C / 2 + ((cy % 2) * C) / 2;
    const y = cy * C + C / 2;
    ctx.save();
    ctx.translate(x % S, y);
    ctx.rotate(((cx * 3 + cy * 5) % 8) * (Math.PI / 4));
    ctx.fillStyle = colors[(cx + cy * 2) % colors.length];
    const k = (cx * 7 + cy * 3) % 3;
    if (k === 0) ctx.fillRect(-10, -2.5, 20, 5); // strek
    else if (k === 1) { ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(7, 6); ctx.lineTo(-7, 6); ctx.fill(); } // trekant
    else { ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill(); } // prikk
    ctx.restore();
  }
  const n = fbm(S, 8, 3, rand);
  pixelPass(ctx, S, (x, y, i, d) => shade(d, i, 0.9 + (rand() - 0.5) * 0.2 + 0.1 * (n[y * S + x] - 0.5)));
  return canvas;
}

/** Lyse, glatte veggpaneler (1,2 m) med mørke fuger og en svak glans øverst. */
export function airportWall(rand) {
  const S = 512;
  const { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = '#d9dcde';
  ctx.fillRect(0, 0, S, S);
  for (let x = 0; x < S; x += S / 2) {
    ctx.fillStyle = '#8f969c';
    ctx.fillRect(x, 0, 3, S);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(x + 3, 0, 1, S);
  }
  ctx.fillStyle = '#9da3a8';
  ctx.fillRect(0, S / 2, S, 2);
  const n = fbm(S, 4, 3, rand);
  pixelPass(ctx, S, (x, y, i, d) => shade(d, i, 0.95 + 0.06 * (n[y * S + x] - 0.5) + (rand() - 0.5) * 0.03));
  return canvas;
}

/** Himling av smale metallspiler med mørke spalter imellom. */
export function airportCeiling(rand) {
  const S = 512;
  const { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = '#23272b';
  ctx.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 32) {
    const g = ctx.createLinearGradient(0, y, 0, y + 26);
    g.addColorStop(0, '#e3e6e8');
    g.addColorStop(1, '#b9bec2');
    ctx.fillStyle = g;
    ctx.fillRect(0, y + 3, S, 26);
  }
  pixelPass(ctx, S, (x, y, i, d) => shade(d, i, 0.97 + (rand() - 0.5) * 0.05));
  return canvas;
}

/** Fire skilt i ett atlas: gult med svart tekst og en pil eller et symbol. Fiktive, uten logoer. */
export function airportSigns() {
  const S = 512;
  const { canvas, ctx } = makeCanvas(S);
  const rows = [['→  Gates 1–24', 'All gates'], ['↓  Baggage claim', 'Belts 1–6'], ['←  Transfer', 'Connecting flights'], ['Please wait', 'All flights are delayed']];
  rows.forEach(([title, subtitle], row) => {
    const y = row * 128;
    ctx.fillStyle = '#1d1f22';
    ctx.fillRect(0, y, S, 128);
    ctx.fillStyle = '#f2c230';
    ctx.fillRect(4, y + 4, S - 8, 120);
    ctx.fillStyle = '#16171a';
    ctx.font = '700 38px sans-serif';
    ctx.fillText(title, 26, y + 62, 460);
    ctx.font = '20px sans-serif';
    ctx.fillText(subtitle, 30, y + 98, 450);
  });
  return canvas;
}
