// Veien gjennom et område i Noclip (gen/zones.js): man skal komme seg fra der man kommer inn til gangen ut til fots –
// uten å krype, uten å gå gjennom møbler og uten kanter som er for høye å gå opp (eller har rekkverk). Finnes ingen slik
// vei, graves den korteste gjennom veggene, og gulvhøyden går jevnt fra der den begynner til der den ender. Ren logikk.
import { TILE, getTile } from '../core/level.js';
import { edgeHeight } from '../core/heights.js';
import { doorInfo } from '../core/doors.js';
import { OBJECTS } from '../core/objects.js';
import { footprintCells } from '../core/object-pose.js';
import { pillarContains } from '../core/pillars.js';
import { halfWallContains } from '../core/half-walls.js';

export const STEP = 0.4; // m: høyeste kant man går opp (STEP_UP i world/collision.js er 0,45; litt margin)
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Rutene man ikke går gjennom: krypeganger og faste gjenstander (løse og flytende dyttes unna, det som henger, er ikke i veien). */
export function blocked(level) {
  const solid = level.objects.filter((o) => { const d = OBJECTS[o.id]; return d && !d.loose && !d.soft && !d.floats && !d.mount; });
  const out = footprintCells({ ...level, objects: solid });
  level.tiles.forEach((t, i) => t === TILE.CRAWL && out.add(i));
  return out;
}

const edge = (level, x, z, dx, dz) => (getTile(level, x, z) === TILE.WATER ? 0 : edgeHeight(level, x, z, dx, dz)); // man svømmer i overflaten

function open(level, x, z, stop) {
  const t = getTile(level, x, z);
  if (t === TILE.WALL || t === TILE.PILLAR || stop.has(z * level.w + x)) return false;
  if (t === TILE.DOOR && doorInfo(level, x, z)?.oneSided) return false;
  return !pillarContains(level, x + 0.5, z + 0.5, 0.3) && !halfWallContains(level, x + 0.5, z + 0.5, 0.3);
}

/** Rutene man når til fots fra (x, z): over hver rutekant er høydeforskjellen høyst STEP (trapper og ramper stiger jevnt). */
export function walkReach(level, x, z, stop = blocked(level)) {
  const { w, h } = level;
  const out = new Uint8Array(w * h);
  const [sx, sz] = [Math.floor(x), Math.floor(z)];
  if (!open(level, sx, sz, stop)) return out;
  const queue = [sz * w + sx];
  out[queue[0]] = 1;
  for (let k = 0; k < queue.length; k++) {
    const [cx, cz] = [queue[k] % w, Math.floor(queue[k] / w)];
    for (const [dx, dz] of DIRS) {
      const [nx, nz] = [cx + dx, cz + dz];
      const j = nz * w + nx;
      if (nx < 0 || nz < 0 || nx >= w || nz >= h || out[j] || !open(level, nx, nz, stop)) continue;
      if (Math.abs(edge(level, cx, cz, dx, dz) - edge(level, nx, nz, -dx, -dz)) > STEP) continue;
      out[j] = 1;
      queue.push(j);
    }
  }
  return out;
}

/** Gulv i høyden y (m), uten noe som hører til det som var der før (vegg, trapp, sone). */
function openCell(level, i, y) {
  level.tiles[i] = TILE.FLOOR;
  level.meta[i] = level.lights[i] = level.finish[i] = level.decks[i] = level.corners[i] = level.leds[i] = level.panels[i] = level.depths[i] = level.ceilings[i] = 0;
  level.floors[i] = Math.max(0, Math.round(y * 10));
}

/**
 * Sørger for at man når gangen ut fra `from` ([x, z]). Graver høyst noen ganger langs korteste vei gjennom det som er i
 * veien, tre ruter bredt, innenfor [x0, x1] (utenfor gangene ved kantene). Returnerer om det henger sammen til slutt.
 */
export function connect(level, from, to, [x0, x1], tries = 4) {
  const { w, h } = level;
  const target = Math.floor(to[1]) * w + Math.floor(to[0]);
  for (let k = 0; k < tries; k++) {
    const stop = blocked(level);
    const start = walkReach(level, ...from, stop);
    if (start[target]) return true;
    const goal = walkReach(level, ...to, stop);
    const height = (c) => edgeHeight(level, c % w, Math.floor(c / w), 0, 0);
    const prev = new Int32Array(w * h).fill(-1);
    const dist = new Int32Array(w * h);
    const from0 = new Float32Array(w * h); // høyden der veien begynner
    const queue = [];
    for (let i = 0; i < start.length; i++) if (start[i]) { prev[i] = i; from0[i] = height(i); queue.push(i); }
    let hit = -1;
    for (let q = 0; q < queue.length && hit < 0; q++) {
      const c = queue[q];
      const [x, z] = [c % w, Math.floor(c / w)];
      for (const [dx, dz] of DIRS) {
        const [nx, nz] = [x + dx, z + dz];
        const j = nz * w + nx;
        if (nx < 0 || nz < 0 || nx >= w || nz >= h || prev[j] >= 0) continue;
        if (!goal[j] && (nx < x0 || nz < 2 || nx > x1 || nz > h - 3)) continue; // graver bare innenfor, men målet kan ligge i gangen        // Inn til målet bare der veien er lang nok til å gå opp eller ned i trinn man klarer (en tribune rett ved siden av går ikke).
        if (goal[j]) {
          if (Math.abs(height(j) - from0[c]) > STEP * (dist[c] + 1)) continue;
          prev[j] = c;
          hit = j;
          break;
        }
        prev[j] = c;
        dist[j] = dist[c] + 1;
        from0[j] = from0[c];
        queue.push(j);
      }
    }
    if (hit < 0) return false;
    // Veien fra start til mål (uten endene, som allerede er der man når), og høyden jevnt mellom endene.
    const path = [];
    for (let c = prev[hit]; prev[c] !== c; c = prev[c]) path.unshift(c);
    let c0 = path.length ? prev[path[0]] : prev[hit];
    const [a, b] = [c0, hit].map((c) => edgeHeight(level, c % w, Math.floor(c / w), 0, 0));
    const done = new Set();
    path.forEach((c, n) => {
      const y = a + ((b - a) * (n + 1)) / (path.length + 1);
      for (const [dx, dz] of [[0, 0], ...DIRS]) {
        const [x, z] = [(c % w) + dx, Math.floor(c / w) + dz];
        const i = z * w + x;
        if (x < x0 || x > x1 || z < 1 || z > h - 2 || done.has(i) || start[i] || goal[i]) continue;
        done.add(i);
        openCell(level, i, y);
      }
    });
    level.objects = level.objects.filter((o) => ![...footprintCells({ ...level, objects: [o] })].some((i) => done.has(i)));
  }
  return !!walkReach(level, ...from)[target];
}
