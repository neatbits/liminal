// Rene operasjoner på rom som editoren og generatorene bruker.
import { TILE, LIGHT, setTile, setLight, getTile, inBounds, canHaveLight } from './level.js';

/** Ruter dekket av en kvadratisk pensel med gitt størrelse sentrert på (cx, cz). */
export function brushCells(cx, cz, size = 1) {
  const s = Math.max(1, Math.floor(size));
  const x0 = cx - Math.floor((s - 1) / 2);
  const z0 = cz - Math.floor((s - 1) / 2);
  const out = [];
  for (let z = z0; z < z0 + s; z++) for (let x = x0; x < x0 + s; x++) out.push([x, z]);
  return out;
}

/** Bresenham-linje mellom to ruter (begge inkludert). */
export function lineCells(x0, z0, x1, z1) {
  const out = [];
  const dx = Math.abs(x1 - x0);
  const dz = -Math.abs(z1 - z0);
  const sx = x0 < x1 ? 1 : -1;
  const sz = z0 < z1 ? 1 : -1;
  let err = dx + dz;
  for (;;) {
    out.push([x0, z0]);
    if (x0 === x1 && z0 === z1) break;
    const e2 = 2 * err;
    if (e2 >= dz) {
      err += dz;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      z0 += sz;
    }
  }
  return out;
}

/** Normalisert rektangel (inkluderende) fra to hjørneruter. */
export function normRect(ax, az, bx, bz) {
  return { x0: Math.min(ax, bx), z0: Math.min(az, bz), x1: Math.max(ax, bx), z1: Math.max(az, bz) };
}

export function rectIndices(level, r) {
  const out = [];
  for (let z = Math.max(0, r.z0); z <= Math.min(level.h - 1, r.z1); z++) {
    for (let x = Math.max(0, r.x0); x <= Math.min(level.w - 1, r.x1); x++) out.push(z * level.w + x);
  }
  return out;
}

export function paintTiles(level, cells, tile) {
  let n = 0;
  for (const [x, z] of cells) if (setTile(level, x, z, tile)) n++;
  return n;
}

export function paintLights(level, cells, light) {
  let n = 0;
  for (const [x, z] of cells) if (setLight(level, x, z, light)) n++;
  return n;
}

export function fillTiles(level, indices, tile) {
  let n = 0;
  for (const i of indices) if (setTile(level, i % level.w, (i / level.w) | 0, tile)) n++;
  return n;
}

/** Sammenhengende ruter (4-nabo) fra (x, z) der `match(tile, indeks)` er sann. */
export function floodRegion(level, x, z, match) {
  if (!inBounds(level, x, z) || !match(getTile(level, x, z), z * level.w + x)) return [];
  const { w, h, tiles } = level;
  const seen = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  queue[tail++] = z * w + x;
  seen[z * w + x] = 1;
  while (head < tail) {
    const i = queue[head++];
    const cx = i % w;
    const cz = (i / w) | 0;
    const next = [cx > 0 ? i - 1 : -1, cx < w - 1 ? i + 1 : -1, cz > 0 ? i - w : -1, cz < h - 1 ? i + w : -1];
    for (const j of next) {
      if (j < 0 || seen[j] || !match(tiles[j], j)) continue;
      seen[j] = 1;
      queue[tail++] = j;
    }
  }
  return Array.from(queue.subarray(0, tail));
}

/** Fyll: bytter ut den sammenhengende flaten med samme rutetype. */
export function floodFillTile(level, x, z, tile) {
  const start = getTile(level, x, z);
  if (start === tile) return 0;
  return fillTiles(level, floodRegion(level, x, z, (t) => t === start), tile);
}

/** Alle åpne ruter (ikke vegg) som henger sammen med (x, z). */
export function openRegion(level, x, z) {
  return floodRegion(level, x, z, (t) => t !== TILE.WALL);
}

function clearSight(level, x0, z0, x1, z1) {
  for (const [x, z] of lineCells(x0, z0, x1, z1)) if (getTile(level, x, z) === TILE.WALL) return false;
  return true;
}

function litWithin(level, x, z, reach) {
  const r = Math.ceil(reach);
  for (let dz = -r; dz <= r; dz++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dz * dz > reach * reach) continue;
      const nx = x + dx;
      const nz = z + dz;
      if (!inBounds(level, nx, nz) || level.lights[nz * level.w + nx] === LIGHT.NONE) continue;
      if (clearSight(level, x, z, nx, nz)) return true;
    }
  }
  return false;
}

/**
 * Plasserer lys i et jevnt mønster (justert til et globalt rutenett) og fyller så inn
 * der ingen lys når fram, f.eks. i smale ganger.
 * @param {object} o  spacing, region (indekser, standard hele rommet), state (fast tilstand)
 *                    eller rand + flicker/broken (andeler) for tilfeldig variasjon.
 */
export function autoLights(level, o = {}) {
  const { spacing = 3, region = null, state = null, rand = Math.random, flicker = 0, broken = 0 } = o;
  const { w, tiles, lights } = level;
  const cells = region ?? Array.from({ length: tiles.length }, (_, i) => i);
  for (const i of cells) lights[i] = LIGHT.NONE;
  const pickState = () => {
    if (state !== null) return state;
    const r = rand();
    if (r < broken) return LIGHT.BROKEN;
    if (r < broken + flicker) return LIGHT.FLICKER;
    return LIGHT.ON;
  };
  const off = Math.floor(spacing / 2);
  // Automatiske lys havner aldri i døråpninger (lavt tak) – manuelt kan man likevel sette dem der.
  const allowed = (t) => canHaveLight(t) && t !== TILE.DOOR;
  let placed = 0;
  for (const i of cells) {
    const x = i % w;
    const z = (i / w) | 0;
    if (x % spacing === off && z % spacing === off && allowed(tiles[i])) {
      lights[i] = pickState();
      placed++;
    }
  }
  const reach = spacing * 0.75;
  for (const i of cells) {
    if (!allowed(tiles[i]) || lights[i] !== LIGHT.NONE) continue;
    if (!litWithin(level, i % w, (i / w) | 0, reach)) {
      lights[i] = pickState();
      placed++;
    }
  }
  return placed;
}

export function clearLights(level, region = null) {
  const cells = region ?? Array.from({ length: level.lights.length }, (_, i) => i);
  let n = 0;
  for (const i of cells) {
    if (level.lights[i] !== LIGHT.NONE) n++;
    level.lights[i] = LIGHT.NONE;
  }
  return n;
}
