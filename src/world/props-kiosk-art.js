// Grafikken til kiosken (props-kiosk.js), tegnet på canvas: ikoner for maten, det opplyste skiltet,
// disken, menytavla med bilder, markisen, kjøleskapsdøra og brusautomaten. Egen grafikk – ingen
// kjente logoer eller varemerker.
import * as THREE from 'three';
import { drawIcon, round } from './props-kiosk-icons.js';

export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}


/** Lysskiltet: navnet og ikonet på kioskens farge, med lys kant og en mørkere stripe nederst. */
export function signTexture(sign) {
  return canvasTexture(1024, 150, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, sign.color);
    g.addColorStop(1, shade(sign.color, -0.25));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    drawIcon(ctx, sign.icon, 105, h / 2 + 6, 42);
    drawIcon(ctx, sign.icon, w - 105, h / 2 + 6, 42);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 86px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowOffsetY = 4;
    ctx.fillText(sign.name, w / 2, h / 2 + 4);
  });
}

/** Diskfronten: paneler i kioskens farge, en hvit stripe øverst og ikonet i midten. */
export function counterTexture(sign) {
  return canvasTexture(768, 256, (ctx, w, h) => {
    ctx.fillStyle = sign.color;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(0, 18, w, 10);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let k = 0; k < 4; k++) ctx.fillRect(18 + k * (w / 4), 46, w / 4 - 36, h - 76);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2 + 14, 70, 0, Math.PI * 2);
    ctx.fill();
    drawIcon(ctx, sign.icon, w / 2, h / 2 + 18, 44);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, h - 16, w, 16);
  });
}

/** Menytavla: tre bilder av maten med navn og pris, på mørk bakgrunn (lyser av seg selv). */
export function menuTexture(sign) {
  return canvasTexture(768, 288, (ctx, w, h) => {
    ctx.fillStyle = '#16161a';
    ctx.fillRect(0, 0, w, h);
    const items = [['CLASSIC', '4.99'], ['DOUBLE', '6.49'], ['COMBO', '7.99']];
    items.forEach(([name, price], k) => {
      const x0 = 16 + k * (w - 16) / 3;
      const pw = (w - 16) / 3 - 16;
      ctx.fillStyle = shade(sign.color, -0.35);
      round(ctx, x0, 16, pw, 170, 10);
      ctx.fill();
      drawIcon(ctx, sign.icon, x0 + pw / 2, 104, 48 + k * 6);
      ctx.fillStyle = '#f3e7c7';
      ctx.font = 'bold 30px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(name, x0 + pw / 2, 226);
      ctx.fillStyle = '#ffd34d';
      ctx.font = 'bold 34px Arial, sans-serif';
      ctx.fillText(price, x0 + pw / 2, 266);
    });
  });
}

/** Markisen: brede striper i kioskens farge og hvitt. */
export function awningTexture(sign) {
  return canvasTexture(256, 32, (ctx, w, h) => {
    for (let k = 0; k < 8; k++) {
      ctx.fillStyle = k % 2 ? '#f6f3ea' : sign.color;
      ctx.fillRect((k * w) / 8, 0, w / 8, h);
    }
  });
}

/** Kjøleskapsdøra: mørkt glass med opplyste hyller og flasker. */
export function fridgeTexture() {
  return canvasTexture(128, 256, (ctx, w, h) => {
    ctx.fillStyle = '#20303a';
    ctx.fillRect(0, 0, w, h);
    const colors = ['#c4322c', '#3a8a3a', '#e9a23b', '#2a5fa8', '#f2f2f2'];
    for (let row = 0; row < 4; row++) {
      const y = 20 + row * 58;
      ctx.fillStyle = 'rgba(220,240,255,0.55)';
      ctx.fillRect(8, y + 40, w - 16, 4);
      for (let k = 0; k < 6; k++) {
        ctx.fillStyle = colors[(row * 2 + k) % colors.length];
        round(ctx, 12 + k * 18, y + 6, 12, 34, 3);
        ctx.fill();
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(10, 0, 18, h);
    ctx.fillStyle = '#9aa0a4';
    ctx.fillRect(w - 14, 90, 6, 70);
  });
}

/** Brusautomaten: fire etiketter og tuter. */
export function sodaTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#b8bdc0';
    ctx.fillRect(0, 0, w, h);
    ['#c4322c', '#3a8a3a', '#e9a23b', '#2a5fa8'].forEach((c, k) => {
      ctx.fillStyle = c;
      ctx.fillRect(8 + k * 29, 14, 24, 40);
      ctx.fillStyle = '#2b2b2b';
      ctx.fillRect(16 + k * 29, 62, 8, 14);
    });
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(6, 104, w - 12, 12);
  });
}

/** Fargen lysere (amt > 0) eller mørkere (amt < 0). */
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
}
