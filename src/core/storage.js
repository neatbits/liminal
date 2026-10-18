// Lokal lagring i nettleseren. Alt er pakket i try/catch: privat modus eller full
// lagring skal aldri knekke appen.
import { levelFromJSON, levelToJSON } from './serialize.js';

const ROOMS_KEY = 'liminal.rooms.v1';
const DRAFT_KEY = 'liminal.draft.v1';
const SETTINGS_KEY = 'liminal.settings.v1';

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
    store()?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Liste over lagrede rom, nyeste først: [{ id, name, theme, w, h, updated }] */
export function listRooms() {
  const rooms = readJSON(ROOMS_KEY, []);
  if (!Array.isArray(rooms)) return [];
  return rooms
    .filter((r) => r && r.id && r.data)
    .map(({ id, data, updated }) => ({ id, name: data.name, theme: data.theme, w: data.w, h: data.h, updated }))
    .sort((a, b) => b.updated - a.updated);
}

/** Lagrer rommet. Gir rommet en id første gang. Returnerer false ved feil. */
export function saveRoom(level) {
  if (!level.id) level.id = newId();
  const rooms = readJSON(ROOMS_KEY, []).filter((r) => r && r.id !== level.id);
  rooms.push({ id: level.id, updated: Date.now(), data: levelToJSON(level) });
  return writeJSON(ROOMS_KEY, rooms);
}

export function loadRoom(id) {
  const entry = readJSON(ROOMS_KEY, []).find((r) => r && r.id === id);
  if (!entry) return null;
  const level = levelFromJSON(entry.data);
  level.id = id;
  return level;
}

export function deleteRoom(id) {
  return writeJSON(
    ROOMS_KEY,
    readJSON(ROOMS_KEY, []).filter((r) => r && r.id !== id),
  );
}

export function saveDraft(level) {
  return writeJSON(DRAFT_KEY, { id: level.id, data: levelToJSON(level) });
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
  scary: false, // Scary mode i gåmodus (monster, flere strømbrudd)
  scaryMild: false, // … uten jumpscares: monsteret tar deg aldri
  grain: true,
  sound: true,
  volume: 0.8,
  sensitivity: 1,
  fov: 75,
  waterReflections: true,
  grid: true,
  rulers: true,
});

export function loadSettings() {
  const s = readJSON(SETTINGS_KEY, {});
  return { ...DEFAULT_SETTINGS, ...(s && typeof s === 'object' ? s : {}) };
}

export function saveSettings(settings) {
  return writeJSON(SETTINGS_KEY, settings);
}
