import { describe, expect, it } from 'vitest';
import { createLevel, setLight, TILE, LIGHT, clampHeight, HEIGHT_MAX, FLOOR_MAX } from '../src/core/level.js';
import { fillTiles, rectIndices } from '../src/core/ops.js';
import { fillZone, zoneDm } from '../src/core/zones.js';
import { getTheme } from '../src/core/themes.js';
import { collectLights, createLightField, HANG, LIGHT_DROP } from '../src/world/lighting.js';

function hall(height) {
  const level = createLevel({ w: 12, h: 12, height });
  fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 10, z1: 10 }), TILE.FLOOR);
  setLight(level, 5, 5, LIGHT.ON);
  return level;
}

describe('høye tak og platåer', () => {
  it('tak opp til 20 m og platåer opp til 10 m', () => {
    expect(HEIGHT_MAX).toBe(20);
    expect(clampHeight(18)).toBe(18);
    expect(zoneDm('floor', FLOOR_MAX)).toBe(100);
  });

  it('i vanlige rom sitter lampen under taket; i høye haller henger den i en ledning', () => {
    const [low] = collectLights(hall(3));
    expect(low.top).toBe(3);
    expect(low.y).toBeCloseTo(3 - LIGHT_DROP, 6);
    const [high] = collectLights(hall(15));
    expect(high.ceil).toBe(15);
    expect(high.top).toBe(HANG);
    // På et platå henger den like høyt over platået.
    const level = hall(15);
    fillZone(level, 'floor', [5 * level.w + 5], 8); // 8 + HANG er over taket: under taket
    expect(collectLights(level)[0].top).toBe(15);
    fillZone(level, 'floor', [5 * level.w + 5], 4);
    expect(collectLights(level)[0].top).toBe(4 + HANG);
  });

  it('gulvet i en høy hall er like godt opplyst som i en hall på 8 m', () => {
    const lit = (height) => {
      const level = hall(height);
      return createLightField(level, getTheme(level.theme)).sample(5.5, 0, 6.5, 0, 1, 0)[0];
    };
    expect(lit(18)).toBeCloseTo(lit(8), 6);
  });
});
