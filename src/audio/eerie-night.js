// Lydene som bare hører hjemme i Nightmare (stemningens sounds, gen/moods.js): et skrik langt
// unna, noe tungt som slepes, tunge skritt som kommer nærmere, klor mot en vegg og knurring – og
// brølet når monsteret begynner å jakte (roarAt i audio/scary.js). Alt er syntetisert.
import { rand, make, decay } from './buffers.js';

const TAU = 2 * Math.PI;

/** Topolet resonator (formant) med omtrent samme toppforsterkning uansett frekvens. */
function resonator(sr, r) {
  let y1 = 0;
  let y2 = 0;
  return (x, fc) => {
    const w = (TAU * fc) / sr;
    const y = x * (1 - r) * 2 * Math.sin(w) + 2 * r * Math.cos(w) * y1 - r * r * y2;
    y2 = y1;
    y1 = y;
    return y;
  };
}

/** Langsom, ujevn vingling (−1 … 1) – så tonehøyden aldri ligger helt stille. */
function wobble() {
  const p = [rand(0, 6), rand(0, 6), rand(0, 6)];
  return (t) => Math.sin(t * 7.1 + p[0]) * 0.5 + Math.sin(t * 13.3 + p[1]) * 0.3 + Math.sin(t * 3.7 + p[2]) * 0.2;
}

/** Brølet: en dyp, ru stemme som stiger og synker, med undertone og rasp. */
export function roar(ctx, len = rand(2.4, 3.4)) {
  const sr = ctx.sampleRate;
  const base = rand(46, 60);
  const wob = wobble();
  const f1 = resonator(sr, 0.985);
  const f2 = resonator(sr, 0.975);
  const f3 = resonator(sr, 0.95);
  let phase = 0;
  return make(ctx, len, (t) => {
    const u = t / len;
    const open = Math.sin(Math.PI * Math.min(1, u * 1.25)); // stiger fort, synker sakte
    phase += (base * (1 + 0.7 * open) * (1 + 0.05 * wob(t))) / sr;
    const saw = 2 * (phase % 1) - 1;
    const sub = phase % 2 < 1 ? 1 : 0.6; // annenhver periode svakere: en undertone som skurrer
    const rasp = 1 + 0.5 * Math.sin(TAU * 31 * t + 3 * wob(t));
    const src = saw * sub * rasp * 0.8 + (Math.random() * 2 - 1) * 0.5;
    const v = f1(src, 300 + 350 * open) + f2(src, 800 + 300 * open) * 0.6 + f3(src, 2300) * 0.25;
    const env = Math.min(1, t / 0.12) * (u < 0.6 ? 1 : ((1 - u) / 0.4) ** 1.5);
    return (Math.tanh(v * 3) + Math.sin(TAU * base * 0.5 * t) * 0.25) * env;
  }, 0.9);
}

/** Et skrik langt borte: en stemme som slår opp, holder og knekker nedover. */
function scream(ctx) {
  const len = rand(1.3, 2.2);
  const sr = ctx.sampleRate;
  const top = rand(620, 900);
  const wob = wobble();
  const f1 = resonator(sr, 0.97);
  const f2 = resonator(sr, 0.97);
  const f3 = resonator(sr, 0.96);
  let phase = 0;
  return make(ctx, len, (t) => {
    const u = t / len;
    const f0 = top * (0.55 + 0.45 * Math.min(1, u * 4)) * (1 - 0.18 * u * u);
    phase += (f0 * (1 + 0.03 * Math.sin(TAU * 6.2 * t) + 0.02 * wob(t))) / sr;
    const src = 2 * (phase % 1) - 1 + (Math.random() * 2 - 1) * 0.25;
    const v = f1(src, 850) + f2(src, 1250) * 0.8 + f3(src, 2900) * 0.4;
    return Math.tanh(v * 2) * Math.min(1, t / 0.06) * (u < 0.65 ? 1 : (1 - u) / 0.35);
  }, 0.7);
}

/** Noe tungt som slepes over gulvet, i to–tre rykk. */
function drag(ctx) {
  const len = rand(2.2, 3.4);
  const pulls = 2 + Math.floor(Math.random() * 2);
  const sr = ctx.sampleRate;
  const body = resonator(sr, 0.99);
  const grit = resonator(sr, 0.9);
  let phase = 0;
  let lp = 0;
  return make(ctx, len, (t) => {
    const pull = Math.max(0, Math.sin(Math.PI * (((t / len) * pulls) % 1))) ** 0.8;
    phase += (14 + 20 * pull) / sr;
    const stick = phase % 1 < 0.15 ? 1 : 0.3; // hakker seg fast og slipper
    const n = Math.random() * 2 - 1;
    lp += 0.05 * (n - lp);
    return (body(n, 140) * 0.8 + grit(n, 900) * 0.5 * stick + lp * 2) * pull * stick;
  }, 0.6);
}

/** Tunge, langsomme skritt som kommer nærmere – og stopper. */
function stalk(ctx) {
  const n = 5 + Math.floor(Math.random() * 3);
  const gap = rand(0.8, 1);
  let lp = 0;
  return make(ctx, n * gap + 0.6, (t) => {
    const k = Math.min(n - 1, Math.floor(t / gap));
    const u = t - k * gap;
    lp += 0.03 * (Math.random() * 2 - 1 - lp);
    const near = 0.2 + 0.8 * (k / (n - 1)) ** 1.5;
    return (Math.sin(TAU * (52 + 40 * decay(u, 0.02)) * u) * decay(u, 0.11) + lp * 5 * decay(u, 0.05)) * near;
  }, 0.8);
}

/** Klør som drar nedover en vegg, noen strøk etter hverandre. */
function scratch(ctx) {
  const n = 3 + Math.floor(Math.random() * 3);
  const gap = rand(0.4, 0.6);
  const sr = ctx.sampleRate;
  const band = resonator(sr, 0.93);
  let phase = 0;
  return make(ctx, n * gap + 0.2, (t) => {
    const k = Math.min(n - 1, Math.floor(t / gap));
    const u = (t - k * gap) / (gap * 0.65);
    if (u > 1) return 0;
    phase += (70 + 50 * Math.sin(t * 9)) / sr;
    const stick = phase % 1 < 0.3 ? 1 : 0.25;
    const v = band(Math.random() * 2 - 1, 3800 - 1400 * u + 300 * (k % 2)) + Math.sin(TAU * (2300 - 500 * u) * t) * 0.12;
    return v * stick * Math.sin(Math.PI * u) ** 0.6;
  }, 0.5);
}

/** Knurring: et kort, lavt brøl et sted i mørket. */
const growl = (ctx) => roar(ctx, rand(1.2, 1.8));

export const NIGHT_SOUNDS = { scream, drag, stalk, scratch, growl };
