import { describe, expect, it } from 'vitest';
import { ASPECTS, fitAspect, frameDue } from '../src/view3d/display.js';

describe('bildet i fullskjerm', () => {
  it('32:9-skjerm med 16:9: halvparten så bredt, like høyt (svarte felt på sidene)', () => {
    expect(fitAspect(5120, 1440, ASPECTS['16:9'])).toEqual([2560, 1440]);
    expect(fitAspect(5120, 1440, ASPECTS['21:9'])).toEqual([3360, 1440]);
  });

  it('16:10-skjerm med 16:9: svarte felt over og under; skjermformat endrer ingenting', () => {
    expect(fitAspect(1920, 1200, ASPECTS['16:9'])).toEqual([1920, 1080]);
    expect(fitAspect(5120, 1440, ASPECTS.screen)).toEqual([5120, 1440]);
    expect(fitAspect(1920, 1080, ASPECTS['16:9'])).toEqual([1920, 1080]);
  });

  it('begrenset bildefrekvens hopper over bilder som kommer for tett', () => {
    const v = { settings: { fpsCap: 30 } };
    const drawn = [0, 8, 16, 25, 33, 41, 50, 58, 66].filter((t) => frameDue(v, t));
    expect(drawn).toEqual([0, 33, 66]);
    expect(frameDue({ settings: { fpsCap: 0 } }, 1)).toBe(true);
  });
});
