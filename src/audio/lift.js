// Heislyder (view3d/lifts.js): knappeklikk, en gammel pling, skyvedører som ruller, og under turen en lav motordur
// med knirk og små dunk i sjakten. Funksjonene tar lydmotoren (AudioEngine) og bruker dens graf og én-skudd, så de
// tier når lyden er av, på pause eller utenfor gåmodus.
const decay = (t, tau) => (t < 0 ? 0 : Math.exp(-t / tau));

function buffer(ctx, seconds, fill) {
  const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = b.getChannelData(0);
  fill(d, ctx.sampleRate);
  let max = 0;
  for (const x of d) max = Math.max(max, Math.abs(x));
  if (max > 0) for (let i = 0; i < d.length; i++) d[i] *= 0.7 / max;
  return b;
}

/** Pling: to toner, litt ustemt, som en gammel heis. */
const ding = (ctx) => buffer(ctx, 1.6, (d, rate) => {
  for (let i = 0; i < d.length; i++) {
    const t = i / rate;
    const a = Math.sin(2 * Math.PI * 1046 * t) * decay(t, 0.5);
    const b = t > 0.32 ? Math.sin(2 * Math.PI * 829 * (t - 0.32)) * decay(t - 0.32, 0.7) : 0;
    d[i] = (a + b * 1.1) * (1 + 0.15 * Math.sin(2 * Math.PI * 5 * t));
  }
});

/** Dørene: et rullende sus mens bladene glir, og et dempet dunk når de møtes (lukkes) eller stopper (åpnes). */
const slide = (ctx) => buffer(ctx, 1.4, (d, rate) => {
  let lp = 0;
  let rumble = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / rate;
    const n = Math.random() * 2 - 1;
    lp += 0.05 * (n - lp);
    rumble += 0.01 * (n - rumble);
    const u = Math.min(1, t / 1.1);
    const glide = t < 1.1 ? Math.sin(Math.PI * u) ** 0.6 : 0;
    const stop = t >= 1.1 ? (Math.sin(2 * Math.PI * 70 * (t - 1.1)) + rumble * 8) * decay(t - 1.1, 0.06) : 0;
    d[i] = (lp * 1.6 + rumble * 6) * glide + stop;
  }
});

/** Knirk: en tone som glir og skurrer, som metall mot metall i sjakten. */
const creak = (ctx) => buffer(ctx, 0.9, (d, rate) => {
  let phase = 0;
  const f0 = 300 + Math.random() * 500;
  for (let i = 0; i < d.length; i++) {
    const t = i / rate;
    const f = f0 * (1 + 0.25 * Math.sin(2 * Math.PI * 1.3 * t)) + 40 * Math.sin(2 * Math.PI * 31 * t);
    phase += (2 * Math.PI * f) / rate;
    const grit = Math.sin(phase) > 0.6 ? 1 : 0.2; // skurrende, ikke ren
    d[i] = (Math.sin(phase) * 0.6 + grit * (Math.random() - 0.5)) * Math.sin(Math.PI * Math.min(1, t / 0.9)) ** 2;
  }
});

/** Knappen: et kort klikk. */
const click = (ctx) => buffer(ctx, 0.08, (d, rate) => {
  for (let i = 0; i < d.length; i++) {
    const t = i / rate;
    d[i] = (Math.random() * 2 - 1) * decay(t, 0.004) + Math.sin(2 * Math.PI * 2400 * t) * decay(t, 0.006) * 0.5;
  }
});

const MAKERS = { ding, slide, creak, click };
const GAIN = { ding: 0.5, slide: 0.35, creak: 0.22, click: 0.35 };

/** Én heislyd: 'ding' | 'slide' | 'creak' | 'click'. Knirk lages ny hver gang, så de ikke blir like. */
export function liftSound(engine, kind) {
  if (!engine?.ctx || !engine.graph) return;
  const key = `lift_${kind}`;
  const sound = kind === 'creak' ? creak(engine.ctx) : (engine[key] ??= MAKERS[kind](engine.ctx));
  engine._oneShot(sound, GAIN[kind], kind === 'creak' ? 0.8 + Math.random() * 0.5 : 0.97 + Math.random() * 0.06);
}

/** Motoren under turen: 0 = stille, 1 = full fart (lav dur og vibrasjon). */
export function liftMotor(engine, level) {
  const { ctx, graph } = engine ?? {};
  if (!graph) return;
  let motor = graph.liftMotor;
  if (!motor && level < 0.01) return;
  if (!motor) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 160;
    filter.Q.value = 4;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    filter.connect(gain).connect(graph.stepBus);
    const hum = ctx.createOscillator();
    hum.type = 'sawtooth';
    hum.frequency.value = 48;
    const humGain = ctx.createGain();
    humGain.gain.value = 0.25;
    hum.connect(humGain).connect(filter);
    hum.start();
    const src = engine._loop(engine.white, filter);
    graph.nodes.push(filter, gain, hum, humGain, src);
    motor = graph.liftMotor = { gain, filter };
  }
  const now = ctx.currentTime;
  motor.gain.gain.setTargetAtTime(level * 0.55, now, 0.25);
  motor.filter.frequency.setTargetAtTime(120 + level * 80, now, 0.3);
}
