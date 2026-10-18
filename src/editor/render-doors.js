// Døråpninger i skissen: en strek over åpningen, eller dørbladet med slagbue (som på en
// arkitekttegning) når åpningen har en dør.
import { DOOR, doorInfo, leafPose } from '../core/doors.js';

const OPENING = '#c8893a';
const LEAF = '#6b4526';

export function drawDoor(ctx, view, level, x, z) {
  const s = view.scale;
  const info = doorInfo(level, x, z);
  const [sx, sy] = view.toScreen(x, z);
  if (!info || info.state === DOOR.NONE) {
    ctx.fillStyle = OPENING;
    if (info?.pz) ctx.fillRect(sx, sy + s * 0.4, s, s * 0.2);
    else if (info) ctx.fillRect(sx + s * 0.4, sy, s * 0.2, s);
    else ctx.fillRect(sx + s * 0.3, sy + s * 0.3, s * 0.4, s * 0.4);
    return;
  }
  const { o, u, closed, w } = leafPose(info);
  const [hx, hy] = view.toScreen(o[0], o[1]);
  ctx.save();
  if (info.state !== DOOR.CLOSED && s >= 8) {
    // Slagbuen fra lukket stilling til der bladet står.
    const from = Math.atan2(closed[1], closed[0]);
    const to = Math.atan2(u[1], u[0]);
    let delta = to - from;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    ctx.strokeStyle = 'rgba(107,69,38,0.55)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.arc(hx, hy, w * s, from, from + delta, delta < 0);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.strokeStyle = LEAF;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, s * 0.09);
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(hx + u[0] * w * s, hy + u[1] * w * s);
  ctx.stroke();
  ctx.restore();
}
