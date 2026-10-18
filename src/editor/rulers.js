// Linjaler i meter langs toppen og venstre kant av skissen (0 = rommets hjørne).

const BG = '#efede7';
const LINE = '#d6d2c8';
const TEXT = '#7a776f';

function pickStep(scale, minPx, steps = [1, 2, 5, 10, 20, 50]) {
  return steps.find((s) => s * scale >= minPx) ?? steps[steps.length - 1];
}

export function drawRulers(ctx, view, width, height, left, top) {
  const s = view.scale;
  const tick = pickStep(s, 7);
  const label = pickStep(s, 36);
  ctx.font = '10px system-ui, sans-serif';
  ctx.lineWidth = 1;

  // Topp
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, width, top);
  ctx.strokeStyle = LINE;
  ctx.beginPath();
  ctx.moveTo(0, top - 0.5);
  ctx.lineTo(width, top - 0.5);
  ctx.stroke();
  ctx.strokeStyle = TEXT;
  ctx.fillStyle = TEXT;
  ctx.beginPath();
  const mx0 = Math.floor((left - view.ox) / s / tick) * tick;
  const mx1 = Math.ceil((width - view.ox) / s);
  for (let m = mx0; m <= mx1; m += tick) {
    const x = Math.round(view.ox + m * s) + 0.5;
    if (x < left) continue;
    const major = m % label === 0;
    ctx.moveTo(x, top);
    ctx.lineTo(x, top - (major ? 8 : 4));
    if (major) ctx.fillText(String(m), x + 3, 11);
  }
  ctx.stroke();

  // Venstre
  ctx.fillStyle = BG;
  ctx.fillRect(0, top, left, height - top);
  ctx.strokeStyle = LINE;
  ctx.beginPath();
  ctx.moveTo(left - 0.5, top);
  ctx.lineTo(left - 0.5, height);
  ctx.stroke();
  ctx.strokeStyle = TEXT;
  ctx.fillStyle = TEXT;
  ctx.textAlign = 'right';
  ctx.beginPath();
  const mz0 = Math.floor((top - view.oy) / s / tick) * tick;
  const mz1 = Math.ceil((height - view.oy) / s);
  for (let m = mz0; m <= mz1; m += tick) {
    const y = Math.round(view.oy + m * s) + 0.5;
    if (y < top) continue;
    const major = m % label === 0;
    ctx.moveTo(left, y);
    ctx.lineTo(left - (major ? 8 : 4), y);
    if (major) ctx.fillText(String(m), left - 10, y + 3.5);
  }
  ctx.stroke();
  ctx.textAlign = 'left';

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, left, top);
  ctx.fillStyle = TEXT;
  ctx.fillText('m', 9, 14);
}
