// Kort, dempet kompresjonslyd for gummi/skum. Skill den fra bygningens tunge dunk.
import { buffer, normalize } from './buffers.js';

export function rubberBuffer(ctx) {
  const seconds = 0.32, rate = ctx.sampleRate;
  const out = buffer(ctx, seconds), data = out.getChannelData(0);
  const alpha = 1 - Math.exp(-2 * Math.PI * 320 / rate);
  let lp = 0, lp2 = 0, phase = 0;
  for (let i = 0; i < data.length; i++) {
    const t = i / rate;
    lp += alpha * (Math.random() * 2 - 1 - lp);
    lp2 += alpha * (lp - lp2);
    phase += 2 * Math.PI * (55 + 30 * Math.exp(-t / 0.04)) / rate;
    const envelope = t < 0.022 ? Math.sin(t / 0.022 * Math.PI / 2) ** 2 : Math.exp(-(t - 0.022) / 0.055);
    data[i] = (lp2 * 1.8 + Math.sin(phase) * 0.12) * envelope
      * Math.min(1, (data.length - 1 - i) / (rate * 0.025));
  }
  normalize(data, 0.4);
  return out;
}

export function playImpact(engine, strength, material = 'rubber') {
  if (!engine.ctx || !engine.graph || !engine.enabled || !engine.playing) return;
  const amount = Math.max(0, Math.min(1, Number(strength) || 0));
  if (amount <= 0) return;
  if (material !== 'rubber') {
    engine._oneShot(engine.thump, 0.12 + amount * 0.45, 1.25 + Math.random() * 0.2);
    return;
  }
  const now = engine.ctx.currentTime;
  if (now - (engine.lastRubberImpact ?? -Infinity) < 0.12) return; // en velting gir flere kontaktmeldinger
  engine.lastRubberImpact = now;
  engine.rubberSound ??= rubberBuffer(engine.ctx);
  engine._oneShot(engine.rubberSound, 0.08 + amount * 0.24, 0.94 + Math.random() * 0.1, engine.graph.stepBuses?.foam);
}
