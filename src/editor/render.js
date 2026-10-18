// Tegner 2D-skissen: rom, detaljer, rutenett, forhåndsvisning av verktøy og linjaler.
// Bakgrunnsbildet lages i plan-image.js, soner (grenser og etiketter) i render-zones.js.
import { TILE, LIGHT } from '../core/level.js';
import { resolveSpawn } from '../core/spawn.js';
import { drawRulers } from './rulers.js';
import { drawZoneEdges, drawZoneLabels, drawTileGrid, drawDecks } from './render-zones.js';
import { drawDoor } from './render-doors.js';
import { canHoldDoor } from '../core/doors.js';
import { drawStairs, drawStairsPreview } from './render-stairs.js';
import { drawSlides } from './render-slides.js';
import { drawObjects } from './render-objects.js';
import { drawWindow } from './render-windows.js';

export const RULER_TOP = 22;
export const RULER_LEFT = 30;

const C = {
  paper: '#f4f2ec',
  sheet: '#fcfbf8',
  pillar: '#45474b',
  grid: 'rgba(40,40,30,0.07)',
  grid5: 'rgba(40,40,30,0.15)',
  border: 'rgba(40,40,30,0.35)',
  accent: '#1f7a72',
  erase: '#c0492f',
  light: '#ffd75e',
  lightEdge: '#a8841c',
  flicker: '#ff9f3a',
  broken: '#9b9a95',
};

function visibleRange(view, level, width, height) {
  return {
    x0: Math.max(0, Math.floor(-view.ox / view.scale)),
    z0: Math.max(0, Math.floor(-view.oy / view.scale)),
    x1: Math.min(level.w - 1, Math.ceil((width - view.ox) / view.scale)),
    z1: Math.min(level.h - 1, Math.ceil((height - view.oy) / view.scale)),
  };
}

function drawGrid(ctx, view, level, r) {
  const s = view.scale;
  const [ox, oy] = view.toScreen(0, 0);
  for (const major of [false, true]) {
    if (!major && s < 9) continue;
    ctx.strokeStyle = major ? C.grid5 : C.grid;
    ctx.beginPath();
    for (let x = r.x0; x <= r.x1 + 1; x++) {
      if ((x % 5 === 0) !== major) continue;
      ctx.moveTo(Math.round(ox + x * s) + 0.5, oy);
      ctx.lineTo(Math.round(ox + x * s) + 0.5, oy + level.h * s);
    }
    for (let z = r.z0; z <= r.z1 + 1; z++) {
      if ((z % 5 === 0) !== major) continue;
      ctx.moveTo(ox, Math.round(oy + z * s) + 0.5);
      ctx.lineTo(ox + level.w * s, Math.round(oy + z * s) + 0.5);
    }
    ctx.stroke();
  }
}

function drawLight(ctx, state, cx, cy, s) {
  const r = Math.max(2.5, s * 0.24);
  if (state === LIGHT.ON && s >= 10) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 3);
    g.addColorStop(0, 'rgba(255,215,94,0.45)');
    g.addColorStop(1, 'rgba(255,215,94,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - r * 3, cy - r * 3, r * 6, r * 6);
  }
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = state === LIGHT.ON ? C.light : state === LIGHT.FLICKER ? C.flicker : C.broken;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = state === LIGHT.BROKEN ? '#6f6e6a' : C.lightEdge;
  ctx.stroke();
  if (state === LIGHT.FLICKER && s >= 8) {
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (state === LIGHT.BROKEN && s >= 8) {
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.6, cy - r * 0.6);
    ctx.lineTo(cx + r * 0.6, cy + r * 0.6);
    ctx.moveTo(cx + r * 0.6, cy - r * 0.6);
    ctx.lineTo(cx - r * 0.6, cy + r * 0.6);
    ctx.stroke();
  }
}

function drawDetails(ctx, view, level, r) {
  const s = view.scale;
  for (let z = r.z0; z <= r.z1; z++) {
    for (let x = r.x0; x <= r.x1; x++) {
      const t = level.tiles[z * level.w + x];
      const [sx, sy] = view.toScreen(x, z);
      if (t === TILE.PILLAR) {
        ctx.fillStyle = C.pillar;
        ctx.fillRect(sx + s * 0.25, sy + s * 0.25, s * 0.5, s * 0.5);
      } else if (t === TILE.DOOR) {
        drawDoor(ctx, view, level, x, z);
      } else if (t === TILE.STAIRS) {
        drawStairs(ctx, view, level, x, z);
      } else if (t === TILE.WALL && level.meta[z * level.w + x]) {
        drawWindow(ctx, view, level, x, z);
      }
      const l = level.lights[z * level.w + x];
      if (l !== LIGHT.NONE) drawLight(ctx, l, sx + s / 2, sy + s / 2, s);
    }
  }
}

function drawSpawn(ctx, view, spawn, alpha = 1) {
  const [cx, cy] = view.toScreen(spawn.x, spawn.z);
  const r = Math.max(4, view.scale * 0.32);
  const dx = -Math.sin(spawn.a);
  const dy = -Math.cos(spawn.a);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = C.accent;
  ctx.beginPath();
  ctx.moveTo(cx + dx * r * 2.2, cy + dy * r * 2.2);
  ctx.lineTo(cx - dy * r * 0.8, cy + dx * r * 0.8);
  ctx.lineTo(cx + dy * r * 0.8, cy - dx * r * 0.8);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawPreview(ctx, view, s) {
  const { preview, hover, tool, brush, erase } = s;
  if (s.stairs) return drawStairsPreview(ctx, view, s.stairs);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = erase ? C.erase : C.accent;
  if (preview) {
    const [x0, y0] = view.toScreen(preview.x0, preview.z0);
    const w = (preview.x1 - preview.x0 + 1) * view.scale;
    const h = (preview.z1 - preview.z0 + 1) * view.scale;
    ctx.fillStyle = erase ? 'rgba(192,73,47,0.14)' : 'rgba(31,122,114,0.14)';
    ctx.fillRect(x0, y0, w, h);
    ctx.strokeRect(x0 + 0.5, y0 + 0.5, w, h);
    let label = `${preview.x1 - preview.x0 + 1} × ${preview.z1 - preview.z0 + 1} m`;
    if (tool.kind === 'zone' && tool.layer !== 'finish') label += erase ? ' · reset' : ` · ${tool.value.toFixed(1)} m`;
    ctx.font = '600 11px system-ui, sans-serif';
    const tw = ctx.measureText(label).width + 12;
    ctx.fillStyle = erase ? C.erase : C.accent;
    ctx.fillRect(x0, y0 - 20, tw, 17);
    ctx.fillStyle = '#fff';
    ctx.fillText(label, x0 + 6, y0 - 8);
    return;
  }
  if (!hover) return;
  if (tool.kind === 'spawn') return drawSpawn(ctx, view, { x: Math.floor(hover[0]) + 0.5, z: Math.floor(hover[1]) + 0.5, a: s.level.spawn.a }, 0.35);
  const size = (tool.kind === 'light' && !erase) || tool.kind === 'door' || tool.kind === 'slide' ? 1 : brush;
  const off = Math.floor((size - 1) / 2);
  const [x0, y0] = view.toScreen(Math.floor(hover[0]) - off, Math.floor(hover[1]) - off);
  // Dørverktøyet viser om ruten kan få en dør: grønt kan, rødt kan ikke.
  if (tool.kind === 'door' && !erase) {
    const ok = canHoldDoor(s.level, Math.floor(hover[0]), Math.floor(hover[1]));
    ctx.strokeStyle = ok ? C.accent : C.erase;
    ctx.fillStyle = ok ? 'rgba(31,122,114,0.2)' : 'rgba(192,73,47,0.15)';
    ctx.fillRect(x0, y0, view.scale, view.scale);
  }
  ctx.strokeRect(x0 + 0.5, y0 + 0.5, size * view.scale, size * view.scale);
}

/**
 * Tegner hele skissen.
 * `s` = { level, view, width, height, image, zones, hover, preview, stairs, slide, tool, brush, erase,
 *        grid, rulers }
 */
export function drawPlan(ctx, s) {
  const { level, view, width, height } = s;
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, width, height);
  const [ox, oy] = view.toScreen(0, 0);
  const W = level.w * view.scale;
  const H = level.h * view.scale;
  ctx.fillStyle = C.sheet;
  ctx.fillRect(ox, oy, W, H);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(s.image, ox, oy, W, H);
  const r = visibleRange(view, level, width, height);
  if (s.grid && view.scale >= 5) drawGrid(ctx, view, level, r);
  if (view.scale >= 10) drawTileGrid(ctx, view, level, r);
  if (view.scale >= 6) drawZoneEdges(ctx, view, level, r);
  if (view.scale >= 3) drawDecks(ctx, view, level, r);
  if (view.scale >= 4) drawDetails(ctx, view, level, r);
  drawSlides(ctx, view, level, s.slide);
  if (view.scale >= 4) drawObjects(ctx, view, level);
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 1;
  ctx.strokeRect(Math.round(ox) + 0.5, Math.round(oy) + 0.5, Math.round(W), Math.round(H));
  if (s.zones && view.scale >= 8) drawZoneLabels(ctx, view, s.zones);
  // Tegn startpunktet der spilleren faktisk starter (nærmeste gulv hvis det står i en vegg).
  const spawn = resolveSpawn(level);
  if (spawn) drawSpawn(ctx, view, spawn);
  drawPreview(ctx, view, s);
  if (s.rulers) drawRulers(ctx, view, width, height, RULER_LEFT, RULER_TOP);
}
