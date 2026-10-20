import { describe, expect, it } from 'vitest';
import { randomSeed, parseSeed, SEED_MAX } from '../src/core/rng.js';

describe('frø', () => {
  it('tilfeldige frø er korte (1–99999)', () => {
    for (let k = 0; k < 200; k++) {
      const s = randomSeed();
      expect(Number.isInteger(s)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(1);
      expect(s).toBeLessThanOrEqual(SEED_MAX);
    }
  });

  it('leser frø fra brukeren, og gir null for tomt eller ugyldig', () => {
    expect(parseSeed('4471')).toBe(4471);
    expect(parseSeed(' 12 ')).toBe(12);
    expect(parseSeed(0)).toBe(0);
    for (const v of ['', '  ', null, undefined, 'abc', '-3']) expect(parseSeed(v)).toBeNull();
  });
});
