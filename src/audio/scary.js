// Lyder for Scary mode: hjertebank når monsteret er nær, pust og knurring fra monsteret (fra
// den siden det står), brølet når jakten begynner (eerie-night.js), og et brak av videostøy når det
// tar deg. Funksjonene tar lydmotoren.
import { nightBuffer, warmNight } from './eerie-night.js';

const decay = (t, tau) => (t < 0 ? 0 : Math.exp(-t / tau));

function make(ctx, seconds, fn) {
  const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = fn(i / ctx.sampleRate);
  let max = 0;
  for (const v of d) max = Math.max(max, Math.abs(v));
  if (max > 0) for (let i = 0; i < d.length; i++) d[i] *= 0.8 / max;
  return b;
}

/** To dype slag – «dunk-dunk». */
export function heartbeatBuffer(ctx) {
  const beat = (t) => Math.sin(2 * Math.PI * (48 + 30 * decay(t, 0.02)) * t) * decay(t, 0.07);
  return make(ctx, 0.5, (t) => beat(t) + 0.7 * beat(t - 0.17));
}

/** Pust/knurring: lav, ru støy med en svak tone som stiger og synker. */
export function breathBuffer(ctx) {
  let lp = 0;
  const len = 1.6;
  return make(ctx, len, (t) => {
    lp += 0.04 * (Math.random() * 2 - 1 - lp);
    const env = Math.sin((Math.PI * t) / len) ** 2;
    return (lp * 4 + Math.sin(2 * Math.PI * (70 + 15 * Math.sin(t * 3)) * t) * 0.4) * env;
  });
}

/** Tatt: et kort brak av videostøy og et dypt drønn. */
export function caughtBuffer(ctx) {
  return make(ctx, 1.4, (t) => (Math.random() * 2 - 1) * decay(t, 0.35) * 0.8 + Math.sin(2 * Math.PI * 36 * t) * decay(t, 0.6));
}

const cache = (engine, key, make) => (engine[key] ??= make(engine.ctx));

export function heartbeat(engine, gain) {
  if (!engine.ctx || !engine.graph) return;
  engine._oneShot(cache(engine, 'heartSound', heartbeatBuffer), gain, 1);
}

/** En lyd fra monsteret: pan = −1 (venstre) … 1 (høyre), lowpass (Hz, 0 = av) demper med avstanden. */
function playFrom(engine, buffer, pan, gain, { rate = 1, lowpass = 0 } = {}) {
  const { ctx, graph } = engine;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = rate;
  let out = src;
  if (lowpass) {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = lowpass;
    out = out.connect(lp);
  }
  const g = ctx.createGain();
  g.gain.value = gain;
  out = out.connect(g);
  const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (p) p.pan.value = Math.max(-1, Math.min(1, pan));
  (p ? out.connect(p) : out).connect(graph.stepBus);
  src.start();
}

/** Pust fra monsteret: fra den siden det står, gain etter avstanden. */
export function breath(engine, pan, gain) {
  if (!engine.ctx || !engine.graph) return;
  playFrom(engine, cache(engine, 'breathSound', breathBuffer), pan, gain, { rate: 0.85 + Math.random() * 0.3 });
}

/** Brølet når jakten begynner (Nightmare): far 0 … 1 gjør det svakere og mørkere. Ny variant hver gang. */
export function roarAt(engine, pan, gain, far) {
  if (!engine.ctx || !engine.graph) return;
  playFrom(engine, nightBuffer(engine.ctx, 'roar'), pan, gain, { rate: 0.92 + Math.random() * 0.16, lowpass: 6000 - far * 4500 });
}

/**
 * Lager lydene på forhånd, hver for seg litt senere, så ingen av dem regnes ut i det monsteret dukker
 * opp: hjertebank, pust og brak – og med night (Nightmare) brølet og Nightmare-lydene i bakgrunnen.
 */
export function warmScary(engine, night) {
  if (!engine.ctx || !engine.graph) return;
  if (night) warmNight(engine.ctx);
  if (engine.scaryWarm) return;
  engine.scaryWarm = true;
  for (const [key, make] of [['heartSound', heartbeatBuffer], ['breathSound', breathBuffer], ['caughtSound', caughtBuffer]]) {
    setTimeout(() => engine.ctx && cache(engine, key, make), 0);
  }
}

export function caught(engine) {
  if (!engine.ctx || !engine.graph) return;
  engine._oneShot(cache(engine, 'caughtSound', caughtBuffer), 1, 1);
}
