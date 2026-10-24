// Lokal lagring i nettleseren. Blokkert, full eller ødelagt lagring gir false/null;
// en ødelagt romliste skal aldri overskrives med en tom liste.
import { levelFromJSON, levelToJSON } from './serialize.js';
import { waveStrength } from './water.js';

const ROOMS_KEY = 'liminal.rooms.v1';
const DRAFT_KEY = 'liminal.draft.v1';
const SETTINGS_KEY = 'liminal.settings.v1';
const PROGRESS_KEY = 'liminal.progress.v1';

function store() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function readJSON(key, fallback) {
  try {
    const raw = store()?.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    const storage = store();
    if (!storage) return false;
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function readRooms() {
  const raw = store()?.getItem(ROOMS_KEY);
  const rooms = raw == null ? [] : JSON.parse(raw);
  if (!Array.isArray(rooms)) throw new Error('Invalid saved room list.');
  return rooms;
}

/** Liste over lagrede rom, nyeste først: [{ id, name, theme, w, h, updated }] */
export function listRooms() {
  try {
    return readRooms()
      .filter((r) => r && typeof r.id === 'string' && r.data && typeof r.data === 'object')
      .map(({ id, data, updated }) => ({ id, name: data.name, theme: data.theme, w: data.w, h: data.h, updated }))
      .sort((a, b) => b.updated - a.updated);
  } catch {
    return [];
  }
}

/** Lagrer rommet. Gir rommet en id første gang. Returnerer false ved feil. */
export function saveRoom(level) {
  try {
    const id = level.id || newId();
    const rooms = readRooms().filter((r) => r?.id !== id);
    rooms.push({ id, updated: Date.now(), data: levelToJSON(level) });
    if (!writeJSON(ROOMS_KEY, rooms)) return false;
    level.id = id;
    return true;
  } catch {
    return false;
  }
}

export function loadRoom(id) {
  try {
    const entry = readRooms().find((r) => r?.id === id);
    if (!entry) return null;
    const level = levelFromJSON(entry.data);
    level.id = id;
    return level;
  } catch {
    return null;
  }
}

export function deleteRoom(id) {
  try {
    return writeJSON(ROOMS_KEY, readRooms().filter((r) => r?.id !== id));
  } catch {
    return false;
  }
}

export function saveDraft(level) {
  try {
    return writeJSON(DRAFT_KEY, { id: level.id, data: levelToJSON(level) });
  } catch {
    return false;
  }
}

export function loadDraft() {
  const draft = readJSON(DRAFT_KEY, null);
  if (!draft?.data) return null;
  try {
    const level = levelFromJSON(draft.data);
    level.id = draft.id ?? null;
    return level;
  } catch {
    return null;
  }
}

export const DEFAULT_SETTINGS = Object.freeze({
  vhs: false,
  mood: 'liminal', // stemningen i gåmodus (gen/moods.js): normal … nightmare
  light: 'room', // lysfargen i visningen (core/tints.js): 'room' = rommets, ellers overstyrt
  levelSize: 'medium', // størrelsen på de uendelige nivåene (gen/sizes.js): small … huge
  grain: true,
  sound: true,
  music: false, // musikken (audio/music.js)
  volume: 0.8,
  sensitivity: 1,
  fov: 75,
  waterReflections: true,
  waterDetail: false, // detaljert vann: speiling i full oppløsning og flere småbølger (tyngre)
  waterWaves: 1, // bakgrunnsbølger: 0 = stille, 1 = temaets styrke, 2 = dobbelt; plaskringer er uavhengige
  fullscreenAspect: 'screen', // format i fullskjerm (view3d/display.js): screen, 16:9, 21:9, 16:10
  renderScale: 1, // oppløsning: 1, 0.75 eller 0.5
  effects: 'full', // 'reduced' = uten bloom og kantutjevning
  fpsCap: 0, // bildefrekvens: 0 = ubegrenset, 60 eller 30
  grid: true,
  rulers: true,
});

export function loadSettings() {
  const s = readJSON(SETTINGS_KEY, {});
  const out = { ...DEFAULT_SETTINGS, ...(s && typeof s === 'object' ? s : {}) };
  out.waterWaves = waveStrength(out.waterWaves);
  // Fra før stemningsskalaen: Scary mode → Nightmare, Scary · mild → Uncanny.
  if (s?.mood === undefined && s?.scary) out.mood = s.scaryMild ? 'uncanny' : 'nightmare';
  delete out.scary;
  delete out.scaryMild;
  return out;
}

export function saveSettings(settings) {
  return writeJSON(SETTINGS_KEY, settings);
}

/** Fremgangen i den uendelige utforskingen: dypeste nivå og kassetter funnet i alt. */
export function loadProgress() {
  const p = readJSON(PROGRESS_KEY, {});
  const count = (v) => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
  return { deepest: count(p?.deepest), tapes: count(p?.tapes) };
}

/** Returnerer false når den ikke ble lagret (fremgangen er ikke kritisk; spillet går videre). */
export function saveProgress({ deepest, tapes }) {
  return writeJSON(PROGRESS_KEY, { deepest, tapes });
}
