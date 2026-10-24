import { describe, expect, it } from 'vitest';
import { Ripples, RIPPLES, RIPPLE_LIFE } from '../src/world/ripples.js';

describe('ringer i vannet', () => {
  it('den som vasser lager ringer jevnlig – oftere når man går', () => {
    const count = (speed) => {
      const r = new Ripples();
      let n = 0;
      for (let i = 0; i < 300; i++) {
        const before = r.points.length;
        r.wade(i * 0.01, 0, speed);
        if (r.points.length > before || (r.points.length === RIPPLES && before === RIPPLES)) n++;
        r.step(1 / 60);
      }
      return n;
    };
    expect(count(1.5)).toBeGreaterThan(count(0) * 3);
    expect(count(0)).toBeGreaterThan(0); // står man stille, kommer det en liten ring av og til
  });

  it('et plask gir to ringer, den ene sterkere, og ringene dør ut', () => {
    const r = new Ripples();
    r.splash(3, 4, 5);
    const v = r.values();
    expect(v[3]).toBeGreaterThan(0);
    expect(v[2]).toBeGreaterThan(0); // den første startet litt før
    expect(v[7]).toBeGreaterThan(v[3]);
    for (let t = 0; t < RIPPLE_LIFE + 0.1; t += 0.1) r.step(0.1);
    expect(r.points.length).toBe(0);
    expect(r.values().every((x) => x === 0)).toBe(true);
  });

  it('aldri flere ringer enn shaderen har plass til', () => {
    const r = new Ripples();
    for (let i = 0; i < RIPPLES * 3; i++) r.emit(i, 0);
    expect(r.points.length).toBe(RIPPLES);
    expect(r.values().length).toBe(RIPPLES * 4);
    expect(r.points[0].x).toBe(RIPPLES * 2); // de eldste forsvinner først
  });
});
