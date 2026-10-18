// Periodisk (sømløs) verdistøy og fBm for teksturer som skal kunne gjentas.

export function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Verdistøy med periode px × py gitterpunkter. Returnerer f(x, y) i gitterenheter. */
export function periodicNoise(px, py, rand) {
  const v = new Float32Array(px * py);
  for (let i = 0; i < v.length; i++) v[i] = rand();
  return (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = x - xi;
    const fy = y - yi;
    const x0 = ((xi % px) + px) % px;
    const y0 = ((yi % py) + py) % py;
    const x1 = (x0 + 1) % px;
    const y1 = (y0 + 1) % py;
    const u = fx * fx * (3 - 2 * fx);
    const w = fy * fy * (3 - 2 * fy);
    const a = v[y0 * px + x0] + (v[y0 * px + x1] - v[y0 * px + x0]) * u;
    const b = v[y1 * px + x0] + (v[y1 * px + x1] - v[y1 * px + x0]) * u;
    return a + (b - a) * w;
  };
}

/**
 * Sømløs fBm-støy for en S × S-tekstur, normalisert til 0..1.
 * @param period antall gitterceller over teksturen i første oktav
 * @param periodY egen periode vertikalt (f.eks. for treverk)
 */
export function fbm(S, period, octaves, rand, gain = 0.5, periodY = period) {
  const out = new Float32Array(S * S);
  let amp = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const px = period << o;
    const py = periodY << o;
    const n = periodicNoise(px, py, rand);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) out[y * S + x] += n((x / S) * px, (y / S) * py) * amp;
    }
    total += amp;
    amp *= gain;
  }
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < out.length; i++) {
    out[i] /= total;
    lo = Math.min(lo, out[i]);
    hi = Math.max(hi, out[i]);
  }
  const span = hi - lo || 1;
  for (let i = 0; i < out.length; i++) out[i] = (out[i] - lo) / span;
  return out;
}
