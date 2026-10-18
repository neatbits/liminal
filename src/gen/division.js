// Rekursiv oppdeling: deler rommet med vegger på partalls-koordinater og åpninger på
// oddetalls-koordinater. Det garanterer at alle rom henger sammen.
import { TILE } from '../core/level.js';

const DEFAULTS = {
  minRoom: 4, // minste romstørrelse (ruter) på hver side av en vegg
  wideChance: 0.3, // sjanse for bred åpning i stedet for dør
  wideWidth: 3,
  doorTile: TILE.DOOR,
  stopChance: 0.15, // sjanse for å stoppe tidlig (gir større rom)
  maxStopArea: 80, // bare rom under dette arealet kan stoppe tidlig
};

function evenIn(lo, hi) {
  const out = [];
  for (let v = lo; v <= hi; v++) if (v % 2 === 0) out.push(v);
  return out;
}

function oddIn(lo, hi) {
  const out = [];
  for (let v = lo; v <= hi; v++) if (v % 2 === 1) out.push(v);
  return out;
}

/**
 * Deler området [x0..x1] × [z0..z1] (åpne ruter) rekursivt.
 * @returns {Array<{x0,z0,x1,z1}>} bladrommene
 */
export function recursiveDivision(level, rand, options = {}) {
  const o = { ...DEFAULTS, ...options };
  const leaves = [];
  const set = (x, z, t) => {
    level.tiles[z * level.w + x] = t;
    if (t === TILE.WALL) level.lights[z * level.w + x] = 0;
  };

  function opening(lo, hi, place) {
    const odd = oddIn(lo, hi);
    if (!odd.length) return;
    const p = odd[Math.floor(rand() * odd.length)];
    if (rand() < o.wideChance) {
      for (let k = 0; k < o.wideWidth && p + k <= hi; k++) place(p + k, TILE.FLOOR);
    } else {
      place(p, o.doorTile);
    }
  }

  function divide(x0, z0, x1, z1) {
    const rw = x1 - x0 + 1;
    const rh = z1 - z0 + 1;
    const xs = evenIn(x0 + o.minRoom, x1 - o.minRoom);
    const zs = evenIn(z0 + o.minRoom, z1 - o.minRoom);
    const early = rw * rh <= o.maxStopArea && rand() < o.stopChance;
    if ((!xs.length && !zs.length) || early) {
      leaves.push({ x0, z0, x1, z1 });
      return;
    }
    const vertical = xs.length && (!zs.length || rw > rh || (rw === rh && rand() < 0.5));
    if (vertical) {
      const wx = xs[Math.floor(rand() * xs.length)];
      for (let z = z0; z <= z1; z++) set(wx, z, TILE.WALL);
      opening(z0, z1, (z, t) => set(wx, z, t));
      divide(x0, z0, wx - 1, z1);
      divide(wx + 1, z0, x1, z1);
    } else {
      const wz = zs[Math.floor(rand() * zs.length)];
      for (let x = x0; x <= x1; x++) set(x, wz, TILE.WALL);
      opening(x0, x1, (x, t) => set(x, wz, t));
      divide(x0, z0, x1, wz - 1);
      divide(x0, wz + 1, x1, z1);
    }
  }

  divide(1, 1, level.w - 2, level.h - 2);
  return leaves;
}

/** Lager ekstra åpninger i tilfeldige vegger som har åpne ruter på begge sider (gir løkker). */
export function punchLoops(level, rand, count, tile = TILE.DOOR) {
  const { w, h, tiles } = level;
  const open = (i) => tiles[i] !== TILE.WALL;
  let made = 0;
  for (let tries = 0; made < count && tries < count * 60; tries++) {
    const x = 1 + Math.floor(rand() * (w - 2));
    const z = 1 + Math.floor(rand() * (h - 2));
    const i = z * w + x;
    if (open(i)) continue;
    const horiz = open(i - 1) && open(i + 1) && !open(i - w) && !open(i + w);
    const vert = open(i - w) && open(i + w) && !open(i - 1) && !open(i + 1);
    if (horiz || vert) {
      tiles[i] = tile;
      made++;
    }
  }
  return made;
}
