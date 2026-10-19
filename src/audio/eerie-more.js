// Flere skumle lyder for hverdagstemaene: en skoleklokke som ringer et sted langt borte, og en
// pasientmonitor som piper i et rom man ikke ser.
import { make, decay } from './buffers.js';

/** Elektrisk skoleklokke: en hammer som slår mot en bjelle ~20 ganger i sekundet. */
export function bell(ctx) {
  const len = 1.8 + Math.random() * 1.2;
  const f = 1150 + Math.random() * 200;
  return make(ctx, len + 0.8, (t) => {
    const ringing = t < len ? 1 : decay(t - len, 0.25);
    const strike = decay(t % 0.05, 0.012); // hvert slag gir et lite støt
    const tone = Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(2 * Math.PI * f * 2.76 * t) + 0.25 * Math.sin(2 * Math.PI * f * 5.4 * t);
    return tone * (0.55 + 0.45 * strike) * ringing;
  }, 0.4);
}

/** Pasientmonitor: korte, rene pip med jevn puls – noen ganger litt for fort. */
export function monitor(ctx) {
  const beats = 5 + Math.floor(Math.random() * 5);
  const gap = 0.55 + Math.random() * 0.4;
  return make(ctx, beats * gap + 0.3, (t) => {
    const k = Math.floor(t / gap);
    const u = t - k * gap;
    return k < beats && u < 0.11 ? Math.sin(2 * Math.PI * 960 * t) * Math.min(1, u * 200, (0.11 - u) * 200) : 0;
  }, 0.3);
}
