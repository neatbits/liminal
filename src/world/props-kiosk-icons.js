// Matikonene på kiosken (skilt, disk og menytavle), tegnet på canvas rundt (x, y) med størrelsen r:
// burger, pizzastykke, nudelbolle, pølse i brød, pommes frites, brett (kantina) og kaffe (kiosken).
// Egen grafikk.

export const round = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
};

/** Matikonene, tegnet rundt (x, y) med størrelsen r. */
const ICONS = {
  burger(ctx, x, y, r) {
    ctx.fillStyle = '#f0b544';
    ctx.beginPath();
    ctx.ellipse(x, y - r * 0.15, r, r * 0.62, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#4f9a3a';
    ctx.fillRect(x - r * 1.05, y - r * 0.18, r * 2.1, r * 0.16);
    ctx.fillStyle = '#6b3318';
    round(ctx, x - r, y - r * 0.04, r * 2, r * 0.32, r * 0.12);
    ctx.fill();
    ctx.fillStyle = '#f0b544';
    round(ctx, x - r, y + r * 0.32, r * 2, r * 0.3, r * 0.15);
    ctx.fill();
    ctx.fillStyle = '#fff3c8';
    for (const [dx, dy] of [[-0.45, -0.5], [0, -0.62], [0.4, -0.45]]) ctx.fillRect(x + dx * r, y + dy * r, r * 0.12, r * 0.06);
  },
  pizza(ctx, x, y, r) {
    ctx.fillStyle = '#e9a23b';
    ctx.beginPath();
    ctx.moveTo(x - r, y - r * 0.6);
    ctx.lineTo(x + r, y - r * 0.6);
    ctx.lineTo(x, y + r * 0.9);
    ctx.fill();
    ctx.fillStyle = '#f7d36b';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.8, y - r * 0.4);
    ctx.lineTo(x + r * 0.8, y - r * 0.4);
    ctx.lineTo(x, y + r * 0.72);
    ctx.fill();
    ctx.fillStyle = '#c4322c';
    for (const [dx, dy] of [[-0.35, -0.2], [0.3, -0.15], [0, 0.25]]) {
      ctx.beginPath();
      ctx.arc(x + dx * r, y + dy * r, r * 0.13, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  noodles(ctx, x, y, r) {
    ctx.strokeStyle = '#3b2a1e';
    ctx.lineWidth = r * 0.08;
    ctx.beginPath();
    ctx.moveTo(x + r * 0.1, y - r * 0.2);
    ctx.lineTo(x + r * 0.9, y - r * 1.0);
    ctx.moveTo(x + r * 0.3, y - r * 0.15);
    ctx.lineTo(x + r * 1.05, y - r * 0.85);
    ctx.stroke();
    ctx.strokeStyle = '#f5d98a';
    ctx.lineWidth = r * 0.07;
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath();
      ctx.arc(x + k * r * 0.22, y - r * 0.1, r * 0.25, Math.PI, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y - r * 0.1, r, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#c4322c';
    ctx.fillRect(x - r * 0.75, y + r * 0.25, r * 1.5, r * 0.1);
  },
  hotdog(ctx, x, y, r) {
    ctx.fillStyle = '#f0b544';
    round(ctx, x - r, y - r * 0.15, r * 2, r * 0.6, r * 0.3);
    ctx.fill();
    ctx.fillStyle = '#b04a2a';
    round(ctx, x - r * 1.15, y - r * 0.3, r * 2.3, r * 0.34, r * 0.17);
    ctx.fill();
    ctx.strokeStyle = '#f7d000';
    ctx.lineWidth = r * 0.08;
    ctx.beginPath();
    for (let k = 0; k <= 8; k++) ctx.lineTo(x - r * 0.9 + k * r * 0.225, y - r * 0.13 + (k % 2 ? -1 : 1) * r * 0.06);
    ctx.stroke();
  },
  fries(ctx, x, y, r) {
    ctx.fillStyle = '#f7d36b';
    for (let k = -3; k <= 3; k++) ctx.fillRect(x + k * r * 0.2 - r * 0.07, y - r * (0.9 + (k % 2) * 0.15), r * 0.14, r);
    ctx.fillStyle = '#c4322c';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.75, y - r * 0.2);
    ctx.lineTo(x + r * 0.75, y - r * 0.2);
    ctx.lineTo(x + r * 0.55, y + r * 0.9);
    ctx.lineTo(x - r * 0.55, y + r * 0.9);
    ctx.fill();
  },
  tray(ctx, x, y, r) {
    ctx.fillStyle = '#d9d9d2';
    round(ctx, x - r * 1.1, y - r * 0.5, r * 2.2, r * 1.1, r * 0.2);
    ctx.fill();
    ctx.fillStyle = '#c4322c';
    ctx.beginPath();
    ctx.arc(x - r * 0.4, y, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f7d36b';
    ctx.fillRect(x + r * 0.15, y - r * 0.3, r * 0.6, r * 0.6);
  },
  coffee(ctx, x, y, r) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.6, y - r * 0.6);
    ctx.lineTo(x + r * 0.6, y - r * 0.6);
    ctx.lineTo(x + r * 0.45, y + r * 0.8);
    ctx.lineTo(x - r * 0.45, y + r * 0.8);
    ctx.fill();
    ctx.fillStyle = '#7a4a2a';
    ctx.fillRect(x - r * 0.55, y - r * 0.15, r * 1.08, r * 0.3);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = r * 0.08;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.15, y - r * 0.8);
    ctx.quadraticCurveTo(x + r * 0.1, y - r * 1.05, x - r * 0.05, y - r * 1.3);
    ctx.stroke();
  },
};

export const drawIcon = (ctx, icon, x, y, r) => (ICONS[icon] ?? ICONS.burger)(ctx, x, y, r);
