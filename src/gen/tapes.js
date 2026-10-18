// VHS-kassetter å lete etter i gåmodus: spredt på gulvet rundt i rommet, et stykke unna der
// man starter. Ren logikk – meshene lages i view3d/tapes.js.
import { TILE } from '../core/level.js';
import { floorAt, deckAt } from '../core/heights.js';
import { objectsAt } from '../core/objects.js';

/** Hvor mange kassetter et rom får: én per ca. 300 m² gulv, 1–5. */
export function tapeCount(level) {
  let open = 0;
  for (const t of level.tiles) if (t === TILE.FLOOR) open++;
  return open < 40 ? 0 : Math.max(1, Math.min(5, Math.round(open / 300)));
}

/**
 * @returns {Array<{ x, y, z, rot }>} kassettene (rot = dreining om loddaksen, radianer)
 */
export function placeTapes(level, spawn, rand, count = tapeCount(level)) {
  const cells = [];
  for (let z = 1; z < level.h - 1; z++) {
    for (let x = 1; x < level.w - 1; x++) {
      if (level.tiles[z * level.w + x] !== TILE.FLOOR || objectsAt(level, x, z).length) continue;
      if (spawn && Math.hypot(x + 0.5 - spawn.x, z + 0.5 - spawn.z) < 8) continue;
      cells.push([x, z]);
    }
  }
  const out = [];
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
