// VHS-kassetter å lete etter i gåmodus: spredt på gulvet rundt i rommet, et stykke unna der
// man starter, og bare der man kan gå. Har rommet en blindgang med utvidelse (gen/crawlways.js), ligger
// en av dem gjerne der. På genererte nivåer er dørene til ingensteds låst til
// alle kassettene er funnet (view3d/tape-hunt.js). Ren logikk – meshene lages i view3d/tapes.js.
import { TILE } from '../core/level.js';
import { floorAt, deckAt } from '../core/heights.js';
import { footprintCells } from '../core/object-pose.js';
import { doorInfo } from '../core/doors.js';
import { pillarContains } from '../core/pillars.js';
import { halfWallContains } from '../core/half-walls.js';
import { crawlNooks } from '../core/crawl.js';

const NOOK = 0.6; // sjansen for at en kassett ligger i enden av en krypegang, når det finnes en

/** Hvor mange kassetter et rom får: én per ca. 300 m² gulv, 1–5. */
export function tapeCount(level) {
  let open = 0;
  for (const t of level.tiles) if (t === TILE.FLOOR) open++;
  return open < 40 ? 0 : Math.max(1, Math.min(5, Math.round(open / 300)));
}

/** Dørene til ingensteds er låst til alle kassettene er funnet – bare på genererte nivåer. */
export function exitsLocked({ depth, left, drifting = false }) {
  return depth > 0 && left > 0 && !drifting;
}

/**
 * Rutene man kan gå til fra (x, z): vanlige dører kan åpnes, dører til ingensteds fører ut av
 * rommet og stenger, som vegger, søyler og halvvegger. Vann kan man vade og svømme i.
 * @param blocked Set med ruter som regnes som vegg, eller null
 * @returns {Uint8Array} 1 = nåbar
 */
export function reachableCells(level, x, z, blocked = null) {
  const { w, h } = level;
  const out = new Uint8Array(w * h);
  const open = (cx, cz) => {
    if (cx < 0 || cz < 0 || cx >= w || cz >= h) return false;
    const t = level.tiles[cz * w + cx];
    if (t === TILE.WALL || t === TILE.PILLAR || blocked?.has(cz * w + cx)) return false;
    if (t === TILE.DOOR && doorInfo(level, cx, cz)?.oneSided) return false;
    return !pillarContains(level, cx + 0.5, cz + 0.5, 0.3) && !halfWallContains(level, cx + 0.5, cz + 0.5, 0.3);
  };
  const [sx, sz] = [Math.floor(x), Math.floor(z)];
  if (!open(sx, sz)) return out;
  const queue = [sz * w + sx];
  out[queue[0]] = 1;
  while (queue.length) {
    const i = queue.pop(), cx = i % w, cz = (i / w) | 0;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const j = (cz + dz) * w + cx + dx;
      if (open(cx + dx, cz + dz) && !out[j]) {
        out[j] = 1;
        queue.push(j);
      }
    }
  }
  return out;
}

/**
 * @returns {Array<{ x, y, z, rot }>} kassettene (rot = dreining om loddaksen, radianer)
 */
export function placeTapes(level, spawn, rand, count = tapeCount(level), skip = null) {
  const reach = spawn ? reachableCells(level, spawn.x, spawn.z) : null;
  const cells = [];
  const taken = footprintCells(level); // én gang: å spørre per rute koster når rommet er fullt av møbler
  for (let z = 1; z < level.h - 1; z++) {
    for (let x = 1; x < level.w - 1; x++) {
      if (level.tiles[z * level.w + x] !== TILE.FLOOR || taken.has(z * level.w + x)) continue;
      if (reach && !reach[z * level.w + x]) continue;
      if (spawn && Math.hypot(x + 0.5 - spawn.x, z + 0.5 - spawn.z) < 8) continue;
      if (skip?.(x, z)) continue;
      cells.push([x, z]);
    }
  }
  const out = [];
  const nooks = crawlNooks(level).filter((i) => (!reach || reach[i]) && !skip?.(i % level.w, Math.floor(i / level.w)));
  if (count > 0 && nooks.length && rand() < NOOK) {
    const i = nooks[Math.floor(rand() * nooks.length)];
    out.push({ x: (i % level.w) + 1, y: floorAt(level, i % level.w, Math.floor(i / level.w)), z: Math.floor(i / level.w) + 1, rot: rand() * Math.PI * 2 });
  }
  const spread = Math.max(5, Math.sqrt(cells.length) / 1.5);
  for (let tries = 0; out.length < count && tries < 400 && cells.length; tries++) {
    const [x, z] = cells[Math.floor(rand() * cells.length)];
    if (out.some((t) => Math.hypot(t.x - x, t.z - z) < spread)) continue;
    // Der det er dekke, ligger halvparten av kassettene oppe.
    const d = deckAt(level, x, z);
    const y = d && rand() < 0.5 ? d : floorAt(level, x, z);
    out.push({ x: x + 0.25 + rand() * 0.5, y, z: z + 0.25 + rand() * 0.5, rot: rand() * Math.PI * 2 });
  }
  return out;
}
