import { describe, expect, it } from 'vitest';
import { FlickerController } from '../src/view3d/flicker.js';
import { mulberry32 } from '../src/core/rng.js';

describe('blinking', () => {
  it('holder verdiene mellom 0 og 1 og blinker etter hvert', () => {
    const f = new FlickerController(mulberry32(3));
    let changes = 0;
    for (let i = 0; i < 60 * 60; i++) {
      changes += f.update(1 / 60).length;
      for (const v of f.values) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
    expect(changes).toBeGreaterThan(4);
  });

  it('starter med fullt lys', () => {
    expect(new FlickerController(mulberry32(1)).values).toEqual([1, 1, 1, 1]);
  });
});
