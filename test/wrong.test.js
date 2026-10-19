import { describe, expect, it } from 'vitest';
import { TILE, cloneLevel } from '../src/core/level.js';
import { mulberry32 } from '../src/core/rng.js';
import { generateLevel } from '../src/gen/index.js';
import { makeWrong, changeMarkers, STRENGTHS, CHANGE_NAMES } from '../src/gen/wrong.js';
import { labelRegions } from '../src/gen/util.js';

const diffCount = (a, b) => {
  let n = 0;
  for (const key of ['tiles', 'lights', 'ceilings', 'finish', 'meta']) for (let i = 0; i < a[key].length; i++) if (a[key][i] !== b[key][i]) n++;
  return n;
};

describe('Make it wrong', () => {
  it('gjør så mange små endringer som styrken sier', () => {
    for (const [strength, { count }] of Object.entries(STRENGTHS)) {
      const level = generateLevel({ theme: 'office', w: 40, h: 32, seed: 3 });
      const changes = makeWrong(level, strength, mulberry32(7));
      expect(changes.length, strength).toBeGreaterThanOrEqual(count[0]);
      expect(changes.length, strength).toBeLessThanOrEqual(count[1]);
      for (const c of changes) expect(CHANGE_NAMES).toContain(c.name);
    }
  });

  it('endrer rommet bare litt – og alt henger fortsatt sammen', () => {
    for (const theme of ['office', 'basement', 'backrooms', 'mall', 'pool']) {
      const level = generateLevel({ theme, w: 40, h: 32, seed: 5 });
      const before = cloneLevel(level);
      makeWrong(level, 'very', mulberry32(11));
      const changed = diffCount(before, level);
      expect(changed, theme).toBeGreaterThan(5);
      expect(changed / (level.w * level.h), theme).toBeLessThan(0.15);
      expect(labelRegions(level).sizes, theme).toHaveLength(1);
      expect(level.tiles.filter((t) => t === TILE.WALL).length).toBeLessThanOrEqual(before.tiles.filter((t) => t === TILE.WALL).length);
    }
  });

  it('tåke og lysstyrke endres bare litt, og høyst én gang', () => {
    const level = generateLevel({ theme: 'hotel', w: 40, h: 32, seed: 2 });
    const changes = makeWrong(level, 'very', mulberry32(3));
    expect(changes.filter((c) => c.name === 'fog').length).toBeLessThanOrEqual(1);
    expect(level.fog).toBeLessThan(1.35);
    expect(level.bright).toBeGreaterThan(0.8);
  });

  it('én markering per endring som har et sted, stor nok til å dekke den', () => {
    const level = generateLevel({ theme: 'office', w: 40, h: 32, seed: 3 });
    const changes = makeWrong(level, 'very', mulberry32(4));
    const markers = changeMarkers(changes);
    expect(markers).toHaveLength(changes.filter((c) => c.cells.length).length);
    for (const m of markers) expect(m.r).toBeGreaterThanOrEqual(0.7);
    expect(changes.filter((c) => c.name === 'ceilingUp').length).toBeLessThanOrEqual(2);
  });

  it('samme tilfeldighet gir samme endringer', () => {
    const a = generateLevel({ theme: 'office', w: 32, h: 28, seed: 1 });
    const b = generateLevel({ theme: 'office', w: 32, h: 28, seed: 1 });
    expect(makeWrong(a, 'wrong', mulberry32(9)).map((c) => c.name)).toEqual(makeWrong(b, 'wrong', mulberry32(9)).map((c) => c.name));
  });
});
