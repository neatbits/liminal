// Lydeffekter fra gåmodus som ikke hører til selve lydbildet: vannsus i sklien, plask,
// dører og kameralukker. Funksjonene tar lydmotoren (AudioEngine) og bruker dens graf og én-skudd.
import { splashBuffer, ballsBuffer } from './synth.js';

/** Vannsus i sklien: 0 = stille, ellers farten (m/s) – lysere og sterkere jo fortere. */
export function slideRush(engine, speed) {
  const { ctx, graph } = engine;
  if (!graph) return;
  let rush = graph.rush;
  if (!rush) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    filter.connect(gain).connect(graph.stepBus);
    const src = engine._loop(engine.white, filter);
    graph.nodes.push(filter, gain, src);
    rush = graph.rush = { filter, gain };
  }
  const now = ctx.currentTime;
  rush.gain.gain.setTargetAtTime(Math.min(0.45, speed * 0.05), now, 0.12);
  rush.filter.frequency.setTargetAtTime(300 + speed * 160, now, 0.12);
}

/** Landing etter en sklietur: vannplask, eller baller i en ballbinge (sound.splash: 'balls'). */
export function splash(engine, speed) {
  if (!engine.ctx || !engine.graph) return;
  const balls = engine.graph.sound.splash === 'balls';
  const key = balls ? 'ballsSound' : 'splashSound';
  engine[key] ??= balls ? ballsBuffer(engine.ctx) : splashBuffer(engine.ctx);
  engine._oneShot(engine[key], Math.min(1.3, 0.5 + speed * 0.1), 0.9 + Math.random() * 0.15);
}

const decay = (t, tau) => (t < 0 ? 0 : Math.exp(-t / tau));

/**
 * Dørlyd: klikk i smekklåsen, et mykt luftsus mens bladet svinger og – når døren lukkes –
 * et dempet dunk i karmen før låsen klikker igjen. Ingen knirk (det hørtes rart ut).
 */
export function doorBuffer(ctx, opening) {
  const rate = ctx.sampleRate;
  const len = opening ? 0.75 : 0.65;
  const b = ctx.createBuffer(1, Math.floor(rate * len), rate);
  const d = b.getChannelData(0);
  const hit = opening ? -1 : 0.42; // når bladet treffer karmen
  const clicks = opening ? [0, 0.07] : [hit + 0.03];
  const swish = opening ? [0.12, 0.55] : [0, 0.42];
  let air = 0;
  let wood = 0;
  let metal = 0;
  let prev = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / rate;
    const n = Math.random() * 2 - 1;
    air += 0.03 * (n - air);
    wood += 0.12 * (n - wood);
    // Høypass på støyen gir et kort, lyst metallklikk.
    metal = n - prev;
    prev = n;
    const u = (t - swish[0]) / (swish[1] - swish[0]);
    let v = u > 0 && u < 1 ? air * Math.sin(Math.PI * u) ** 2 * 1.2 : 0;
    for (const c of clicks) v += metal * decay(t - c, 0.004) * (t >= c ? 0.35 : 0);
    if (hit > 0 && t >= hit) v += (Math.sin(2 * Math.PI * 85 * (t - hit)) * 0.9 + wood * 2) * decay(t - hit, 0.05);
    d[i] = v;
  }
  let max = 0;
  for (const x of d) max = Math.max(max, Math.abs(x));
  if (max > 0) for (let i = 0; i < d.length; i++) d[i] *= 0.6 / max;
  return b;
}

/** Sus fra TV-er med sne-støy: 0 = stille, 1 = rett ved skjermen. */
export function staticHiss(engine, level) {
  const { ctx, graph } = engine;
  if (!graph) return;
  let hiss = graph.hiss;
  if (!hiss && level < 0.01) return;
  if (!hiss) {
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1800;
    const peak = ctx.createBiquadFilter();
    peak.type = 'peaking';
    peak.frequency.value = 4200;
    peak.gain.value = 6;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    hp.connect(peak).connect(gain).connect(graph.stepBus);
    const src = engine._loop(engine.white, hp);
    graph.nodes.push(hp, peak, gain, src);
    hiss = graph.hiss = { gain };
  }
  hiss.gain.gain.setTargetAtTime(level * 0.12, ctx.currentTime, 0.25);
}

/** Strømbrudd: et dunk og en synkende hyletone (lysrør som slukner); opp igjen: klikk og stigende surr. */
export function powerBuffer(ctx, down) {
  const rate = ctx.sampleRate;
  const len = down ? 1.6 : 1.1;
  const b = ctx.createBuffer(1, Math.floor(rate * len), rate);
  const d = b.getChannelData(0);
  let phase = 0;
  let lp = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / rate;
    const u = t / len;
    const f = down ? 120 * (1 - u * 0.8) : 40 + 80 * Math.min(1, u * 1.5);
    phase += (2 * Math.PI * f) / rate;
    lp += 0.02 * (Math.random() * 2 - 1 - lp);
    const thunk = (Math.sin(2 * Math.PI * 55 * t) * 0.9 + lp * 6) * decay(t, 0.08);
    const whine = (Math.sin(phase) + 0.4 * Math.sin(phase * 3)) * (down ? (1 - u) ** 2 : Math.min(1, u * 2) * (1 - u)) * 0.5;
    d[i] = (thunk + whine) * 0.5;
  }
  return b;
}

export function power(engine, down) {
  if (!engine.ctx || !engine.graph) return;
  const key = down ? 'powerDownSound' : 'powerUpSound';
  engine[key] ??= powerBuffer(engine.ctx, down);
  engine._oneShot(engine[key], 0.7, 1);
}

/** En VHS-kassett plukkes opp: et hult plastklakk og et lite rasl. */
export function pickupBuffer(ctx) {
  const rate = ctx.sampleRate;
  const b = ctx.createBuffer(1, Math.floor(rate * 0.3), rate);
  const d = b.getChannelData(0);
  let lp = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / rate;
    lp += 0.3 * (Math.random() * 2 - 1 - lp);
    const clack = Math.sin(2 * Math.PI * 420 * t) * decay(t, 0.015) + Math.sin(2 * Math.PI * 610 * (t - 0.06)) * decay(t - 0.06, 0.012) * (t > 0.06 ? 1 : 0);
    d[i] = (clack + lp * decay(t - 0.02, 0.05) * 0.6) * 0.6;
  }
  return b;
}

export function pickup(engine) {
  if (!engine.ctx || !engine.graph) return;
  engine.pickupSound ??= pickupBuffer(engine.ctx);
  engine._oneShot(engine.pickupSound, 0.8, 0.95 + Math.random() * 0.1);
}

/** Kameralukker: to korte, mekaniske klikk (speilet slår opp og ned). */
export function shutterBuffer(ctx) {
  const rate = ctx.sampleRate;
  const b = ctx.createBuffer(1, Math.floor(rate * 0.18), rate);
  const d = b.getChannelData(0);
  let prev = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / rate;
    const n = Math.random() * 2 - 1;
    const click = n - prev; // høypass: lyst og kort
    prev = n;
    d[i] = click * (decay(t, 0.006) + 0.7 * decay(t - 0.075, 0.009) * (t > 0.075 ? 1 : 0)) * 0.5 + Math.sin(2 * Math.PI * 1800 * t) * decay(t, 0.004) * 0.3;
  }
  return b;
}

/** Lukkerlyd når man tar et bilde. */
export function shutter(engine) {
  if (!engine.ctx || !engine.graph) return;
  engine.shutterSound ??= shutterBuffer(engine.ctx);
  engine._oneShot(engine.shutterSound, 0.6, 1);
}

/** Dør som åpnes eller lukkes rett ved. */
export function door(engine, opening) {
  if (!engine.graph) return;
  engine._oneShot(doorBuffer(engine.ctx, opening), 0.5, 0.92 + Math.random() * 0.16);
}
