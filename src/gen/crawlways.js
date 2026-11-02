// Krypeganger i genererte nivåer. De fleste vegger er bare én rute tykke, så en gang trenger en
// blokk å gå gjennom: et rektangel fylles til massiv vegg (helst der det allerede er mest vegg), og
// gangen graves inni: inn fra en åpning, en sving, og enten ut på den andre siden (en snarvei) eller
// til en liten utvidelse i en blindgang. Blokken stenger aldri noe man når på vanlig vis, for
// kroppen, monsteret og drømmegangen må klare seg uten gangene. Ren logikk. Se docs/crawlways.md.
import { TILE, LIGHT, getTile, setTile } from '../core/level.js';
import { footprintCells } from '../core/object-pose.js';
import { reachableCells } from './tapes.js';

export const NO_CRAWLWAYS = ['mall', 'airport']; // butikkene og galleriene, og terminalens tynne vegger, gir ikke plass
const SIZE = [6, 9]; // blokkens sider (ruter)
const TRIES = 90; // tilfeldige blokker per gang
const CHECKS = 12; // de beste av dem som får en full sjekk av hva man når
const MIN_CELLS = 4; // kortere enn dette er bare et hull i veggen
const SPAWN_CLEAR = 6; // m fra start til blokken
const AREA = 900; // én gang per så mange m² gulv
const MAX = 5;
const THROUGH = 0.45; // sjansen for en snarvei når det er rom på den andre siden

const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const between = (rand, a, b) => a + Math.floor(rand() * (b - a + 1)); // begge inkludert

/** Hvor mange ganger et nivå får: omtrent én per AREA m² gulv. */
export function crawlCount(level) {
  let open = 0;
  for (const t of level.tiles) if (t === TILE.FLOOR) open++;
  return open < 150 ? 0 : Math.max(1, Math.min(MAX, Math.round(open / AREA)));
}

const count = (cells) => cells.reduce((n, v) => n + v, 0);

/** Boksen med én rutes kant. */
const grown = ({ x0, z0, x1, z1 }) => ({ x0: x0 - 1, z0: z0 - 1, x1: x1 + 1, z1: z1 + 1 });

function eachCell({ x0, z0, x1, z1 }, fn) {
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (fn(x, z) === false) return false;
  return true;
}

/**
 * Kan blokken fylles? Bare gulv, vegg og søyler, og ingen dører, trapper, vinduer, hjørner eller gjenstander
 * i eller rett utenfor den: en ny vegg ville gjort hjørnene ugyldige og flyttet gjenstander inntil seg.
 */
function fillable(level, box, keep, taken) {
  const { w } = level;
  const inside = ({ x, z }) => x >= box.x0 - 1 && z >= box.z0 - 1 && x <= box.x1 + 1 && z <= box.z1 + 1;
  if (level.slides?.some((s) => s.points.some(([x, z]) => inside({ x, z })))) return false;
  if (level.spawn && Math.hypot(Math.max(box.x0 - level.spawn.x, 0, level.spawn.x - box.x1 - 1), Math.max(box.z0 - level.spawn.z, 0, level.spawn.z - box.z1 - 1)) < SPAWN_CLEAR) return false;
  const around = eachCell(grown(box), (x, z) => {
    const t = getTile(level, x, z);
    const i = z * w + x;
    return !(t === TILE.DOOR || t === TILE.STAIRS || t === TILE.CRAWL || level.corners[i] || taken.has(i) || (t === TILE.WALL && level.meta[i]));
  });
  return around && eachCell(box, (x, z) => {
    const i = z * w + x;
    const t = level.tiles[i];
    if (t === TILE.WATER || level.decks[i] || level.leds[i] || keep?.has(i)) return false;
    return t !== TILE.FLOOR || !level.meta[i];
  });
}

/** Lokale koordinater for siden man kommer inn fra: u langs siden, v innover. */
function frame(box, [ix, iz]) {
  const [W, D] = ix ? [box.z1 - box.z0 + 1, box.x1 - box.x0 + 1] : [box.x1 - box.x0 + 1, box.z1 - box.z0 + 1];
  const at = (u, v) => {
    const along = ix ? box.z0 + u : box.x0 + u;
    if (ix) return [ix > 0 ? box.x0 + v : box.x1 - v, along];
    return [along, iz > 0 ? box.z0 + v : box.z1 - v];
  };
  return { W, D, at };
}

/** Står man fritt rett utenfor blokken i (x, z), der man kan nå på vanlig vis? */
function standsAt(level, reach, x, z) {
  const i = z * level.w + x;
  return getTile(level, x, z) === TILE.FLOOR && !!reach[i] && !level.decks[i] && !level.meta[i];
}

/** Stedene langs blokkens kanter der en gang kan begynne: { side, u, front }. */
function mouths(level, reach, box) {
  const out = [];
  for (const side of SIDES) {
    const { W, at } = frame(box, side);
    for (let u = 1; u < W - 1; u++) {
      const [x, z] = at(u, -1);
      if (standsAt(level, reach, x, z)) out.push({ side, u, front: [x, z] });
    }
  }
  return out;
}

/** Gangen i blokken: rett inn, en sving, og videre – ut på den andre siden eller inn til en utvidelse. */
function route(level, reach, box, { side, u, front }, rand) {
  const { W, D, at } = frame(box, side);
  const dm = level.floors[front[1] * level.w + front[0]];
  const far = [];
  for (let q = 1; q < W - 1; q++) {
    if (Math.abs(q - u) === 1) continue; // to ganger side om side blir én bred gang
    const [x, z] = at(q, D);
    if (standsAt(level, reach, x, z) && level.floors[z * level.w + x] === dm) far.push(q);
  }
  const through = far.length > 0 && rand() < THROUGH;
  const turn = between(rand, 1, D - 3);
  const free = Array.from({ length: W - 2 }, (_, k) => k + 1).filter((q) => Math.abs(q - u) !== 1);
  const options = through ? far : free;
  const q = options[Math.floor(rand() * options.length)];
  const end = through ? D - 1 : between(rand, Math.min(turn + 1, D - 2), D - 2);
  const cells = [];
  const add = (a, v) => {
    const c = at(a, v);
    if (!cells.some(([x, z]) => x === c[0] && z === c[1])) cells.push(c);
  };
  for (let v = 0; v <= turn; v++) add(u, v);
  for (let a = Math.min(u, q); a <= Math.max(u, q); a++) add(a, turn);
  for (let v = turn; v <= end; v++) add(q, v);
  if (!through) {
    // Utvidelsen vender bort fra gangen man kom inn, så den ikke treffer den.
    const away = Math.sign(q - u) || (rand() < 0.5 ? 1 : -1);
    if (q + away >= 1 && q + away <= W - 2 && end - 1 >= turn) {
      add(q, end - 1);
      add(q + away, end - 1);
      add(q + away, end);
    }
  }
  return cells.length >= MIN_CELLS ? { cells, dm } : null;
}

/** Rutene man når uten krypeganger, som er de som må bevares. */
function walkable(level, blocked = new Set()) {
  const closed = new Set(blocked);
  for (let i = 0; i < level.tiles.length; i++) if (level.tiles[i] === TILE.CRAWL) closed.add(i);
  return reachableCells(level, level.spawn.x, level.spawn.z, closed);
}

function randomBox(level, rand) {
  const [w, d] = [between(rand, SIZE[0], SIZE[1]), between(rand, SIZE[0], SIZE[1])];
  if (w + 2 >= level.w || d + 2 >= level.h) return null;
  const x0 = between(rand, 1, level.w - 1 - w);
  const z0 = between(rand, 1, level.h - 1 - d);
  return { x0, z0, x1: x0 + w - 1, z1: z0 + d - 1 };
}

/** Beholder blokken alt man når på vanlig vis (bortsett fra rutene den fyller selv)? */
function keepsAll(level, box, reach) {
  const blocked = new Set();
  let lost = 0;
  eachCell(box, (x, z) => {
    const i = z * level.w + x;
    blocked.add(i);
    lost += reach[i];
  });
  return count(walkable(level, blocked)) === count(reach) - lost;
}

function carve(level, box, { cells, dm }) {
  eachCell(box, (x, z) => {
    const i = z * level.w + x;
    if (level.tiles[i] === TILE.WALL) return;
    setTile(level, x, z, TILE.WALL);
    level.floors[i] = level.ceilings[i] = level.finish[i] = 0;
  });
  for (const [x, z] of cells) {
    setTile(level, x, z, TILE.CRAWL);
    level.floors[z * level.w + x] = dm;
    level.lights[z * level.w + x] = LIGHT.NONE;
  }
}

/** Én gang: de blokkene som fyller minst gulv prøves først. */
function addOne(level, rand, keep) {
  const reach = walkable(level);
  const taken = footprintCells(level);
  const boxes = [];
  for (let k = 0; k < TRIES; k++) {
    const box = randomBox(level, rand);
    if (!box || !fillable(level, box, keep, taken)) continue;
    let filled = 0;
    eachCell(box, (x, z) => void (filled += getTile(level, x, z) !== TILE.WALL));
    boxes.push({ box, filled });
  }
  boxes.sort((a, b) => a.filled - b.filled);
  for (const { box } of boxes.slice(0, CHECKS)) {
    const options = mouths(level, reach, box);
    if (!options.length || !keepsAll(level, box, reach)) continue;
    const way = route(level, reach, box, options[Math.floor(rand() * options.length)], rand);
    if (!way) continue;
    carve(level, box, way);
    return true;
  }
  return false;
}

/**
 * Legger krypeganger i rommet.
 * @param keep Set med ruter som må være som de er, eller null
 * @returns {number} hvor mange ganger som ble laget
 */
export function addCrawlways(level, rand, wanted = crawlCount(level), keep = null) {
  if (NO_CRAWLWAYS.includes(level.theme)) return 0;
  let n = 0;
  while (n < wanted && addOne(level, rand, keep)) n++;
  return n;
}
