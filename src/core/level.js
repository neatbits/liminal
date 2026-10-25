// Romformat: et rutenett der hver rute er 1 × 1 m. Indeks = z * w + x.
// Alt utenfor kartet regnes som vegg. Sonelagene `ceilings`, `depths` og `floors` holder
// takhøyde, bassengdybde og gulvhøyde per rute i desimeter; 0 betyr rommets standard
// (`height` / `waterDepth` / gulv i 0 m). For trapper er `floors` høyden på toppen.
// `decks` gir ruten et dekke (andre etasje) i den høyden (desimeter, 0 = ingen), se heights.js.
// `meta` er tilleggsinfo som hører til rutetypen (dørblad for døråpninger, se doors.js;
// retning for trapper, se heights.js; søylediameter, se pillars.js) og nullstilles ved ny type.
// Høyder per rute og punkt regnes ut i heights.js.
import { getTheme, DEFAULT_THEME } from './themes.js';

export const TILE = Object.freeze({ WALL: 0, FLOOR: 1, WATER: 2, PILLAR: 3, DOOR: 4, STAIRS: 5 });
export const TILE_COUNT = 6;
export const LIGHT = Object.freeze({ NONE: 0, ON: 1, FLICKER: 2, BROKEN: 3 });
export const LIGHT_COUNT = 4;

export const MIN_SIZE = 8;
export const MAX_SIZE = 128;
export const HEIGHT_MIN = 2.2;
export const HEIGHT_MAX = 20; // høye haller (lampene henger da ned, se world/lighting.js)
export const DOOR_HEIGHT = 2.1;
// En åpning uten dørblad (DOOR.NONE) med denne meta-biten er en bue (core/doors.js, world/arches.js):
// toppen av buen står ARCH_TOP over gulvet, eller like under taket i lavere rom.
export const DOOR_ARCH = 16;
export const ARCH_TOP = 2.5;
export const WATER_DEPTH = 0.7; // standard bassengdybde, fra gulvkanten til bunnen
export const DEPTH_MIN = 0.3;
export const DEPTH_MAX = 3;
export const WATER_SURFACE = -0.12;
export const PILLAR_SIZE = 0.5;
export const FLOOR_MAX = 10; // platåer
export const DECK_MIN = 2.4; // et dekke (mesanin) ligger minst så høyt over gulvet
export const DECK_MAX = 10;

/** Alle lag med én verdi per rute (Uint8Array(w*h), indeks z*w+x). */
export const LAYERS = ['tiles', 'lights', 'ceilings', 'depths', 'floors', 'finish', 'meta', 'decks', 'corners'];

export function clampSize(n) {
  return Math.max(MIN_SIZE, Math.min(MAX_SIZE, Math.round(Number(n) || MIN_SIZE)));
}

export function clampHeight(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 2.7;
  return Math.max(HEIGHT_MIN, Math.min(HEIGHT_MAX, Math.round(v * 10) / 10));
}

export function clampDepth(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return WATER_DEPTH;
  return Math.max(DEPTH_MIN, Math.min(DEPTH_MAX, Math.round(v * 10) / 10));
}

export function clampFloor(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(FLOOR_MAX, Math.round(v * 10) / 10));
}

export function clampDeck(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 4;
  return Math.max(DECK_MIN, Math.min(DECK_MAX, Math.round(v * 10) / 10));
}

export function createLevel({ name = 'Untitled', theme = DEFAULT_THEME, w = 48, h = 48, height, waterDepth } = {}) {
  const t = getTheme(theme);
  w = clampSize(w);
  h = clampSize(h);
  const level = {
    id: null,
    name,
    theme: t.id,
    w,
    h,
    height: clampHeight(height ?? t.defaultHeight),
    waterDepth: clampDepth(waterDepth ?? WATER_DEPTH),
    fog: 1,
    bright: 1,
    spawn: { x: w / 2, z: h / 2, a: 0 },
    slides: [], // vannsklier (core/slides.js) – byttes ut, endres aldri på stedet
    objects: [], // gjenstander (core/objects.js) – byttes ut, endres aldri på stedet
    sky: null, // tiden på døgnet for lyset i vinduene (core/windows.js), null = dag
    tint: null, // lysfargen (core/tints.js), null = temaets
  };
  for (const key of LAYERS) level[key] = new Uint8Array(w * h);
  return level;
}

export function cloneLevel(level) {
  const out = { ...level, spawn: { ...level.spawn } };
  for (const key of LAYERS) out[key] = level[key].slice();
  return out;
}

export function inBounds(level, x, z) {
  return x >= 0 && z >= 0 && x < level.w && z < level.h;
}

export function getTile(level, x, z) {
  return inBounds(level, x, z) ? level.tiles[z * level.w + x] : TILE.WALL;
}

export function getLight(level, x, z) {
  return inBounds(level, x, z) ? level.lights[z * level.w + x] : LIGHT.NONE;
}

/** Lys kan bare henge over ruter med tak og uten søyle. */
export function canHaveLight(tile) {
  return tile !== TILE.WALL && tile !== TILE.PILLAR;
}

/** Setter en rute. Returnerer true hvis noe endret seg. Fjerner ugyldige lys. */
export function setTile(level, x, z, tile) {
  if (!inBounds(level, x, z)) return false;
  const i = z * level.w + x;
  let changed = level.tiles[i] !== tile;
  if (changed) {
    level.meta[i] = 0;
    level.corners[i] = 0; // skrått/avrundet hjørne (core/corners.js) hører til rutetypen
  }
  level.tiles[i] = tile;
  if (!canHaveLight(tile) && level.lights[i] !== LIGHT.NONE) {
    level.lights[i] = LIGHT.NONE;
    changed = true;
  }
  return changed;
}

export function setLight(level, x, z, light) {
  if (!inBounds(level, x, z)) return false;
  const i = z * level.w + x;
  if (light !== LIGHT.NONE && !canHaveLight(level.tiles[i])) return false;
  if (level.lights[i] === light) return false;
  level.lights[i] = light;
  return true;
}

export function isOpen(level, x, z) {
  return getTile(level, x, z) !== TILE.WALL;
}

/** Ny størrelse med innholdet sentrert. */
export function resizeLevel(level, w, h) {
  w = clampSize(w);
  h = clampSize(h);
  const out = createLevel({ name: level.name, theme: level.theme, w, h, height: level.height, waterDepth: level.waterDepth });
  out.id = level.id;
  out.fog = level.fog;
  out.bright = level.bright;
  out.sky = level.sky ?? null;
  out.tint = level.tint ?? null;
  const ox = Math.floor((w - level.w) / 2);
  const oz = Math.floor((h - level.h) / 2);
  for (let z = 0; z < level.h; z++) {
    for (let x = 0; x < level.w; x++) {
      const nx = x + ox;
      const nz = z + oz;
      if (!inBounds(out, nx, nz)) continue;
      for (const key of LAYERS) out[key][nz * w + nx] = level[key][z * level.w + x];
    }
  }
  out.slides = level.slides
    .map((s) => ({ ...s, points: s.points.map(([x, z]) => [x + ox, z + oz]) }))
    .filter((s) => s.points.every(([x, z]) => inBounds(out, x, z)));
  out.objects = (level.objects ?? []).map((o) => ({ ...o, x: o.x + ox, z: o.z + oz })).filter((o) => inBounds(out, o.x, o.z));
  out.spawn = {
    x: Math.min(w - 0.5, Math.max(0.5, level.spawn.x + ox)),
    z: Math.min(h - 0.5, Math.max(0.5, level.spawn.z + oz)),
    a: level.spawn.a,
  };
  return out;
}

/** Utstrekningen av alt som ikke er vegg { x0, z0, x1, z1 } (inkluderende), eller null. */
export function builtBounds(level) {
  let x0 = Infinity;
  let z0 = Infinity;
  let x1 = -1;
  let z1 = -1;
  for (let z = 0; z < level.h; z++) {
    for (let x = 0; x < level.w; x++) {
      if (level.tiles[z * level.w + x] === TILE.WALL) continue;
      x0 = Math.min(x0, x);
      z0 = Math.min(z0, z);
      x1 = Math.max(x1, x);
      z1 = Math.max(z1, z);
    }
  }
  return x1 < 0 ? null : { x0, z0, x1, z1 };
}
