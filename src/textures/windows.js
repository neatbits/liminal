// Teksturer for vinduer: himmelen sett gjennom glasset (fargeovergang etter tiden på døgnet,
// litt matt, med sprosser i et kryss – eller uten, bars = null) og solflekken på gulvet (myke
// kanter, skygge av sprossene).
import { makeCanvas } from './paint.js';

const BAR = 0.035; // sprossenes tykkelse (andel av ruten)

export function skyCanvas([top, bottom], bars = '#d9d6cc') {
  const S = 256;
  const { canvas, ctx } = makeCanvas(S);
  const g = ctx.createLinearGradient(0, 0, 0, S);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  // Et svakt lysere felt nederst – som dis eller en himmel full av lys.
  const haze = ctx.createRadialGradient(S / 2, S * 0.85, 4, S / 2, S * 0.85, S * 0.7);
  haze.addColorStop(0, 'rgba(255,255,255,0.35)');
  haze.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, S, S);
  // Distant, indistinct buildings give the glass depth without another scene/render pass.
  ctx.fillStyle = top;
  ctx.globalAlpha = 0.18;
  for (const [x, y, w] of [[0, 0.8, 0.19], [0.2, 0.87, 0.3], [0.55, 0.76, 0.17], [0.78, 0.84, 0.22]]) {
    ctx.fillRect(x * S, y * S, w * S, S);
  }
  ctx.globalAlpha = 1;
  const reflection = ctx.createLinearGradient(0, S, S, 0);
  reflection.addColorStop(0, 'rgba(255,255,255,0)');
  reflection.addColorStop(0.43, 'rgba(255,255,255,0.025)');
  reflection.addColorStop(0.47, 'rgba(255,255,255,0.18)');
  reflection.addColorStop(0.58, 'rgba(255,255,255,0.025)');
  reflection.addColorStop(1, 'rgba(255,255,255,0.07)');
  ctx.fillStyle = reflection;
  ctx.fillRect(0, 0, S, S);
  const edge = ctx.createLinearGradient(0, 0, S, 0);
  edge.addColorStop(0, 'rgba(28,39,43,0.32)');
  edge.addColorStop(0.04, 'rgba(28,39,43,0)');
  edge.addColorStop(0.96, 'rgba(28,39,43,0)');
  edge.addColorStop(1, 'rgba(28,39,43,0.28)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, S, S);
  if (bars) {
    ctx.fillStyle = bars;
    ctx.fillRect(S * (0.5 - BAR / 2), 0, S * BAR, S);
    ctx.fillRect(0, S * (0.5 - BAR / 2), S, S * BAR);
  }
  return canvas;
}

/** Solflekken: hvit midt i, myk mot kantene, med skyggen av sprossekrysset (om det er sprosser). */
export function sunCanvas(bars = true) {
  const S = 128;
  const { canvas, ctx } = makeCanvas(S);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, S, S);
  ctx.filter = 'blur(3px)';
  ctx.fillStyle = '#fff';
  ctx.fillRect(S * 0.06, S * 0.06, S * 0.88, S * 0.88);
  ctx.fillStyle = '#000';
  if (bars) {
    ctx.fillRect(S * (0.5 - BAR), 0, S * BAR * 2, S);
    ctx.fillRect(0, S * (0.5 - BAR), S, S * BAR * 2);
  }
  ctx.filter = 'none';
  return canvas;
}
