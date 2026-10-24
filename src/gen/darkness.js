// Mørke deler av genererte nivåer: en fløy av rom bak dører der alle lysrørene er døde, eller et
// område i en åpen hall der lyset dør ut, med noen blinkende rør i overgangen. Hver mørk del er
// omtrent SHARE av gulvet, så den merkes. Aldri der man starter.
// Lysene blir ødelagte (armaturen henger der, mørk), så resten av rommet er uendret. Ren logikk.
import { TILE, LIGHT } from '../core/level.js';
import { getTheme } from '../core/themes.js';

const MIN_ROOM = 12; // ruter: en fløy starter aldri i en bod
const FAR = 10; // m fra start til midten av et mørkt område i en åpen hall
const SHARE = 0.18; // andel av gulvet per mørk del

/** Rommene: sammenhengende ruter avgrenset av vegger og dører (dørene hører ikke til noe rom). */
export function regions(level) {
  const { w, h, tiles } = level;
  const id = new Int32Array(w * h).fill(-1);
  const out = [];
  for (let start = 0; start < tiles.length; start++) {
    if (id[start] >= 0 || tiles[start] === TILE.WALL || tiles[start] === TILE.DOOR) continue;
    const cells = [start];
    id[start] = out.length;
    for (let k = 0; k < cells.length; k++) {
      const x = cells[k] % w, z = (cells[k] / w) | 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, nz = z + dz, j = nz * w + nx;
        if (nx < 0 || nz < 0 || nx >= w || nz >= h || id[j] >= 0) continue;
        if (tiles[j] === TILE.WALL || tiles[j] === TILE.DOOR) continue;
        id[j] = out.length;
        cells.push(j);
      }
    }
    out.push(cells);
  }
  // Nabo-rom: de som deler en dør.
  const links = out.map(() => new Set());
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] !== TILE.DOOR) continue;
    const x = i % w, z = (i / w) | 0;
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => (x + dx < 0 || z + dz < 0 || x + dx >= w || z + dz >= h ? -1 : id[(z + dz) * w + x + dx])).filter((r) => r >= 0);
    for (const a of near) for (const b of near) if (a !== b) links[a].add(b);
  }
  return { id, cells: out, links };
}

const lit = (level, i) => level.lights[i] === LIGHT.ON || level.lights[i] === LIGHT.FLICKER;

/**
 * Gjør opptil `zones` deler av rommet mørke, hver omtrent `share` av gulvet.
 * @returns {number} hvor mange lys som ble slukket
 */
export function darkZones(level, rand, zones = 1, spawn = level.spawn, share = SHARE) {
  const { id, cells, links } = regions(level);
  const home = spawn ? id[Math.floor(spawn.z) * level.w + Math.floor(spawn.x)] : -1;
  const floor = cells.reduce((s, c) => s + c.length, 0);
  const target = Math.max(40, floor * share);
  const dark = new Set([home]);
  let n = 0;
  for (let zone = 0; zone < zones; zone++) {
    // Flere rom: en fløy av rom blir mørk, fra ett rom og videre gjennom dørene. Ett stort rom
    // (åpen hall): et område i den.
    const starts = cells.map((c, k) => k).filter((k) => !dark.has(k) && cells[k].length >= MIN_ROOM && cells[k].some((i) => lit(level, i)));
    if (starts.length && (home < 0 || cells[home].length < floor * 0.6)) {
      const wing = [starts[Math.floor(rand() * starts.length)]];
      let area = 0;
      for (let k = 0; k < wing.length && area < target; k++) {
        const room = wing[k];
        dark.add(room);
        area += cells[room].length;
        for (const i of cells[room]) {
          if (!lit(level, i)) continue;
          level.lights[i] = LIGHT.BROKEN;
          n++;
        }
        const next = [...links[room]].filter((r) => !dark.has(r) && !wing.includes(r));
        for (let j = next.length - 1; j > 0; j--) {
          const s = Math.floor(rand() * (j + 1));
          [next[j], next[s]] = [next[s], next[j]];
        }
        wing.push(...next);
      }
      continue;
    }
    // Lyset når langt (temaets radius): midten må ligge godt utenfor de tente rørene for å bli mørk.
    const reach = getTheme(level.theme).light?.radius ?? 8;
    n += darkPatch(level, rand, spawn, Math.min(16, Math.max(7, Math.sqrt(target / Math.PI), reach * 0.75 + 4)));
  }
  return n;
}

/** Et område med radius r et stykke unna start; lysene rett utenfor blinker av og til. */
function darkPatch(level, rand, spawn, r) {
  const lights = [];
  for (let i = 0; i < level.lights.length; i++) if (lit(level, i)) lights.push(i);
  const far = lights.filter((i) => !spawn || Math.hypot((i % level.w) + 0.5 - spawn.x, Math.floor(i / level.w) + 0.5 - spawn.z) >= FAR);
  if (!far.length) return 0;
  const centre = far[Math.floor(rand() * far.length)];
  const [cx, cz] = [centre % level.w, Math.floor(centre / level.w)];
  let n = 0;
  for (const i of lights) {
    const x = i % level.w, z = Math.floor(i / level.w);
    const d = Math.hypot(x - cx, z - cz);
    if (spawn && Math.hypot(x + 0.5 - spawn.x, z + 0.5 - spawn.z) < 4) continue; // aldri mørkt rett ved start
    if (d <= r) level.lights[i] = LIGHT.BROKEN;
    else if (d <= r + 2 && rand() < 0.3) level.lights[i] = LIGHT.FLICKER;
    else continue;
    n++;
  }
  return n;
}
