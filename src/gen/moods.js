// Stemningen i gåmodus – én skala som styrer alt det liminale: Normal → Abandoned → Liminal →
// Uncanny → Nightmare. Hvert trinn sier hvor tett tåka er, hvor mange lys som er ødelagte eller
// blinker, hvor feil rommet er («Make it wrong»), om rommet oppfører seg umulig (avvik), hvor ofte
// strømmen går, hvor ofte de skumle lydene kommer og om noe går rundt i mørket. Ren logikk.
import { LIGHT, cloneLevel } from '../core/level.js';
import { makeWrong } from './wrong.js';

/**
 * fog, exposure: ganges med temaets verdier. broken, flicker: andel av de tente lysene som er
 * ødelagte / blinker. wrong: «Make it wrong»-styrke for egne rom (home) og genererte nivåer (gen).
 * anomalies: sjanse for uendelige ganger (0/1), dør tilbake, korridornivå og samme rom igjen.
 * blackout: tider for strømbrudd (null = aldri). eerie: ganges med tiden mellom skumle lyder
 * (lavere = oftere). monster: null, 'lurk' (viser seg, tar deg aldri) eller 'hunt'.
 */
export const MOODS = {
  normal: {
    label: 'Normal',
    hint: 'Just an empty building. Lights on, nothing strange.',
    fog: 0.8, exposure: 1.05, broken: 0, flicker: 0,
    wrong: { home: null, gen: null },
    anomalies: { loops: 0, backDoor: 0, corridor: 0, again: 0 },
    blackout: null, eerie: 4, monster: null,
  },
  abandoned: {
    label: 'Abandoned',
    hint: 'Nobody has been here for years. Many lights are dead.',
    fog: 1.1, exposure: 0.95, broken: 0.2, flicker: 0.05,
    wrong: { home: null, gen: null },
    anomalies: { loops: 0, backDoor: 0, corridor: 0.1, again: 0 },
    blackout: { first: [150, 300], every: [240, 480], dark: [5, 8] }, eerie: 1.6, monster: null,
  },
  liminal: {
    label: 'Liminal',
    hint: 'Something is wrong here, but you cannot say what.',
    fog: 1, exposure: 1, broken: 0.03, flicker: 0.03,
    wrong: { home: null, gen: 'subtle' },
    anomalies: { loops: 1, backDoor: 0.25, corridor: 0.2, again: 0.15 },
    blackout: { first: [70, 140], every: [120, 260], dark: [6, 11] }, eerie: 1, monster: null,
  },
  uncanny: {
    label: 'Uncanny',
    hint: 'The rooms are wrong, the lights fail – and something stands at the far end. It never comes closer.',
    fog: 1.4, exposure: 0.9, broken: 0.08, flicker: 0.08,
    wrong: { home: 'subtle', gen: 'wrong' },
    anomalies: { loops: 1, backDoor: 0.35, corridor: 0.25, again: 0.25 },
    blackout: { first: [40, 80], every: [70, 140], dark: [9, 14] }, eerie: 0.6, monster: 'lurk',
  },
  nightmare: {
    label: 'Nightmare',
    hint: 'Dark rooms, constant blackouts – and something hunts you in the dark. When the lights go out, run.',
    fog: 1.9, exposure: 0.8, broken: 0.15, flicker: 0.12,
    wrong: { home: 'wrong', gen: 'very' },
    anomalies: { loops: 1, backDoor: 0.35, corridor: 0.25, again: 0.25 },
    blackout: { first: [20, 40], every: [45, 90], dark: [12, 18] }, eerie: 0.35, monster: 'hunt',
  },
};

export const MOOD_IDS = Object.keys(MOODS);
export const DEFAULT_MOOD = 'liminal';

export function getMood(id) {
  return MOODS[id] ?? MOODS[DEFAULT_MOOD];
}

/** Neste trinn på skalaen (etter Nightmare kommer Normal igjen). */
export function nextMood(id) {
  return MOOD_IDS[(MOOD_IDS.indexOf(id) + 1) % MOOD_IDS.length] ?? DEFAULT_MOOD;
}

/** Bryter (ødelegger eller får til å blinke) en andel av de tente lysene. Returnerer antallet. */
export function decayLights(level, broken, flicker, rand) {
  let n = 0;
  for (let i = 0; i < level.lights.length; i++) {
    if (level.lights[i] !== LIGHT.ON) continue;
    const r = rand();
    if (r < broken) level.lights[i] = LIGHT.BROKEN;
    else if (r < broken + flicker) level.lights[i] = LIGHT.FLICKER;
    else continue;
    n++;
  }
  return n;
}

/**
 * Rommet slik stemningen gjør det: en kopi med ødelagte lys og «Make it wrong», eller null når
 * stemningen ikke endrer noe. home = rommet fra editoren (endres mindre enn genererte nivåer).
 */
export function moodLevel(level, moodId, rand, { home = false } = {}) {
  const mood = getMood(moodId);
  const wrong = home ? mood.wrong.home : mood.wrong.gen;
  // Lys brytes bare i egne rom når stemningen er sterkere enn Liminal (ellers er rommet ditt).
  const lights = !home || mood.wrong.home || moodId === 'abandoned';
  if (!wrong && !(lights && (mood.broken || mood.flicker))) return null;
  const out = cloneLevel(level);
  out.objects = [...(level.objects ?? [])];
  if (lights) decayLights(out, mood.broken, mood.flicker, rand);
  if (wrong) makeWrong(out, wrong, rand);
  return out;
}
