import { describe, expect, it } from 'vitest';
import { FlashHint, FLASH_HINT } from '../src/world/flash-hint.js';

/** Kjører hintet i `seconds` sekunder med samme tilstand; returnerer hvor mange ganger det ble vist. */
const run = (hint, seconds, state) => {
  let n = 0;
  for (let t = 0; t < seconds; t += 0.1) if (hint.update(0.1, state)) n++;
  return n;
};
const DARK = { light: 0.05, on: false };

describe('hintet om lommelykten', () => {
  it('kommer etter en stund i mørket, ikke med en gang og ikke i lyset', () => {
    const hint = new FlashHint();
    expect(run(hint, 10, { light: 0.8, on: false })).toBe(0);
    expect(run(hint, FLASH_HINT.AFTER - 0.5, DARK)).toBe(0);
    expect(run(hint, 1, DARK)).toBe(1);
  });

  it('et kort øyeblikk i mørket teller ikke: tiden starter på nytt i lyset', () => {
    const hint = new FlashHint();
    for (let k = 0; k < 5; k++) {
      expect(run(hint, FLASH_HINT.AFTER - 0.5, DARK)).toBe(0);
      run(hint, 1, { light: 0.9, on: false });
    }
  });

  it('kommer høyst noen ganger, med god avstand', () => {
    const hint = new FlashHint();
    expect(run(hint, FLASH_HINT.AGAIN - 1, DARK)).toBe(1);
    expect(run(hint, 600, DARK)).toBe(FLASH_HINT.TIMES - 1);
  });

  it('aldri igjen etter at man har brukt lykten, og ikke med tomt batteri', () => {
    const hint = new FlashHint();
    run(hint, 1, { light: 0.05, on: true });
    expect(run(hint, 600, DARK)).toBe(0);
    expect(run(new FlashHint(), 600, { ...DARK, empty: true })).toBe(0);
  });
});
