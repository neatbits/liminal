import { describe, expect, it } from 'vitest';
import { createLevel, TILE } from '../src/core/level.js';
import { fillTiles, rectIndices } from '../src/core/ops.js';
import { fillZone } from '../src/core/zones.js';
import { placeStairs } from '../src/core/stairs.js';
import { deckAt, groundAt, headAt, ceilingAt, stairSpan, SLAB } from '../src/core/heights.js';
import { railSides, guardBoxes } from '../src/core/railings.js';
import { levelFromJSON, levelToJSON } from '../src/core/serialize.js';
import { moveCircle } from '../src/world/collision.js';
import { collectLights, cellHeights, lineOfSight } from '../src/world/lighting.js';
import { buildSurfaces } from '../src/world/surfaces.js';
import { openSpans } from '../src/world/decks.js';

const R = 0.28;

// Hall 20 × 12, tak 7 m. Dekke i 4 m over den nordre delen (z 1–4); atriet (z 5–10) er åpent,
// med en trapp fra bunnen av atriet opp til dekket. En vegg med døråpning deler dekket ved x = 15.
function mall() {
  const level = createLevel({ w: 20, h: 12, height: 7 });
  fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 18, z1: 10 }), TILE.FLOOR);
  fillTiles(level, rectIndices(level, { x0: 15, z0: 1, x1: 15, z1: 4 }), TILE.WALL);
  fillTiles(level, [2 * 20 + 15], TILE.DOOR);
  fillZone(level, 'deck', rectIndices(level, { x0: 1, z0: 1, x1: 18, z1: 4 }), 4);
  placeStairs(level, [10, 10], [10, 5]);
  return level;
}

describe('dekker – høyder', () => {
  it('bare gulv- og søyleruter har dekke', () => {
    const level = mall();
    expect(deckAt(level, 5, 2)).toBe(4);
    expect(deckAt(level, 15, 2)).toBe(0); // døråpningen
    expect(deckAt(level, 5, 7)).toBe(0); // atriet
    expect(fillZone(level, 'deck', [7 * 20 + 10], 4)).toBe(0); // trappen
  });

  it('gulvet og taket avhenger av etasjen man står i', () => {
    const level = mall();
    expect(groundAt(level, 5.5, 2.5)).toBe(0);
    expect(groundAt(level, 5.5, 2.5, 0.3)).toBe(0);
    expect(groundAt(level, 5.5, 2.5, 4)).toBe(4);
    expect(headAt(level, 5.5, 2.5, 0)).toBeCloseTo(4 - SLAB);
    expect(headAt(level, 5.5, 2.5, 4)).toBe(7);
  });

  it('taket holdes minst en dørhøyde over dekket', () => {
    const level = mall();
    fillZone(level, 'deck', rectIndices(level, { x0: 1, z0: 1, x1: 4, z1: 4 }), 5.5);
    expect(ceilingAt(level, 2, 2)).toBeCloseTo(7.6);
  });

  it('en trapp opp til et dekke stiger til dekkets høyde', () => {
    const level = mall();
    expect(stairSpan(level, 10, 5).top).toBe(4);
    expect(stairSpan(level, 10, 6).top).toBeLessThan(4);
  });

  it('dekker og høye trapper lagres og leses tilbake', () => {
    const level = mall();
    const back = levelFromJSON(JSON.parse(JSON.stringify(levelToJSON(level))));
    expect(Array.from(back.decks)).toEqual(Array.from(level.decks));
    expect(stairSpan(back, 10, 5).top).toBe(4);
  });
});

describe('dekker – rekkverk og kollisjon', () => {
  it('dekkekanten mot atriet får vern i dekkets høyde, men ikke der trappen kommer opp', () => {
    const level = mall();
    expect(railSides(level, 5, 4)).toEqual([{ dx: 0, dz: 1, kind: 'guard', y: 4 }]);
    expect(railSides(level, 10, 4)).toEqual([]);
    expect(railSides(level, 5, 3)).toEqual([]);
  });

  it('vernet på dekket stopper bare den som står på dekket', () => {
    const level = mall();
    expect(guardBoxes(level, 5, 4, 0)).toEqual([]);
    expect(guardBoxes(level, 5, 4, 4)).toHaveLength(1);
  });

  it('under dekket går man fritt ut i atriet; oppe stopper vernet', () => {
    const level = mall();
    const [, below] = moveCircle(level, 5.5, 3.5, 0, 2, R, true, 0);
    expect(below).toBeCloseTo(5.5, 3);
    const [, above] = moveCircle(level, 5.5, 3.5, 0, 2, R, true, 4);
    expect(above).toBeLessThan(5 - R);
  });

  it('oppe er veggen over døråpningen tett; nede går man gjennom', () => {
    const level = mall();
    const [up] = moveCircle(level, 13.5, 2.5, 3, 0, R, true, 4);
    expect(up).toBeLessThan(15 - R + 1e-6);
    const [down] = moveCircle(level, 13.5, 2.5, 3, 0, R, true, 0);
    expect(down).toBeCloseTo(16.5, 3);
  });
});

describe('dekker – lys og flater', () => {
  it('et lys i en rute med dekke gir én armatur i hver etasje', () => {
    const level = mall();
    level.lights[2 * 20 + 5] = 1;
    const lights = collectLights(level);
    expect(lights.map((l) => l.ceil).sort()).toEqual([4 - SLAB, 7]);
  });

  it('platen stenger lyset mellom etasjene', () => {
    const level = mall();
    const heights = cellHeights(level);
    expect(lineOfSight(level, 5.5, 2.5, 5.5, 2.6, heights, 0, 6.8)).toBe(false);
    expect(lineOfSight(level, 5.5, 2.5, 5.5, 2.6, heights, 0, 3.5)).toBe(true);
    expect(lineOfSight(level, 5.5, 2.5, 5.5, 2.6, heights, 4, 6.8)).toBe(true);
    // Fra atriegulvet skrått opp under dekket og gjennom platen til andre etasje.
    expect(lineOfSight(level, 5.5, 7.5, 5.5, 2.5, heights, 0, 6.8)).toBe(false);
    expect(lineOfSight(level, 5.5, 7.5, 5.5, 2.5, heights, 0, 2.5)).toBe(true);
  });

  it('søylen i en rute med dekke deles i to etasjer', () => {
    const level = mall();
    expect(openSpans(level, 5, 2)).toEqual([
      { lo: 0, hi: 4 - SLAB, base: 0 },
      { lo: 4, hi: 7, base: 4 },
    ]);
    expect(openSpans(level, 5, 7)).toEqual([{ lo: 0, hi: 7, base: 0 }]);
  });

  it('dekket får gulv oppå, himling under og kantlist mot atriet', () => {
    const level = mall();
    const out = buildSurfaces(level, null, { subdivide: 1 });
    const ys = (mesh) => new Set(mesh.pos.filter((_, k) => k % 3 === 1).map((y) => Math.round(y * 100) / 100));
    expect(ys(out.floor).has(4)).toBe(true);
    expect(ys(out.ceiling).has(3.7)).toBe(true);
    expect(ys(out.wall).has(3.7)).toBe(true);
  });
});
