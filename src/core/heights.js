// Høyder i rommet: gulv (soner og trapper), tak og bassengdybde – per rute og per punkt.
// Taket holdes alltid minst HEADROOM over gulvet, så hevede gulv og trapper får takhøyde
// (en trapp opp får en trappesjakt over seg). Ren logikk.
//
// Dekker (mesanin, andre etasje): en gulv- eller søylerute med `decks` har to rom over
// hverandre – nede fra gulvet opp til undersiden av platen (deck − SLAB), oppe fra dekket
// opp til taket. floorAt/topFloorAt/ceilingAt gjelder hele søylen (nederste gulv, øverste
// tak); groundAt/headAt tar høyden man står i (y) og gir gulvet/taket i den etasjen.
import { TILE, DOOR_HEIGHT, getTile, inBounds } from './level.js';
import { fountainRimAt } from './fountains.js';
import { submergedPillar, pillarPoolDepth, waterCell } from './pillar-water.js';
import { pillarInfo, pillarTouchesBox } from './pillars.js';

export const HEADROOM = DOOR_HEIGHT;
export const SLAB = 0.3; // tykkelsen på dekkeplaten
const DECK_SNAP = 0.5; // står man høyere enn dekket minus dette, står man på dekket
export const STAIR_RISE = 0.6; // stigning per rute når trappen ikke ender på et høyere gulv
export const STEP_RISE = 0.18; // ønsket opptrinn
/** Retningene en trapp kan gå oppover (meta-verdien for TILE.STAIRS): N, Ø, S, V. */
export const STAIR_DIRS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

/** Bassengdybden i ruten (fra gulvkanten til bunnen), også for ruter som ikke er vann. */
export function depthAt(level, x, z) {
  if (submergedPillar(level, x, z)) return pillarPoolDepth(level, x, z);
  const dm = inBounds(level, x, z) ? level.depths[z * level.w + x] : 0;
  return dm ? dm / 10 : level.waterDepth;
}

/** Dekkehøyden i ruten (m), eller 0 når ruten ikke har dekke (bare gulv og søyler kan ha det). */
export function deckAt(level, x, z) {
  if (!inBounds(level, x, z)) return 0;
  const i = z * level.w + x;
  const t = level.tiles[i];
  return level.decks[i] && (t === TILE.FLOOR || t === TILE.PILLAR) ? level.decks[i] / 10 : 0;
}

/** Øverste gangflate i ruten: dekket om det finnes, ellers det høyeste gulvet. */
export function upperAt(level, x, z) {
  return deckAt(level, x, z) || topFloorAt(level, x, z);
}

function zoneFloor(level, x, z) {
  return inBounds(level, x, z) ? level.floors[z * level.w + x] / 10 : 0;
}

/**
 * En trapprute: { bottom, top, dir } – høyden ved bakkanten og forkanten, og retningen
 * oppover. Toppen er rutens gulvsone; bunnen er toppen av ruten bak (forrige trinn eller
 * reposet), eller en vanlig stigning ned fra toppen når det er vegg bak.
 */
export function stairSpan(level, x, z) {
  const i = z * level.w + x;
  const dir = STAIR_DIRS[level.meta[i] & 3];
  const top = level.floors[i] / 10;
  const bx = x - dir[0];
  const bz = z - dir[1];
  const back = getTile(level, bx, bz);
  let bottom;
  if (back === TILE.STAIRS) bottom = level.floors[bz * level.w + bx] / 10;
  else if (back === TILE.WALL) bottom = Math.max(0, top - STAIR_RISE);
  else if (back === TILE.WATER) bottom = 0;
  else bottom = zoneFloor(level, bx, bz);
  return { bottom: Math.min(bottom, top), top, dir };
}

/** Gulvhøyden i ruten: bassengbunnen for vann, bunnen av trappen, ellers gulvsonen. */
export function floorAt(level, x, z) {
  const t = getTile(level, x, z);
  if (t === TILE.WATER || submergedPillar(level, x, z)) return -depthAt(level, x, z);
  if (t === TILE.STAIRS) return stairSpan(level, x, z).bottom;
  return zoneFloor(level, x, z);
}

/**
 * Bunnen av en søyle. I vann går den ned til den dypeste bunnen under fotavtrykket – ellers
 * svever en bred søyle over dypere trinn rundt søyleruten.
 */
export function pillarBottom(level, x, z) {
  const fy = floorAt(level, x, z);
  if (!submergedPillar(level, x, z)) return fy;
  const p = pillarInfo(level, x, z);
  let bottom = fy;
  for (let cz = Math.floor(p.z - p.radius); cz <= Math.floor(p.z + p.radius); cz++) {
    for (let cx = Math.floor(p.x - p.radius); cx <= Math.floor(p.x + p.radius); cx++) {
      if (waterCell(level, cx, cz) && pillarTouchesBox(p, [cx, cz, cx + 1, cz + 1])) bottom = Math.min(bottom, floorAt(level, cx, cz));
    }
  }
  return bottom;
}

/** Høyeste gulv i ruten (toppen av en trapp, vannkanten for basseng). */
export function topFloorAt(level, x, z) {
  const t = getTile(level, x, z);
  if (t === TILE.WATER || submergedPillar(level, x, z)) return 0;
  if (t === TILE.STAIRS) return stairSpan(level, x, z).top;
  return zoneFloor(level, x, z);
}

/**
 * Takhøyden i ruten: sonens egen høyde, ellers rommets – men minst HEADROOM over det
 * høyeste gulvet. Døråpninger er DOOR_HEIGHT over sitt gulv.
 */
export function ceilingAt(level, x, z) {
  const dm = inBounds(level, x, z) ? level.ceilings[z * level.w + x] : 0;
  const top = topFloorAt(level, x, z);
  const h = Math.max(dm ? dm / 10 : level.height, top + HEADROOM, deckAt(level, x, z) + HEADROOM);
  return getTile(level, x, z) === TILE.DOOR ? Math.min(h, top + DOOR_HEIGHT) : h;
}

/** Taket over den som står i høyden y: undersiden av dekket for etasjen under, ellers taket. */
export function headAt(level, x, z, y) {
  const [cx, cz] = [Math.floor(x), Math.floor(z)];
  const d = deckAt(level, cx, cz);
  return d && y < d - DECK_SNAP ? d - SLAB : ceilingAt(level, cx, cz);
}

/**
 * Bakkehøyden i et punkt (meter). I trapper stiger den jevnt fra bunn til topp. Med y (høyden
 * man står i nå) gir en rute med dekke dekket når man er oppe, ellers gulvet under.
 */
export function groundAt(level, x, z, y = null) {
  const cx = Math.floor(x);
  const cz = Math.floor(z);
  const rim = fountainRimAt(level, x, z);
  if (rim !== null) return rim;
  if (y !== null) {
    const d = deckAt(level, cx, cz);
    if (d && y >= d - DECK_SNAP) return d;
  }
  if (getTile(level, cx, cz) !== TILE.STAIRS) return floorAt(level, cx, cz);
  const { bottom, top, dir } = stairSpan(level, cx, cz);
  const fx = x - cx;
  const fz = z - cz;
  const t = dir[0] ? (dir[0] > 0 ? fx : 1 - fx) : dir[1] > 0 ? fz : 1 - fz;
  return bottom + (top - bottom) * Math.min(1, Math.max(0, t));
}

/** Gulvhøyden langs rutens kant mot (dx, dz): toppen for en trapp som går den veien. */
export function edgeHeight(level, x, z, dx, dz) {
  if (getTile(level, x, z) !== TILE.STAIRS) return topFloorAt(level, x, z);
  const { bottom, top, dir } = stairSpan(level, x, z);
  return dir[0] === dx && dir[1] === dz ? top : bottom;
}
