// Underlagets klang, anslag og miks. Filterfrekvenser i Hz gir samme mykhet ved
// 22,05/44,1/48 kHz; teppe og skum får lavere topper og mindre romklang.
import { buffer, normalize } from './buffers.js';

const PROFILES = {
  carpet: { peak: 0.42, gain: 0.14, variation: 0.04, wet: 0.12 },
  foam: { peak: 0.42, gain: 0.18, variation: 0.05, wet: 0.16 },
  tile: { peak: 0.52, gain: 0.22, variation: 0.08, wet: 0.3 },
  concrete: { peak: 0.52, gain: 0.26, variation: 0.09, wet: 0.3 },
  water: { peak: 0.46, gain: 0.2, variation: 0.05, wet: 0.28 },
  balls: { peak: 0.46, gain: 0.22, variation: 0.08 },
};
const STEP_GAIN = 0.15; // Subdued footsteps (about -16.5 dB); other sounds keep their levels.
const env = (t, attack, tau) => t < attack ? Math.sin(t / attack * Math.PI / 2) ** 2 : Math.exp(-(t - attack) / tau);
const coefficient = (hz, rate) => 1 - Math.exp(-2 * Math.PI * hz / rate);

const SHAPES = {
  carpet(t, n, s) {
    s.lp += s.soft * (n - s.lp);
    s.lp2 += s.soft * (s.lp - s.lp2);
    return (s.lp2 * 2.4 + Math.sin(2 * Math.PI * 55 * t) * 0.035) * env(t, 0.03, 0.05);
  },
  foam(t, n, s) {
    s.lp += s.foam * (n - s.lp);
    s.lp2 += s.foam * (s.lp - s.lp2);
    return (s.lp2 * 2 + Math.sin(2 * Math.PI * 65 * t) * 0.1) * env(t, 0.026, 0.055);
  },
  tile(t, n, s) {
    s.lp += s.tile * (n - s.lp);
    s.lp2 += s.body * (n - s.lp2);
    s.lp3 += s.tile * (s.lp - s.lp2 - s.lp3);
    return s.lp3 * env(t, 0.022, 0.03) * 2.4
      + Math.sin(2 * Math.PI * 95 * t) * env(t, 0.02, 0.035) * 0.24;
  },
  concrete(t, n, s) {
    s.lp += s.stone * (n - s.lp);
    s.lp2 += s.body * (n - s.lp2);
    s.lp3 += s.stone * (s.lp - s.lp2 - s.lp3);
    return s.lp3 * env(t, 0.02, 0.032) * 2
      + Math.sin(2 * Math.PI * 85 * t) * env(t, 0.018, 0.035) * 0.22;
  },
  balls(t, n, s) {
    const click = Math.random() < 0.02 * Math.exp(-t / 0.12) ? n : 0;
    s.lp += s.plastic * (click - s.lp);
    s.lp2 += s.rustle * (s.lp - s.lp2);
    return (s.lp - s.lp2) * 1.5;
  },
  water(t, n, s) {
    const a = s.waterLow + (s.waterHigh - s.waterLow) * Math.min(1, t / 0.35);
    s.lp += a * (n - s.lp);
    s.lp2 += a * (s.lp - s.lp2);
    let bubble = 0;
    for (const b of s.bubbles) {
      const bt = t - b.at;
      if (bt > 0 && bt < 0.08) bubble += Math.sin(2 * Math.PI * (b.f + bt * 3000) * bt)
        * Math.sin(Math.PI * bt / 0.08) ** 2 * 0.05;
    }
    return s.lp2 * env(t, 0.045, 0.14) * 2 + bubble;
  },
};

export function footstepBuffers(ctx, surface) {
  const profile = PROFILES[surface] ?? PROFILES.carpet;
  const shape = SHAPES[surface] ?? SHAPES.carpet;
  const seconds = surface === 'water' ? 0.55 : surface === 'balls' ? 0.35 : 0.28;
  return Array.from({ length: 4 }, () => {
    const b = buffer(ctx, seconds), d = b.getChannelData(0), rate = ctx.sampleRate;
    const state = { lp: 0, lp2: 0, lp3: 0,
      soft: coefficient(400, rate), foam: coefficient(350, rate), body: coefficient(150, rate),
      tile: coefficient(580, rate), stone: coefficient(620, rate),
      plastic: coefficient(2500, rate), rustle: coefficient(500, rate),
      waterLow: coefficient(280, rate), waterHigh: coefficient(700, rate),
      bubbles: Array.from({ length: 2 }, () => ({ at: 0.06 + Math.random() * 0.3, f: 250 + Math.random() * 150 })),
    };
    for (let i = 0; i < d.length; i++) {
      const t = i / rate;
      d[i] = shape(t, Math.random() * 2 - 1, state)
        * Math.min(1, t / 0.002) * Math.min(1, (d.length - 1 - i) / (rate * 0.025));
    }
    normalize(d, profile.peak);
    return b;
  });
}

/** Forhåndsbygde busser: myke kontakter og rolig vassing får mindre ekko enn harde flater. */
export function createStepBuses(ctx, keep, send) {
  return Object.fromEntries(Object.keys(PROFILES).filter((name) => PROFILES[name].wet != null).map((name) => {
    const bus = keep(ctx.createGain());
    bus.gain.value = 0.45;
    send(bus, PROFILES[name].wet);
    return [name, bus];
  }));
}

export function playStep(engine, surface, volume = 1) {
  const key = PROFILES[surface] ? surface : 'carpet';
  const profile = PROFILES[key], list = engine.steps[key];
  if (!list) return;
  const gain = profile.gain + Math.random() * profile.variation;
  engine._oneShot(list[Math.floor(Math.random() * list.length)], gain * volume * STEP_GAIN,
    0.94 + Math.random() * 0.12, engine.graph?.stepBuses?.[key]);
}
