// Lagring/deling av rom: lesbar JSON (eksport) og komprimert base64url (lenker).
import {
  createLevel,
  clampHeight,
  clampDepth,
  clampSize,
  TILE_COUNT,
  LIGHT_COUNT,
  HEIGHT_MIN,
  HEIGHT_MAX,
  DEPTH_MIN,
  DEPTH_MAX,
  DECK_MIN,
  DECK_MAX,
  inBounds,
} from './level.js';
import { THEMES, DEFAULT_THEME } from './themes.js';
import { SLIDE, SLIDE_COLORS, DEFAULT_SLIDE_COLOR } from './slides.js';
import { objectsFromJSON } from './objects.js';
import { SKIES } from './windows.js';
import { TINTS } from './tints.js';
import { storeysToJSON, storeysFromJSON, spawnStoreyFromJSON } from './serialize-storeys.js';

export const FORMAT = 'liminal-room';
const LEGACY_FORMATS = ['liminal-rom']; // første versjon brukte norsk formatnavn
// v3: sonelag som to heksadesimale tegn per rute (hele Uint8-området); v4: etasjer (`storeys`), som
// eldre versjoner ellers ville mistet uten å si fra.
export const VERSION = 4;
const CHAR0 = 48; // '0'. Verdi = tile | light << 3 → tegn '0'..'O'

// v3 lagrer rå desimeter/metadata som to heksadesimale tegn; 00 = standard.
// v1/v2 bruker DIGITS: 0 = standard, ellers steg over minimum. Tomme lag utelates.
const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const LAYERS = [
  { key: 'ceilings', min: Math.round(HEIGHT_MIN * 10), max: Math.round(HEIGHT_MAX * 10) },
  { key: 'depths', min: Math.round(DEPTH_MIN * 10), max: Math.round(DEPTH_MAX * 10) },
  // Trapper opp til et dekke kan gå høyere enn hevede gulv (FLOOR_MAX).
  { key: 'floors', min: 1, max: Math.round(DECK_MAX * 10) },
  { key: 'finish', min: 1, max: 15 }, // gulv-/veggbelegg (finishes.js; 1 = fliser, 2–5 = butikkbelegg)
  { key: 'meta', min: 1, max: 31 }, // dørblad og bue (bit 4), trapperetning + motorretning, søylediameter
  { key: 'decks', min: Math.round(DECK_MIN * 10), max: Math.round(DECK_MAX * 10) },
  { key: 'corners', min: 1, max: 8 }, // skrå og avrundede hjørner (core/corners.js): tegnet er verdien
  { key: 'leds', min: 1, max: 8 },    // LED-strip farge på veggruter (core/leds.js)
  { key: 'panels', min: 1, max: 3 },  // lyspaneler i tak på åpne ruter (core/panels.js)
];

const clamp = (v, lo, hi, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fallback;
};

function layerToRows(level, { key, min, max }) {
  const values = level[key];
  if (!values.some((v) => v)) return undefined;
  const rows = [];
  for (let z = 0; z < level.h; z++) {
    let row = '';
    for (let x = 0; x < level.w; x++) {
      const v = values[z * level.w + x];
      row += (v ? Math.max(min, Math.min(max, v)) : 0).toString(16).padStart(2, '0');
    }
    rows.push(row);
  }
  return rows;
}

/** Sklier: [{ points: [[x, z], …], tube?, color? }] – hele ruter innenfor rommet. */
function slidesFromJSON(level, list) {
  if (list === undefined || list === null) return;
  const bad = () => new Error('Invalid slides in the room.');
  if (!Array.isArray(list)) throw bad();
  level.slides = list.slice(0, SLIDE.MAX_SLIDES).map((s) => {
    const raw = Array.isArray(s?.points) ? s.points.slice(0, SLIDE.MAX_POINTS) : [];
    const points = raw.map((p) => [Math.trunc(Number(p?.[0])), Math.trunc(Number(p?.[1]))]);
    if (points.length < 2 || points.some(([x, z]) => !inBounds(level, x, z))) throw bad();
    return { points, tube: !!s.tube, color: SLIDE_COLORS[s.color] ? s.color : DEFAULT_SLIDE_COLOR, ...(s.drop ? { drop: true } : {}) };
  });
}

function rowsToLayer(level, rows, { key, min, max }, version) {
  if (rows === undefined || rows === null) return;
  if (!Array.isArray(rows) || rows.length !== level.h) throw new Error('The zones have the wrong number of rows.');
  for (let z = 0; z < level.h; z++) {
    const row = String(rows[z]);
    if (row.length !== level.w * (version >= 3 ? 2 : 1)) throw new Error(`Zone row ${z + 1} has the wrong length.`);
    for (let x = 0; x < level.w; x++) {
      if (version >= 3) {
        const hex = row.slice(x * 2, x * 2 + 2);
        const v = Number.parseInt(hex, 16);
        if (!/^[0-9a-f]{2}$/i.test(hex) || (v !== 0 && (v < min || v > max))) throw new Error('Invalid zone in the room.');
        level[key][z * level.w + x] = v;
        continue;
      }
      const d = DIGITS.indexOf(row[x]);
      if (d < 0) throw new Error('Invalid zone in the room.');
      level[key][z * level.w + x] = d ? Math.min(max, min + d - 1) : 0;
    }
  }
}

export function levelToJSON(level) {
  const rows = [];
  for (let z = 0; z < level.h; z++) {
    let row = '';
    for (let x = 0; x < level.w; x++) {
      const i = z * level.w + x;
      row += String.fromCharCode(CHAR0 + (level.tiles[i] | (level.lights[i] << 3)));
    }
    rows.push(row);
  }
  const s = level.spawn;
  return {
    format: FORMAT,
    v: VERSION,
    name: level.name,
    theme: level.theme,
    w: level.w,
    h: level.h,
    height: level.height,
    waterDepth: level.waterDepth,
    fog: level.fog,
    bright: level.bright,
    sky: level.sky ?? undefined,
    tint: level.tint ?? undefined,
    seed: level.seed ?? undefined,
    spawn: [round3(s.x), round3(s.z), round3(s.a)],
    rows,
    ...Object.fromEntries(LAYERS.map((layer) => [layer.key, layerToRows(level, layer)])),
    slides: level.slides.length ? level.slides.map((s) => ({ points: s.points, ...(s.tube ? { tube: true } : {}), color: s.color, ...(s.drop ? { drop: true } : {}) })) : undefined,
    objects: level.objects?.length ? level.objects.map(({ id, x, z, rot, v, tip, lift, off }) => ({ id, x, z, rot, ...(v !== undefined ? { v } : {}), ...(tip ? { tip } : {}), ...(lift ? { lift } : {}), ...(off ? { off } : {}) })) : undefined,
    storeys: storeysToJSON(level, levelToJSON),
    spawnStorey: level.spawnStorey || undefined,
  };
}

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

/** Validerer og bygger et rom fra JSON. Kaster Error med brukervennlig melding ved feil. */
export function levelFromJSON(data) {
  if (!data || typeof data !== 'object') throw new Error('The file does not contain a room.');
  if (data.format !== FORMAT && !LEGACY_FORMATS.includes(data.format)) throw new Error('Unknown file format.');
  const version = data.v ?? 1;
  if (!Number.isInteger(version) || version < 1 || version > VERSION) throw new Error('Unsupported room version.');
  if (!Array.isArray(data.rows)) throw new Error('The room has no grid.');
  const w = clampSize(data.w);
  const h = clampSize(data.h);
  if (w !== data.w || h !== data.h) throw new Error('Invalid room size.');
  if (data.rows.length !== h) throw new Error('The grid has the wrong number of rows.');
  const theme = THEMES[data.theme] ? data.theme : DEFAULT_THEME;
  const level = createLevel({
    name: String(data.name ?? 'Untitled').slice(0, 80),
    theme,
    w,
    h,
    height: clampHeight(data.height),
    waterDepth: clampDepth(data.waterDepth),
  });
  level.fog = clamp(data.fog, 0, 3, 1);
  level.bright = clamp(data.bright, 0.2, 3, 1);
  level.sky = SKIES[data.sky] ? data.sky : null;
  level.tint = TINTS[data.tint] && data.tint !== 'theme' ? data.tint : null;
  if (Number.isInteger(data.seed) && data.seed >= 0) level.seed = data.seed;
  for (let z = 0; z < h; z++) {
    const row = String(data.rows[z]);
    if (row.length !== w) throw new Error(`Row ${z + 1} has the wrong length.`);
    for (let x = 0; x < w; x++) {
      const v = row.charCodeAt(x) - CHAR0;
      const tile = v & 7;
      const light = v >> 3;
      if (v < 0 || tile >= TILE_COUNT || light >= LIGHT_COUNT) throw new Error('Invalid cell in the room.');
      level.tiles[z * w + x] = tile;
      level.lights[z * w + x] = light;
    }
  }
  for (const layer of LAYERS) rowsToLayer(level, data[layer.key], layer, version);
  slidesFromJSON(level, data.slides);
  level.objects = objectsFromJSON(level, data.objects);
  storeysFromJSON(level, data.storeys, levelFromJSON, { format: FORMAT, v: version });
  spawnStoreyFromJSON(level, data.spawnStorey);
  const [sx, sz, sa] = Array.isArray(data.spawn) ? data.spawn : [];
  level.spawn = {
    x: clamp(sx, 0.5, w - 0.5, w / 2),
    z: clamp(sz, 0.5, h - 0.5, h / 2),
    a: clamp(sa, -100, 100, 0),
  };
  return level;
}

// --- Komprimering for delingslenker ---------------------------------------

async function pipeBytes(bytes, transform) {
  const stream = new Blob([bytes]).stream().pipeThrough(transform);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export function bytesToBase64Url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlToBytes(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function encodeLevel(level) {
  const json = new TextEncoder().encode(JSON.stringify(levelToJSON(level)));
  const packed = await pipeBytes(json, new CompressionStream('deflate-raw'));
  return bytesToBase64Url(packed);
}

export async function decodeLevel(code) {
  let text;
  try {
    const raw = await pipeBytes(base64UrlToBytes(code.trim()), new DecompressionStream('deflate-raw'));
    text = new TextDecoder().decode(raw);
  } catch {
    throw new Error('The link is broken or incomplete.');
  }
  return levelFromJSON(JSON.parse(text));
}
