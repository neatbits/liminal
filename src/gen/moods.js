// Stemningen i gåmodus – én skala som styrer alt det liminale: Normal → Abandoned → Liminal →
// Uncanny → Nightmare. Hvert trinn sier hvor tett tåka er, hvor mange lys som er ødelagte eller
// blinker, hvor feil rommet er («Make it wrong»), om rommet oppfører seg umulig (avvik), hvor ofte
// strømmen går, hvor ofte de skumle lydene kommer og om noe går rundt i mørket. Ren logikk.
import { LIGHT, cloneLevel } from '../core/level.js';
import { makeWrong } from './wrong.js';
import { basins } from './variety.js';
import { fillZone } from '../core/zones.js';
import { getTheme } from '../core/themes.js';

/**
 * fog, exposure: ganges med temaets verdier. broken, flicker: andel av de tente lysene som er
 * ødelagte / blinker; patches: de døde lysene samles i områder (hele deler av bygget er mørke). wrong: «Make it wrong»-styrke for egne rom (home) og genererte nivåer (gen).
 * anomalies: sjanse for uendelige ganger (0/1), dør tilbake, korridornivå og samme rom igjen.
 * blackout: tider for strømbrudd (null = aldri). eerie: ganges med tiden mellom skumle lyder
 * (lavere = oftere). deep: sjanse for at et basseng i et generert nivå er mørkt og dypt. monster: null, 'lurk' (viser seg, tar deg aldri) eller 'hunt'.
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
    fog: 1.1, exposure: 0.95, broken: 0.45, flicker: 0.08, patches: true,
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
    blackout: { first: [40, 80], every: [70, 140], dark: [9, 14] }, eerie: 0.6, monster: 'lurk', deep: 0.15,
  },
  nightmare: {
    label: 'Nightmare',
    hint: 'Dark rooms, constant blackouts – and something hunts you in the dark. When the lights go out, run.',
    fog: 1.9, exposure: 0.8, broken: 0.15, flicker: 0.12,
    wrong: { home: 'wrong', gen: 'very' },
    anomalies: { loops: 1, backDoor: 0.35, corridor: 0.25, again: 0.25 },
    blackout: { first: [20, 40], every: [45, 90], dark: [12, 18] }, eerie: 0.35, monster: 'hunt', deep: 0.3,
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

const PATCH = 8; // størrelsen på områdene med døde lys (m)

/**
 * Glatt støy 0–1 over rommet (verdier i et grovt rutenett, interpolert), snitt omtrent 0,5:
 * hvor «dødt» området er.
 */
function patchNoise(level, rand) {
  const gw = Math.ceil(level.w / PATCH) + 2;
  const gh = Math.ceil(level.h / PATCH) + 2;
  const grid = Array.from({ length: gw * gh }, () => rand());
  return (x, z) => {
    const fx = x / PATCH;
    const fz = z / PATCH;
    const [ix, iz] = [Math.floor(fx), Math.floor(fz)];
    const [tx, tz] = [fx - ix, fz - iz].map((t) => t * t * (3 - 2 * t));
    const v = (a, b) => grid[(iz + b) * gw + ix + a];
    return (v(0, 0) * (1 - tx) + v(1, 0) * tx) * (1 - tz) + (v(0, 1) * (1 - tx) + v(1, 1) * tx) * tz;
  };
}

/**
 * Bryter (ødelegger eller får til å blinke) en andel av de tente lysene. Med patches samles de døde
 * lysene i områder (samme andel i snitt). Returnerer antallet.
 */
export function decayLights(level, broken, flicker, rand, patches = false) {
  const noise = patches ? patchNoise(level, rand) : null;
  let n = 0;
  for (let i = 0; i < level.lights.length; i++) {
    if (level.lights[i] !== LIGHT.ON) continue;
    // Støyen strekkes (interpolasjonen samler verdiene om midten), så områdene blir tydelige.
    const dark = noise ? Math.max(0, Math.min(1, (noise(i % level.w, Math.floor(i / level.w)) - 0.5) * 1.8 + 0.5)) : 0.5;
    const dead = Math.min(0.95, broken * 2 * dark);
    const r = rand();
    if (r < dead) level.lights[i] = LIGHT.BROKEN;
    else if (r < dead + flicker) level.lights[i] = LIGHT.FLICKER;
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
  const deep = home || getTheme(level.theme).pit ? 0 : mood.deep ?? 0; // ikke ballbinger
  if (!wrong && !deep && !(lights && (mood.broken || mood.flicker))) return null;
  const out = cloneLevel(level);
  out.objects = [...(level.objects ?? [])];
  if (lights) decayLights(out, mood.broken, mood.flicker, rand, mood.patches);
  // Noen bassenger blir dype (2,4–3 m) – man ser ikke bunnen.
  if (deep) for (const cells of basins(out)) if (rand() < deep) fillZone(out, 'depth', cells, 2.4 + Math.round(rand() * 6) / 10);
  if (wrong) makeWrong(out, wrong, rand);
  return out;
}
