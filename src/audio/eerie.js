// Skumle lyder som kommer i rykk og napp: banking, knirk, fjerne skritt, hvisking, surr, spilledåse,
// metallstønn, en telefon langt unna, gurgling, drønn, heismusikk, høyttalerklokke, skoleklokke og
// pasientmonitor (de to siste i eerie-more.js). Alt er syntetisert (ingen lydfiler). Hvert tema har sin egen liste (`sound.eerie` i themes.js).

import { rand, make, decay } from './buffers.js';
import { bell, monitor } from './eerie-more.js';

/** Knirk: «stick-slip» – korte pulser med svevende tonehøyde (dør, gulvbord). */
function creak(ctx, up = true) {
  let phase = 0;
  let lp = 0;
  const len = rand(0.6, 1.1);
  return make(ctx, len, (t) => {
    const f = (up ? 180 + 260 * (t / len) : 440 - 240 * (t / len)) * (1 + 0.15 * Math.sin(t * 37));
    phase += f / ctx.sampleRate;
    const pulse = phase % 1 < 0.06 ? 1 : 0;
    lp += 0.25 * (pulse + (Math.random() - 0.5) * 0.3 - lp);
    return lp * Math.sin((Math.PI * t) / len);
  }, 0.6);
}

function knocks(ctx) {
  const n = 2 + Math.floor(Math.random() * 3);
  const gap = rand(0.22, 0.38);
  return make(ctx, n * gap + 0.4, (t) => {
    let v = 0;
    for (let k = 0; k < n; k++) {
      const u = t - k * gap;
      v += (Math.sin(2 * Math.PI * 95 * u) * 0.9 + (Math.random() - 0.5) * 0.5 * decay(u, 0.004)) * decay(u, 0.05);
    }
    return v;
  });
}

function footsteps(ctx) {
  const n = 4 + Math.floor(Math.random() * 4);
  const gap = rand(0.48, 0.62);
  let lp = 0;
  return make(ctx, n * gap + 0.3, (t) => {
    const k = Math.floor(t / gap);
    const u = t - k * gap;
    lp += 0.06 * (Math.random() - 0.5 - lp);
    return k < n ? lp * 8 * decay(u, 0.05) * (0.6 + 0.4 * ((k * 7) % 3)) / 1.4 : 0;
  }, 0.5);
}

/** Hvisking: støy gjennom et vandrende båndpassfilter, hakket opp i «stavelser». */
function whisper(ctx) {
  const len = rand(1.2, 2.2);
  let y1 = 0;
  let y2 = 0;
  const rate = rand(4, 6.5);
  return make(ctx, len, (t) => {
    const fc = 1400 + 900 * Math.sin(t * 5.3) * Math.sin(t * 2.1 + 1);
    const w = (2 * Math.PI * fc) / ctx.sampleRate;
    const r = 0.97;
    const y = (Math.random() - 0.5) * (1 - r) * 4 + 2 * r * Math.cos(w) * y1 - r * r * y2;
    y2 = y1;
    y1 = y;
    const syllable = Math.max(0, Math.sin(Math.PI * t * rate)) ** 2;
    return y * syllable * Math.sin((Math.PI * t) / len);
  }, 0.45);
}

/** Elektrisk surr som sveller og knitrer, som om noe trekker for mye strøm. */
function buzz(ctx) {
  const len = rand(1.8, 3);
  return make(ctx, len, (t) => {
    const saw = ((t * 100) % 1) * 2 - 1;
    const crackle = Math.random() < 0.002 ? (Math.random() - 0.5) * 6 : 0;
    return (saw * 0.6 + Math.sin(2 * Math.PI * 200 * t) * 0.3 + crackle) * Math.sin((Math.PI * t) / len) ** 2;
  }, 0.4);
}

/** Metallstønn: lav, svevende tone med metalliske overtoner (rør, bjelker). */
function groan(ctx) {
  const len = rand(2.2, 3.5);
  const base = rand(48, 70);
  return make(ctx, len, (t) => {
    const f = base * (1 + 0.06 * Math.sin(t * 2.3));
    const env = Math.sin((Math.PI * t) / len);
    return (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(2 * Math.PI * f * 4.7 * t) * decay(t, 0.8) + 0.2 * Math.sin(2 * Math.PI * f * 7.3 * t)) * env;
  }, 0.6);
}

/** En telefon som ringer to ganger et sted langt unna. */
function phone(ctx) {
  return make(ctx, 3.6, (t) => {
    const ring = t < 1 || (t > 2.4 && t < 3.4);
    const trill = Math.sin(2 * Math.PI * 20 * t) > 0 ? 1 : 0.4;
    return ring ? (Math.sin(2 * Math.PI * 440 * t) + Math.sin(2 * Math.PI * 480 * t)) * trill : 0;
  }, 0.25);
}

/** Gurgling: bobler som sprekker (sluk, rør under bassenget). */
function gurgle(ctx) {
  const pops = Array.from({ length: 6 + Math.floor(Math.random() * 6) }, () => [rand(0, 1.3), rand(250, 600)]);
  return make(ctx, 1.6, (t) => {
    let v = 0;
    for (const [at, f] of pops) {
      const u = t - at;
      if (u > 0 && u < 0.06) v += Math.sin(2 * Math.PI * f * (1 + u * 8) * u) * decay(u, 0.015);
    }
    return v;
  }, 0.5);
}

/** Dypt drønn – en dør som smeller langt unna, eller fyrkjelen som slår seg på. */
function boom(ctx) {
  let lp = 0;
  return make(ctx, 2.2, (t) => {
    lp += 0.004 * (Math.random() - 0.5 - lp);
    return (Math.sin(2 * Math.PI * 38 * t) * 0.8 + lp * 30) * decay(t, 0.45) * (1 - decay(t, 0.01));
  }, 0.7);
}

/** Spilledåse: noen klimprende toner i moll, litt ustemte og ujevne – som om fjæren går tom. */
function musicbox(ctx) {
  const scale = [0, 3, 5, 7, 10, 12, 15]; // moll-pentatonisk
  const notes = [];
  let at = 0;
  for (let k = 0; k < 7 + Math.floor(Math.random() * 5); k++) {
    notes.push([at, 880 * 2 ** (scale[Math.floor(Math.random() * scale.length)] / 12) * (1 + (Math.random() - 0.5) * 0.012)]);
    at += 0.28 + k * 0.03 + Math.random() * 0.08; // blir sakte tregere
  }
  return make(ctx, at + 1.2, (t) => {
    let v = 0;
    for (const [n, f] of notes) {
      const u = t - n;
      if (u > 0) v += (Math.sin(2 * Math.PI * f * u) + 0.3 * Math.sin(2 * Math.PI * f * 3.01 * u)) * decay(u, 0.35);
    }
    return v;
  }, 0.35);
}

/** Heismusikk langt borte: myke el-piano-akkorder (maj7) og en enkel melodi, med båndsvaj. */
function muzak(ctx) {
  const chords = [
    [0, 4, 7, 11],
    [-3, 0, 4, 7],
    [2, 5, 9, 12],
    [-5, -1, 2, 5],
  ];
  const beat = 0.5;
  const tune = [12, 11, 9, 7, 9, 11, 7, 4, 5, 4, 2, 4, 7, 5, 4, 2];
  const len = chords.length * 4 * beat + 1;
  const note = (semi, t, u, tau) => (u < 0 ? 0 : Math.sin(2 * Math.PI * 261.6 * 2 ** (semi / 12) * t) * decay(u, tau));
  return make(ctx, len, (t) => {
    const w = t + 0.004 * Math.sin(t * 2.1); // båndsvaj: tonehøyden flyter litt
    let v = 0;
    const bar = Math.min(chords.length - 1, Math.floor(t / (4 * beat)));
    const u = t - bar * 4 * beat;
    for (const c of chords[bar]) v += note(c - 12, w, u, 1.2) * 0.25;
    const k = Math.min(tune.length - 1, Math.floor(t / beat));
    v += note(tune[k], w, t - k * beat, 0.35) * 0.35;
    return v * Math.min(1, t * 3) * Math.min(1, (len - t) * 2);
  }, 0.35);
}

/** Høyttalerklokke (ding-dong-ding) før en kunngjøring som aldri kommer. */
function chime(ctx) {
  const tones = [[0, 784], [0.55, 659], [1.1, 523]];
  return make(ctx, 3.2, (t) => {
    let v = 0;
    for (const [at, f] of tones) {
      const u = t - at;
      if (u > 0) v += (Math.sin(2 * Math.PI * f * u) + 0.25 * Math.sin(2 * Math.PI * f * 2.76 * u) * decay(u, 0.2)) * decay(u, 0.9);
    }
    return v;
  }, 0.4);
}

const MAKERS = { creak, knocks, footsteps, whisper, buzz, groan, phone, gurgle, boom, musicbox, muzak, chime, bell, monitor };
export const EERIE_SOUNDS = Object.keys(MAKERS);

/** Lager en ny variant av lyden (hver gang litt forskjellig). */
export function eerieBuffer(ctx, name) {
  return (MAKERS[name] ?? knocks)(ctx);
}

/**
 * Spiller en lyd et sted rundt lytteren: tilfeldig side (panorering) og avstand (dempet og
 * mørkere jo lenger unna), sendt til `destination` (romklangen).
 */
export function playAround(ctx, buf, destination, gain) {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const far = Math.random();
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 5000 - far * 4200;
  const g = ctx.createGain();
  g.gain.value = gain * (1 - far * 0.6);
  const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (pan) pan.pan.value = rand(-0.9, 0.9);
  src.connect(lp).connect(g);
  (pan ? g.connect(pan) : g).connect(destination);
  src.start();
}
