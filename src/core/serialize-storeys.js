// Etasjene over etasje 0 i romformatet (v4): `storeys: [{ height, waterDepth, rows, …lag, slides,
// objects }]`. Hver etasje lagres som et rom uten byggets felles felt; serialize.js gir funksjonene
// for ett rom inn som argumenter (ingen sirkulær import).
import { MAX_STOREYS, SHARED, storeyCount } from './storeys.js';

/** Felt som hører til rommet/bygget og derfor ikke lagres per etasje. */
const ROOM_KEYS = ['format', 'v', 'name', 'theme', 'w', 'h', 'storeys', 'spawnStorey', ...SHARED];

/** @param toJSON levelToJSON for ett rom */
export function storeysToJSON(room, toJSON) {
  if (!room.storeys?.length) return undefined;
  return room.storeys.map((s) => {
    const json = toJSON({ ...s, storeys: undefined });
    for (const key of ROOM_KEYS) delete json[key];
    return json;
  });
}

/**
 * Leser etasjene inn i `room` (etter at rommet selv er lest). Kaster Error ved feil.
 * @param fromJSON levelFromJSON for ett rom; base: { format, v } fra fila
 */
export function storeysFromJSON(room, list, fromJSON, base) {
  if (list === undefined || list === null) return;
  if (!Array.isArray(list) || list.length > MAX_STOREYS - 1) throw new Error('Invalid floors in the room.');
  room.storeys = list.map((data) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid floors in the room.');
    const s = fromJSON({ ...data, ...base, name: room.name, theme: room.theme, w: room.w, h: room.h, storeys: undefined });
    for (const key of SHARED) s[key] = room[key];
    return s;
  });
}

/** Etasjen man starter i (heltall innenfor bygget), ellers ingen. */
export function spawnStoreyFromJSON(room, k) {
  if (Number.isInteger(k) && k > 0 && k < storeyCount(room)) room.spawnStorey = k;
}
