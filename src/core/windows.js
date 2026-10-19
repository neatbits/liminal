// Vinduer: en veggrute med `meta` = 1 er et vindu mot rommet på den ene siden (den er fortsatt
// vegg for alt annet – kollisjon, lys, dører). Åpningen går fra SILL til HEAD over gulvet i
// rommet. `level.sky` er tiden på døgnet (SKIES): fargen på himmelen i vinduene, lyset som
// kommer inn, og solflekkene på gulvet. Ren logikk.
import { TILE, getTile, inBounds } from './level.js';
import { topFloorAt, ceilingAt } from './heights.js';

export const SILL = 0.9;
export const HEAD = 2.2;
export const FRAME = 0.1; // karm rundt glasset
const WINDOW = 1;
const SIDES = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

/**
 * Tider på døgnet: himmel (topp, bunn), lyset som kommer inn (farge, styrke i forhold til et
 * taklys) og sola (høyde over horisonten, vinkel til siden, farge og styrke) – null om natta.
 */
export const SKIES = {
  day: { label: 'Day', sky: ['#cfe6f7', '#f4f8f8'], light: '#eef6ff', power: 1.15, sun: { elev: 0.75, side: 0.35, color: '#fff6e0', strength: 0.55 } },
  golden: { label: 'Golden hour', sky: ['#f6c98a', '#ffe9c4'], light: '#ffd9a0', power: 1.05, sun: { elev: 0.32, side: -0.45, color: '#ffbe6e', strength: 0.75 } },
  dusk: { label: 'Dusk', sky: ['#4b5d95', '#d99a8e'], light: '#a7a2d6', power: 0.55, sun: { elev: 0.12, side: 0.6, color: '#ff9e7a', strength: 0.35 } },
  night: { label: 'Night', sky: ['#0b1024', '#1d2a4a'], light: '#5a6c9e', power: 0.2, sun: null },
};
export const DEFAULT_SKY = 'day';

export function skyOf(level) {
  return SKIES[level.sky] ?? SKIES[DEFAULT_SKY];
}

/** Den åpne siden: [dx, dz] mot rommet, eller null når ruten ikke har nøyaktig én åpen side. */
function openSide(level, x, z) {
  const open = SIDES.filter(([dx, dz]) => getTile(level, x + dx, z + dz) !== TILE.WALL);
  return open.length === 1 ? open[0] : null;
}

/** Kan veggruten få et vindu? Vegg med rom på nøyaktig én side (vinduet vender mot det). */
export function canHoldWindow(level, x, z) {
  return inBounds(level, x, z) && getTile(level, x, z) === TILE.WALL && !!openSide(level, x, z);
}

/**
 * Vinduet i (x, z): { x, z, n: [dx, dz] inn i rommet, floor, sill, head } – sill/head er
 * høyder i meter (åpningen krymper under lave tak), eller null.
 */
export function windowInfo(level, x, z) {
  if (!inBounds(level, x, z) || level.tiles[z * level.w + x] !== TILE.WALL || !(level.meta[z * level.w + x] & WINDOW)) return null;
  const n = openSide(level, x, z);
  if (!n) return null;
  const floor = topFloorAt(level, x + n[0], z + n[1]);
  const head = Math.min(floor + HEAD, ceilingAt(level, x + n[0], z + n[1]) - 0.25);
  if (head - (floor + SILL) < 0.4) return null;
  return { x, z, n, floor, sill: floor + SILL, head };
}

/** Alle vinduene i rommet. */
export function windows(level) {
  const out = [];
  for (let z = 0; z < level.h; z++) for (let x = 0; x < level.w; x++) if (level.meta[z * level.w + x] & WINDOW) {
    const w = windowInfo(level, x, z);
    if (w) out.push(w);
  }
  return out;
}

/** Vinduverktøyet: setter inn (on) eller fjerner vinduer i rutene. Returnerer antall endringer. */
export function paintWindows(level, cells, on) {
  let n = 0;
  for (const [x, z] of cells) {
    if (!inBounds(level, x, z) || getTile(level, x, z) !== TILE.WALL) continue;
    const i = z * level.w + x;
    if (on && !canHoldWindow(level, x, z)) continue;
    const next = on ? level.meta[i] | WINDOW : level.meta[i] & ~WINDOW;
    if (next !== level.meta[i]) {
      level.meta[i] = next;
      n++;
    }
  }
  return n;
}

/**
 * Solflekken fra et vindu: fire hjørner [x, z] på gulvet (nede-venstre, nede-høyre, oppe-høyre,
 * oppe-venstre sett fra glasset, så uv følger vinduets ruter), eller null når sola ikke står
 * på eller flekken ville havnet i en vegg. Flekken kortes ned om den når en vegg.
 */
export function sunPatch(level, win, sun) {
  if (!sun) return null;
  const [nx, nz] = win.n;
  const [ux, uz] = [-nz, nx]; // langs veggen
  // Veggflaten mot rommet, og punktet midt i den nederst.
  const face = [win.x + 0.5 + nx * 0.5, win.z + 0.5 + nz * 0.5];
  const reach = 1 / Math.tan(sun.elev); // vannrett forskyvning per meter høyde
  const dir = [nx * Math.cos(sun.side) + ux * Math.sin(sun.side), nz * Math.cos(sun.side) + uz * Math.sin(sun.side)];
  // Flekken ligger bare på vanlig gulv i samme høyde som rommet ved vinduet.
  const open = (x, z) => {
    const [cx, cz] = [Math.floor(x), Math.floor(z)];
    return getTile(level, cx, cz) === TILE.FLOOR && Math.abs(topFloorAt(level, cx, cz) - win.floor) < 0.05;
  };
  const a = 0.5 - FRAME;
  for (let top = win.head - win.floor; top > SILL + 0.25; top -= 0.2) {
    const at = (s, h) => [face[0] + ux * s + dir[0] * h * reach, face[1] + uz * s + dir[1] * h * reach];
    const pts = [at(-a, SILL), at(a, SILL), at(a, top), at(-a, top)];
    // Hele flekken må ligge på åpent gulv: et rutenett av punkter hvert ~20 cm, så den aldri går
    // gjennom en innervegg og inn i rommet ved siden av (ikke bare hjørnene og midten).
    const n = Math.ceil(((top - SILL) * reach) / 0.2) + 1;
    let ok = true;
    for (let i = 0; i <= 4 && ok; i++) {
      for (let j = 0; j <= n && ok; j++) ok = open(...at(-a + (2 * a * i) / 4, SILL + ((top - SILL) * j) / n));
    }
    if (ok) return { points: pts, top: (top - SILL) / (win.head - win.sill) };
  }
  return null;
}
