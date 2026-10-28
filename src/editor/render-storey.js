// Etasjen under, svakt i skissen: der etasjen som tegnes er vegg og etasjen under har gulv, vises
// gulvet under som en blek flate, og veggene under som stiplede kanter – så det er lett å bygge rett over.
// Bassenger der nede vises blått også under gulv her (man kan dra en sklie ned til dem).
import { TILE, getTile } from '../core/level.js';

const FILL = 'rgba(47, 111, 143, 0.14)';
const WATER = 'rgba(40, 140, 200, 0.28)'; // bassenger der nede (sklier ned, core/slide-drops.js)
const EDGE = 'rgba(47, 111, 143, 0.6)';

export function drawBelow(ctx, view, level, below, r) {
  const s = view.scale;
  for (let z = r.z0; z <= r.z1; z++) {
    for (let x = r.x0; x <= r.x1; x++) {
      const i = z * level.w + x;
      const water = below.tiles[i] === TILE.WATER && level.tiles[i] !== TILE.WATER;
      if (!water && (below.tiles[i] === TILE.WALL || level.tiles[i] !== TILE.WALL)) continue;
      const [sx, sy] = view.toScreen(x, z);
      ctx.fillStyle = water ? WATER : FILL;
      ctx.fillRect(sx, sy, s, s);
    }
  }
  ctx.save();
  ctx.strokeStyle = EDGE;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  for (let z = r.z0; z <= r.z1; z++) {
    for (let x = r.x0; x <= r.x1; x++) {
      if (getTile(below, x, z) === TILE.WALL) continue;
      const [sx, sy] = view.toScreen(x, z);
      if (getTile(below, x - 1, z) === TILE.WALL) (ctx.moveTo(sx, sy), ctx.lineTo(sx, sy + s));
      if (getTile(below, x + 1, z) === TILE.WALL) (ctx.moveTo(sx + s, sy), ctx.lineTo(sx + s, sy + s));
      if (getTile(below, x, z - 1) === TILE.WALL) (ctx.moveTo(sx, sy), ctx.lineTo(sx + s, sy));
      if (getTile(below, x, z + 1) === TILE.WALL) (ctx.moveTo(sx, sy + s), ctx.lineTo(sx + s, sy + s));
    }
  }
  ctx.stroke();
  ctx.restore();
}
