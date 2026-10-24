// Soner i skissen: stiplede linjer der takhøyden skifter, heltrukne kanter der gulvet
// skifter høyde, skravur over dekker (andre etasje) og etiketter med høyden/dybden.
import { TILE } from '../core/level.js';
import { deckAt } from '../core/heights.js';
import { FINISH } from '../core/finishes.js';

const LABEL = {
  ceiling: { fill: 'rgba(92, 70, 160, 0.92)', text: (v) => `↕ ${v.toFixed(1)} m` },
  depth: { fill: 'rgba(28, 84, 118, 0.92)', text: (v) => `${v.toFixed(1)} m deep` },
  floor: { fill: 'rgba(120, 84, 40, 0.92)', text: (v) => `▲ ${v.toFixed(1)} m` },
  deck: { fill: 'rgba(36, 92, 120, 0.92)', text: (v) => `▤ deck ${v.toFixed(1)} m` },
};

/** Streker langs rutekanter der value(i) skiller seg mellom to ruter som begge tas med. */
function edges(ctx, view, level, r, include, value) {
  const { w, h } = level;
  const s = view.scale;
  const [ox, oy] = view.toScreen(0, 0);
  ctx.beginPath();
  for (let z = r.z0; z <= r.z1; z++) {
    for (let x = r.x0; x <= r.x1; x++) {
      const i = z * w + x;
      if (!include(i)) continue;
      const v = value(i);
      if (x + 1 < w && include(i + 1) && value(i + 1) !== v) {
        ctx.moveTo(Math.round(ox + (x + 1) * s), oy + z * s);
        ctx.lineTo(Math.round(ox + (x + 1) * s), oy + (z + 1) * s);
      }
      if (z + 1 < h && include(i + w) && value(i + w) !== v) {
        ctx.moveTo(ox + x * s, Math.round(oy + (z + 1) * s));
        ctx.lineTo(ox + (x + 1) * s, Math.round(oy + (z + 1) * s));
      }
    }
  }
  ctx.stroke();
}

/** Grensene mellom soner: tak (stiplet, dører unntatt) og gulvhøyde (heltrukken, trinnkant). */
export function drawZoneEdges(ctx, view, level, r) {
  const { tiles, ceilings, floors } = level;
  const room = Math.round(level.height * 10);
  ctx.save();
  ctx.strokeStyle = 'rgba(92, 70, 160, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  edges(ctx, view, level, r, (i) => tiles[i] !== TILE.WALL, (i) => ceilings[i] || room);
  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(96, 66, 30, 0.85)';
  ctx.lineWidth = 2;
  const flat = (i) => tiles[i] !== TILE.WALL && tiles[i] !== TILE.WATER && tiles[i] !== TILE.STAIRS;
  edges(ctx, view, level, r, flat, (i) => floors[i]);
  ctx.restore();
}

/** Dekker: skrå skravur i rutene og en tykk kant der dekket slutter (mot atriet). */
export function drawDecks(ctx, view, level, r) {
  const { w } = level;
  const s = view.scale;
  const deck = (x, z) => deckAt(level, x, z);
  ctx.save();
  ctx.strokeStyle = 'rgba(36, 92, 120, 0.28)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let z = r.z0; z <= r.z1; z++) {
    for (let x = r.x0; x <= r.x1; x++) {
      if (!deck(x, z)) continue;
      const [sx, sy] = view.toScreen(x, z);
      // Streker med fast avstand på skjermen, i samme mønster over hele dekket.
      for (let k = ((-(sx + sy) % 8) + 8) % 8; k < 2 * s; k += 8) {
        const a = Math.min(k, s);
        const b = Math.max(0, k - s);
        ctx.moveTo(sx + a, sy + b);
        ctx.lineTo(sx + b, sy + a);
      }
    }
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(36, 92, 120, 0.8)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let z = r.z0; z <= r.z1; z++) {
    for (let x = r.x0; x <= r.x1; x++) {
      const d = deck(x, z);
      if (!d) continue;
      const [sx, sy] = view.toScreen(x, z);
      const open = (nx, nz) => level.tiles[nz * w + nx] !== TILE.WALL && deck(nx, nz) !== d;
      if (x > 0 && open(x - 1, z)) (ctx.moveTo(sx, sy), ctx.lineTo(sx, sy + s));
      if (x < w - 1 && open(x + 1, z)) (ctx.moveTo(sx + s, sy), ctx.lineTo(sx + s, sy + s));
      if (z > 0 && open(x, z - 1)) (ctx.moveTo(sx, sy), ctx.lineTo(sx + s, sy));
      if (z < level.h - 1 && open(x, z + 1)) (ctx.moveTo(sx, sy + s), ctx.lineTo(sx + s, sy + s));
    }
  }
  ctx.stroke();
  ctx.restore();
}

/** Flisfuger i flislagte ruter (tre fliser per meter). */
export function drawTileGrid(ctx, view, level, r) {
  const { w, tiles, finish } = level;
  const s = view.scale;
  ctx.save();
  ctx.strokeStyle = 'rgba(90, 96, 102, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let z = r.z0; z <= r.z1; z++) {
    for (let x = r.x0; x <= r.x1; x++) {
      const i = z * w + x;
      if (finish[i] !== FINISH.TILES || tiles[i] === TILE.WALL || tiles[i] === TILE.WATER) continue;
      const [sx, sy] = view.toScreen(x, z);
      for (const f of [1 / 3, 2 / 3]) {
        ctx.moveTo(Math.round(sx + f * s) + 0.5, sy);
        ctx.lineTo(Math.round(sx + f * s) + 0.5, sy + s);
        ctx.moveTo(sx, Math.round(sy + f * s) + 0.5);
        ctx.lineTo(sx + s, Math.round(sy + f * s) + 0.5);
      }
    }
  }
  ctx.stroke();
  ctx.restore();
}

/** Etiketter fra zoneLabels(): ↕ takhøyde (lilla), dybde (blå) og ▲ gulvhøyde (brun). */
export function drawZoneLabels(ctx, view, zones) {
  ctx.save();
  ctx.font = '600 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const zone of zones) {
    const style = LABEL[zone.layer];
    const text = style.text(zone.value);
    const [cx, cy] = view.toScreen(zone.x + 0.5, zone.z + 0.5);
    const tw = ctx.measureText(text).width + 8;
    ctx.fillStyle = style.fill;
    ctx.beginPath();
    ctx.roundRect(cx - tw / 2, cy - 7, tw, 14, 3);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(text, cx, cy + 0.5);
  }
  ctx.restore();
}
