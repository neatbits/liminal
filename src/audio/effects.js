// Lydeffekter fra gåmodus som ikke hører til selve lydbildet: vannsus i sklien, plask og
// dører. Funksjonene tar lydmotoren (AudioEngine) og bruker dens graf og én-skudd.
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

/** Dør som åpnes eller lukkes rett ved. */
export function door(engine, opening) {
  if (!engine.graph) return;
  engine._oneShot(doorBuffer(engine.ctx, opening), 0.5, 0.92 + Math.random() * 0.16);
}
