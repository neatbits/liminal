// Prosedyrell lyd: lager AudioBuffers for støy, romklang, fottrinn og små hendelser.
export { footstepBuffers } from './footsteps.js';

function buffer(ctx, seconds, channels = 1) {
  return ctx.createBuffer(channels, Math.max(1, Math.floor(ctx.sampleRate * seconds)), ctx.sampleRate);
}

function normalize(data, peak) {
  let max = 0;
  for (let i = 0; i < data.length; i++) max = Math.max(max, Math.abs(data[i]));
  if (max > 0) for (let i = 0; i < data.length; i++) data[i] *= peak / max;
}

export function noiseBuffer(ctx, seconds, kind = 'white') {
  const b = buffer(ctx, seconds);
  const d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    const white = Math.random() * 2 - 1;
    if (kind === 'brown') {
      last = (last + 0.02 * white) / 1.02;
      d[i] = last * 3.5;
    } else {
      d[i] = white;
    }
  }
  return b;
}

/** Stereo impulsrespons: tidlige refleksjoner + eksponentielt hale. */
export function impulseResponse(ctx, seconds, brightness = 0.5) {
  const b = buffer(ctx, seconds, 2);
  const sr = ctx.sampleRate;
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    let lp = 0;
    const a = 0.08 + brightness * 0.6;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      lp += a * (Math.random() * 2 - 1 - lp);
      d[i] = lp * Math.exp((-t * 6.9) / seconds);
    }
    for (let k = 0; k < 6; k++) {
      const at = Math.floor((0.008 + Math.random() * 0.06) * sr);
      if (at < d.length) d[at] += (Math.random() < 0.5 ? -1 : 1) * (0.5 - k * 0.06);
    }
  }
  return b;
}

function env(t, attack, tau) {
  return t < attack ? t / attack : Math.exp(-(t - attack) / tau);
}

/** Kort elektrisk knitring når et lysrør blinker. */
export function buzzBuffer(ctx) {
  const b = buffer(ctx, 0.12);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    const t = i / ctx.sampleRate;
    const saw = ((t * 100) % 1) * 2 - 1;
    d[i] = (saw * 0.6 + (Math.random() * 2 - 1) * 0.5) * env(t, 0.002, 0.03);
  }
  normalize(d, 0.5);
  return b;
}

/** Vanndråpe: rask tonefall-sinus. */
export function dripBuffer(ctx) {
  const b = buffer(ctx, 0.15);
  const d = b.getChannelData(0);
  let phase = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / ctx.sampleRate;
    phase += (2 * Math.PI * (1800 - t * 9000)) / ctx.sampleRate;
    d[i] = Math.sin(phase) * env(t, 0.001, 0.025);
  }
  normalize(d, 0.4);
  return b;
}

/** Fjernt dunk – noe tungt et sted i bygningen. */
export function thumpBuffer(ctx) {
  const b = buffer(ctx, 0.6);
  const d = b.getChannelData(0);
  let lp = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / ctx.sampleRate;
    lp += 0.01 * (Math.random() * 2 - 1 - lp);
    d[i] = (lp * 6 + Math.sin(2 * Math.PI * 45 * t) * 0.6) * env(t, 0.004, 0.12);
  }
  normalize(d, 0.6);
  return b;
}

/** Plask: støyskvett som mørkner raskt, og et dypt «plopp» når man treffer vannet. */
export function splashBuffer(ctx) {
  const b = buffer(ctx, 1.2);
  const d = b.getChannelData(0);
  let lp = 0;
  let phase = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / ctx.sampleRate;
    const k = 0.5 * Math.exp(-t * 4) + 0.02; // filteret lukker seg: lyst sprut → mørkt skvulp
    lp += k * (Math.random() * 2 - 1 - lp);
    phase += (2 * Math.PI * (160 - t * 120)) / ctx.sampleRate;
    d[i] = lp * 3 * env(t, 0.004, 0.35) + Math.sin(phase) * 0.5 * env(t, 0.002, 0.12);
  }
  normalize(d, 0.9);
  return b;
}

/** Man lander i en ballbinge: et rasende skred av plastballer som roer seg. */
export function ballsBuffer(ctx) {
  const b = buffer(ctx, 1.4);
  const d = b.getChannelData(0);
  let hp = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / ctx.sampleRate;
    const rate = 0.06 * Math.exp(-t / 0.35) + 0.002;
    const click = Math.random() < rate ? Math.random() * 2 - 1 : 0;
    hp += 0.3 * (click - hp);
    d[i] = (click - hp) + Math.sin(2 * Math.PI * 90 * t) * 0.4 * env(t, 0.003, 0.08);
  }
  normalize(d, 0.8);
  return b;
}
