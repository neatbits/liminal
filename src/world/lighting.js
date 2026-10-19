// Bakt lys: hver vertex får lys fra armaturer innenfor en radius, med siktlinje gjennom
// rutenettet (vegger, lavere tak, bassengkanter og dekkeplater kaster skygge). Blinkende lys
// bakes i egne grupper. Et lys i en rute med dekke gir én armatur i hver etasje.
import { TILE, LIGHT, canHaveLight, inBounds } from '../core/level.js';
import { ceilingAt, floorAt, deckAt, SLAB } from '../core/heights.js';
import { closedDoorFaces } from '../core/doors.js';
import { glowSources } from '../core/objects.js';
import { windows, skyOf } from '../core/windows.js';
import { hexToLinear } from './color.js';

export const FLICKER_GROUPS = 4;
export const LIGHT_DROP = 0.15; // lyskilden sitter litt under taket
const EPS = 1e-3;
const LIP = 0.15; // slingringsmonn mot gulvet, så kanten over vannflaten ikke skygger vannet
const NUDGE = 1e-4;

export function flickerGroup(x, z) {
  return (((x * 73856093) ^ (z * 19349663)) >>> 0) % FLICKER_GROUPS;
}

/**
 * Alle armaturer i rommet: { cx, cz, x, z, y, ceil, state, group }, pluss lyskilder uten
 * armatur (object: true – de surrer ikke): svakt lys fra skjermer og dagslys fra vinduer, med
 * egen farge (rgb, lineær) og styrke (power) i forhold til et taklys.
 */
export function collectLights(level) {
  const out = [];
  for (let z = 0; z < level.h; z++) {
    for (let x = 0; x < level.w; x++) {
      const i = z * level.w + x;
      const state = level.lights[i];
      if (state === LIGHT.NONE || !canHaveLight(level.tiles[i])) continue;
      const group = flickerGroup(x, z);
      const d = deckAt(level, x, z);
      for (const ceil of d ? [d - SLAB, ceilingAt(level, x, z)] : [ceilingAt(level, x, z)]) {
        out.push({ cx: x, cz: z, x: x + 0.5, z: z + 0.5, y: ceil - LIGHT_DROP, ceil, state, group });
      }
    }
  }
  for (const g of glowSources(level)) {
    if (!inBounds(level, g.cx, g.cz)) continue;
    out.push({ ...g, ceil: g.y, state: LIGHT.ON, group: 0, object: true });
  }
  const sky = skyOf(level);
  const rgb = hexToLinear(sky.light);
  // Vinduer som sitter tett deler på dagslyset (ellers summeres de, og med taklyset blir det
  // hvitt): hvert vindu får styrken delt på hvor mange vinduer som er innen 3 m.
  const wins = windows(level);
  for (const win of wins) {
    const near = wins.filter((o) => Math.hypot(o.x - win.x, o.z - win.z) <= 3).length;
    const [nx, nz] = win.n;
    const x = win.x + 0.5 + nx * 0.9;
    const z = win.z + 0.5 + nz * 0.9;
    const y = (win.sill + win.head) / 2;
    out.push({ cx: Math.floor(x), cz: Math.floor(z), x, z, y, ceil: y, state: LIGHT.ON, group: 0, object: true, power: sky.power / (1 + (near - 1) * 0.7), rgb });
  }
  return out;
}

/**
 * Gulv- og takhøyde per rute (vegger er ubegrenset – de stopper siktlinjen uansett), dekkeplater
 * (slab = toppen, 0 = ingen) og rutekanter som stenges av lukkede dører (se closedDoorFaces).
 */
export function cellHeights(level) {
  const n = level.w * level.h;
  const floor = new Float32Array(n);
  const ceil = new Float32Array(n);
  const slab = new Float32Array(n);
  let decks = false;
  for (let i = 0; i < n; i++) {
    const x = i % level.w;
    const z = (i / level.w) | 0;
    const wall = level.tiles[i] === TILE.WALL;
    floor[i] = wall ? -Infinity : floorAt(level, x, z);
    ceil[i] = wall ? Infinity : ceilingAt(level, x, z);
    slab[i] = wall ? 0 : deckAt(level, x, z);
    if (slab[i]) decks = true;
  }
  return { floor, ceil, slab: decks ? slab : null, faces: closedDoorFaces(level) };
}

const fits = (heights, i, y) => y <= heights.ceil[i] + EPS && y >= heights.floor[i] - LIP;

/** Går linjestykket (høyde ya → yb) inne i ruten gjennom dekkeplaten der? */
function throughSlab(heights, i, ya, yb) {
  const top = heights.slab?.[i];
  if (!top || i < 0) return false;
  return Math.max(ya, yb) > top - SLAB + EPS && Math.min(ya, yb) < top - EPS;
}

/**
 * Siktlinje i rutenettet (DDA). Startruten og målruten sjekkes ikke for vegg.
 * Med `heights` (cellHeights) og høydene y0/y1 i endepunktene må linjen dessuten gå under
 * taket og over gulvet i begge ruter der den krysser en rutegrense, og ikke gjennom en
 * lukket dør.
 */
export function lineOfSight(level, x0, z0, x1, z1, heights = null, y0 = 0, y1 = 0) {
  const { w, h, tiles } = level;
  let cx = Math.floor(x0);
  let cz = Math.floor(z0);
  const ex = Math.floor(x1);
  const ez = Math.floor(z1);
  const dx = x1 - x0;
  const dz = z1 - z0;
  const stepX = dx > 0 ? 1 : -1;
  const stepZ = dz > 0 ? 1 : -1;
  const tdx = dx !== 0 ? Math.abs(1 / dx) : Infinity;
  const tdz = dz !== 0 ? Math.abs(1 / dz) : Infinity;
  let tmx = dx !== 0 ? (dx > 0 ? cx + 1 - x0 : x0 - cx) * tdx : Infinity;
  let tmz = dz !== 0 ? (dz > 0 ? cz + 1 - z0 : z0 - cz) * tdz : Infinity;
  const slabs = heights?.slab ? heights : null;
  const yAt = (t) => y0 + (y1 - y0) * t;
  let tIn = 0; // der linjen gikk inn i ruten den er i nå
  for (let guard = 0; guard < 4096; guard++) {
    const prev = inBounds(level, cx, cz) ? cz * w + cx : -1;
    let t;
    // Kantene som krysses (se closedDoorFaces): forrige rutes og den nye rutens.
    let fPrev;
    let fNext;
    if (Math.min(tmx, tmz) > 1) return !(slabs && throughSlab(slabs, prev, yAt(tIn), y1));
    if (tmx < tmz) {
      t = tmx;
      cx += stepX;
      tmx += tdx;
      fPrev = stepX > 0 ? 8 : 4;
      fNext = 12 - fPrev;
    } else {
      t = tmz;
      cz += stepZ;
      tmz += tdz;
      fPrev = stepZ > 0 ? 2 : 1;
      fNext = 3 - fPrev;
    }
    if (slabs && throughSlab(slabs, prev, yAt(tIn), yAt(t))) return false;
    tIn = t;
    const end = cx === ex && cz === ez;
    if (cx < 0 || cz < 0 || cx >= w || cz >= h) return end;
    const i = cz * w + cx;
    if (!end && tiles[i] === TILE.WALL) return false;
    if (heights) {
      const y = y0 + (y1 - y0) * t;
      if (!fits(heights, i, y) || (prev >= 0 && !fits(heights, prev, y))) return false;
      if (heights.faces[i] & fNext || (prev >= 0 && heights.faces[prev] & fPrev)) return false;
    }
    if (end) return !(slabs && throughSlab(slabs, i, yAt(t), y1));
  }
  return true;
}

/**
 * Punkter på en rutegrense (hjørner av gulv og tak) hører til den åpne ruten de faktisk
 * ligger i høydemessig. Skyver punktet et hårsbredd inn i den ruten, så taket i et høyt
 * rom ikke regnes som inne i nabosonen med lavere tak.
 */
function settle(level, heights, x, z, y) {
  const fx = Math.floor(x);
  const fz = Math.floor(z);
  if (x !== fx && z !== fz) return [x, z];
  const ox = x === fx ? [0, -1] : [0];
  const oz = z === fz ? [0, -1] : [0];
  for (const ax of ox) {
    for (const az of oz) {
      const cx = fx + ax;
      const cz = fz + az;
      if (!inBounds(level, cx, cz)) continue;
      const i = cz * level.w + cx;
      if (level.tiles[i] !== TILE.WALL && fits(heights, i, y)) return [x + ax * NUDGE, z + az * NUDGE];
    }
  }
  return [x, z];
}

/**
 * Lager en lysfunksjon for rommet.
 * sample(x,y,z,nx,ny,nz) → [r, g, b, f0, f1, f2, f3] (statisk lys + blinkegrupper, skalar).
 */
export function createLightField(level, theme, lights = collectLights(level)) {
  const p = theme.light;
  const color = hexToLinear(p.color);
  const ambient = hexToLinear(p.ambient);
  const intensity = p.intensity * (level.bright ?? 1);
  const k = 1 / (p.falloff * p.falloff);
  const R = p.radius;
  const R2 = R * R;
  const B = 4;
  const bw = Math.ceil(level.w / B);
  const bh = Math.ceil(level.h / B);
  const buckets = Array.from({ length: bw * bh }, () => []);
  for (const l of lights) {
    if (l.state === LIGHT.BROKEN) continue;
    buckets[Math.floor(l.cz / B) * bw + Math.floor(l.cx / B)].push(l);
  }
  const heights = cellHeights(level);

  function near(x, z, r) {
    const out = [];
    const bx0 = Math.max(0, Math.floor((x - r) / B));
    const bx1 = Math.min(bw - 1, Math.floor((x + r) / B));
    const bz0 = Math.max(0, Math.floor((z - r) / B));
    const bz1 = Math.min(bh - 1, Math.floor((z + r) / B));
    for (let bz = bz0; bz <= bz1; bz++) {
      for (let bx = bx0; bx <= bx1; bx++) for (const l of buckets[bz * bw + bx]) out.push(l);
    }
    return out;
  }

  const cache = new Map();
  function sample(x, y, z, nx, ny, nz) {
    const key = `${x},${y},${z},${nx},${ny},${nz}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const out = [ambient[0], ambient[1], ambient[2], 0, 0, 0, 0];
    const day = [0, 0, 0]; // dagslys fra vinduer, lagt til til slutt
    const [sx, sz] = settle(level, heights, x + nx * 0.02, z + nz * 0.02, y);
    for (const l of near(sx, sz, R)) {
      const dx = l.x - sx;
      const dy = l.y - y;
      const dz = l.z - sz;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > R2) continue;
      const d = Math.sqrt(d2) + 1e-6;
      const wrap = ((nx * dx + ny * dy + nz * dz) / d) * 0.7 + 0.3;
      if (wrap <= 0) continue;
      const win = 1 - d2 / R2;
      const c = (wrap * intensity * (l.power ?? 1) * win * win) / (1 + d2 * k);
      if (c < 0.002 || !lineOfSight(level, sx, sz, l.x, l.z, heights, y, l.y)) continue;
      if (l.state === LIGHT.FLICKER) {
        out[3 + l.group] += c;
      } else {
        const col = l.rgb ?? color;
        const to = l.rgb ? day : out;
        to[0] += c * col[0];
        to[1] += c * col[1];
        to[2] += c * col[2];
      }
    }
    // Dagslyset legges til mindre jo lysere det allerede er (ellers blir lyse rom med mange
    // vinduer helt hvite): et mørkt rom får nesten alt, et opplyst rom en liten del.
    const lit = (out[0] + out[1] + out[2]) / 3;
    const share = 1 / (1 + lit * lit * 2);
    for (let c = 0; c < 3; c++) out[c] += day[c] * share;
    cache.set(key, out);
    return out;
  }

  return { sample, near, color, lights };
}
