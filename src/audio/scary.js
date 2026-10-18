// Lyder for Scary mode: hjertebank når monsteret er nær, pust og knurring fra monsteret (fra
// den siden det står), og et brak av videostøy når det tar deg. Funksjonene tar lydmotoren.

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

/** Pust fra monsteret: pan = −1 (venstre) … 1 (høyre), gain etter avstanden. */
export function breath(engine, pan, gain) {
  const { ctx, graph } = engine;
  if (!ctx || !graph) return;
  const src = ctx.createBufferSource();
  src.buffer = cache(engine, 'breathSound', breathBuffer);
  src.playbackRate.value = 0.85 + Math.random() * 0.3;
  const g = ctx.createGain();
  g.gain.value = gain;
  const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (p) p.pan.value = Math.max(-1, Math.min(1, pan));
  src.connect(g);
  (p ? g.connect(p) : g).connect(graph.stepBus);
  src.start();
}

export function caught(engine) {
  if (!engine.ctx || !engine.graph) return;
  engine._oneShot(cache(engine, 'caughtSound', caughtBuffer), 1, 1);
}
