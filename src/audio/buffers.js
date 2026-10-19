// Små hjelpere for å lage lydbuffere med en funksjon av tiden (eerie.js, eerie-more.js).

export const rand = (a, b) => a + Math.random() * (b - a);

export function buffer(ctx, seconds) {
  return ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * seconds)), ctx.sampleRate);
}

export function normalize(d, peak) {
  let max = 0;
  for (let i = 0; i < d.length; i++) max = Math.max(max, Math.abs(d[i]));
  if (max > 0) for (let i = 0; i < d.length; i++) d[i] *= peak / max;
}

/** Fyller en buffer med fn(t, i) og normaliserer. */
export function make(ctx, seconds, fn, peak = 0.8) {
  const b = buffer(ctx, seconds);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = fn(i / ctx.sampleRate, i);
  normalize(d, peak);
  return b;
}

export const decay = (t, tau) => (t < 0 ? 0 : Math.exp(-t / tau));
