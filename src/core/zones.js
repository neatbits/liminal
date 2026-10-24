// Soner: egen takhøyde, bassengdybde, gulvhøyde eller belegg for deler av rommet. Verdiene
// ligger i lagene `ceilings` / `depths` / `floors` (desimeter, 0 = rommets standard) og
// `finish` (paletten i finishes.js: tema, fliser og butikkbelegg). Maling påvirker bare ruter der sonen
// gjelder, men verdien beholdes om ruten senere bygges om – så en vegg som tegnes og viskes
// ut igjen ikke lager hull i sonen.
import { TILE, inBounds, clampHeight, clampDepth, clampFloor, clampDeck } from './level.js';
import { floodRegion } from './ops.js';
import { submergedPillar } from './pillar-water.js';
import { clampFinish } from './finishes.js';
export { FINISH } from './finishes.js';

// Gulvhøyde gjelder ikke vann (vannflaten er felles) og ikke trapper (de styres av
// trappeverktøyet). Belegg lagres som et tall (raw) og får ingen etikett i skissen.
export const ZONES = {
  ceiling: { key: 'ceilings', clamp: clampHeight, applies: (t) => t !== TILE.WALL },
  depth: { key: 'depths', clamp: clampDepth, applies: (t, l, i) => t === TILE.WATER || !!l && submergedPillar(l, i % l.w, Math.floor(i / l.w)) },
  floor: { key: 'floors', clamp: clampFloor, applies: (t) => t !== TILE.WALL && t !== TILE.WATER && t !== TILE.STAIRS },
  // Dekke (andre etasje) over gulv og søyler; trapper og dører går gjennom begge etasjer.
  deck: { key: 'decks', clamp: clampDeck, applies: (t) => t === TILE.FLOOR || t === TILE.PILLAR },
  finish: { key: 'finish', clamp: clampFinish, applies: (t) => t !== TILE.WALL && t !== TILE.WATER, raw: true },
};

/** Lagret verdi for en sone: desimeter for høyder (0/null = rommets standard), ellers tallet. */
export function zoneDm(layer, metres) {
  const z = ZONES[layer];
  if (z.raw) return z.clamp(metres);
  return metres ? Math.round(z.clamp(metres) * 10) : 0;
}

function setAt(level, layer, i, dm) {
  const { key, applies } = ZONES[layer];
  if (!applies(level.tiles[i], level, i) || level[key][i] === dm) return false;
  level[key][i] = dm;
  return true;
}

/** Maler sonen på ruter [[x, z], …]. Returnerer antall ruter som endret seg. */
export function paintZone(level, layer, cells, metres) {
  const dm = zoneDm(layer, metres);
  let n = 0;
  for (const [x, z] of cells) if (inBounds(level, x, z) && setAt(level, layer, z * level.w + x, dm)) n++;
  return n;
}

/** Som paintZone, men med indekser (rektangel, fyll). */
export function fillZone(level, layer, indices, metres) {
  const dm = zoneDm(layer, metres);
  let n = 0;
  for (const i of indices) if (setAt(level, layer, i, dm)) n++;
  return n;
}

/** Sammenhengende ruter der sonen gjelder og som har samme lagrede verdi som (x, z). */
export function zoneRegion(level, layer, x, z) {
  if (!inBounds(level, x, z)) return [];
  const { key, applies } = ZONES[layer];
  const values = level[key];
  const start = values[z * level.w + x];
  return floodRegion(level, x, z, (t, i) => applies(t, level, i) && values[i] === start);
}

/** Fyll: gir hele den sammenhengende sonen under (x, z) en ny verdi. */
export function floodFillZone(level, layer, x, z, metres) {
  return fillZone(level, layer, zoneRegion(level, layer, x, z), metres);
}

/**
 * Soner med egen verdi, til etiketter i skissen: [{ layer, x, z, value, cells }].
 * (x, z) er ruten i sonen nærmest sonens tyngdepunkt, helst en uten lys og startpunkt
 * (så etiketten ikke skjuler dem).
 */
export function zoneLabels(level) {
  const { w } = level;
  const spawn = Math.floor(level.spawn.z) * w + Math.floor(level.spawn.x);
  const busy = (j) => level.lights[j] !== 0 || j === spawn;
  const out = [];
  for (const layer of Object.keys(ZONES)) {
    const { key, applies, raw } = ZONES[layer];
    if (raw) continue;
    const values = level[key];
    const seen = new Uint8Array(values.length);
    for (let i = 0; i < values.length; i++) {
      if (seen[i] || !values[i] || !applies(level.tiles[i], level, i)) continue;
      const region = zoneRegion(level, layer, i % w, (i / w) | 0);
      let sx = 0;
      let sz = 0;
      for (const j of region) {
        seen[j] = 1;
        sx += j % w;
        sz += (j / w) | 0;
      }
      // En dør alene (f.eks. øverst i en trapp) er ikke en sone verdt å merke.
      if (region.every((j) => level.tiles[j] === TILE.DOOR)) continue;
      const cx = sx / region.length;
      const cz = sz / region.length;
      let best = region[0];
      let bestD = Infinity;
      for (const j of region) {
        const d = (j % w - cx) ** 2 + (((j / w) | 0) - cz) ** 2 + (busy(j) ? 1e6 : 0);
        if (d < bestD) {
          bestD = d;
          best = j;
        }
      }
      out.push({ layer, x: best % w, z: (best / w) | 0, value: values[i] / 10, cells: region.length });
    }
  }
  return out;
}
