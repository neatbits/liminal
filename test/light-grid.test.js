import { describe, expect, it } from 'vitest';
import { LIGHT } from '../src/core/level.js';
import { mulberry32 } from '../src/core/rng.js';
import { lightGrid, lightSampleKey, windowNeighbours } from '../src/world/light-grid.js';

describe('romlige lysoppslag', () => {
  it('beholder alle kandidater i samme bøtter også ved kartkantene og skiftende radius', () => {
    const level = { w: 17, h: 13 };
    const lights = Array.from({ length: 221 }, (_, i) => ({ cx: i % 17, cz: Math.floor(i / 17), state: i % 7 ? LIGHT.ON : LIGHT.BROKEN }));
    const near = lightGrid(level, lights);
    for (const r of [0, 1, 6, 7, 11, 30]) for (const [x, z] of [[0, 0], [3.99, 8.01], [4, 8], [16.99, 12.99], [-2, 7], [25, 7]]) {
      const expected = lights.filter((l) => l.state !== LIGHT.BROKEN
        && Math.floor(l.cx / 4) >= Math.max(0, Math.floor((x - r) / 4))
        && Math.floor(l.cx / 4) <= Math.min(4, Math.floor((x + r) / 4))
        && Math.floor(l.cz / 4) >= Math.max(0, Math.floor((z - r) / 4))
        && Math.floor(l.cz / 4) <= Math.min(3, Math.floor((z + r) / 4)));
      expect(new Set(near(x, z, r))).toEqual(new Set(expected));
    }
  });

  it('vinduslyset beholder samme styrke som parvis nabotelling', () => {
    const level = { w: 32, h: 24 };
    const wins = Array.from({ length: 768 }, (_, i) => ({ x: i % 32, z: Math.floor(i / 32) })).filter((_, i) => i % 3);
    expect(windowNeighbours(level, wins)).toEqual(wins.map((a) => wins.filter((b) => Math.hypot(a.x - b.x, a.z - b.z) <= 3).length));
  });

  it('hurtignøkler blander aldri posisjoner eller normaler, heller ikke nesten like modellpunkter', () => {
    const rand = mulberry32(6);
    const seen = new Map();
    const normals = [[-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1], [0.5, 0.5, 0],
      [0.75, -0.25, 0.5], [-0.75, -0.25, 0.5], [0.25, 1, -0.25], [0.3, 0.9, 0.1]];
    for (let i = 0; i < 3000; i++) {
      const x = Math.floor(rand() * 2560) / 20;
      const y = (Math.floor(rand() * 600) - 150) / 20;
      const z = Math.floor(rand() * 2560) / 20;
      for (const n of normals) for (const dy of [0, 1e-14]) {
        const values = [x, y + dy, z, ...n];
        const key = lightSampleKey(...values);
        if (seen.has(key)) expect(seen.get(key)).toEqual(values);
        seen.set(key, values);
      }
    }
    expect(typeof lightSampleKey(1, 0, 2, 0, 1, 0)).toBe('number');
    expect(typeof lightSampleKey(1, 0, 2, 0.75, -0.25, 0.5)).toBe('number'); // gjenstandenes gitter
    expect(typeof lightSampleKey(1, 1e-16, 2, 0, 1, 0)).toBe('string');
    expect(typeof lightSampleKey(1, 0, 2, 0.3, 0.9, 0.1)).toBe('string');
    expect(typeof lightSampleKey(1, 0, 2, 1.25, 0, 0)).toBe('string');
    expect(lightSampleKey(409.55, 51.15, 409.55, 1, 1, 1)).toBeLessThan(Number.MAX_SAFE_INTEGER);
  });
});
