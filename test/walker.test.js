import { describe, expect, it } from 'vitest';
import { createLevel, TILE, WATER_SURFACE } from '../src/core/level.js';
import { fillTiles, rectIndices } from '../src/core/ops.js';
import { getTheme } from '../src/core/themes.js';
import { Walker, EYE, SWIM_EYE, eyeHeight, isSwimming } from '../src/view3d/walker.js';

const still = { forward: 0, strafe: 0, running: false, consumeLook: () => [0, 0] };
const ahead = { ...still, forward: 1 };

function camera() {
  return { position: { set(x, y, z) { Object.assign(this, { x, y, z }); } }, rotation: { set() {} } };
}

// Gulv i x 1–3, basseng i x 4–10 (grunt i x 4–6, dypt i x 7–10).
function pool() {
  const level = createLevel({ w: 12, h: 5 });
  fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 10, z1: 3 }), TILE.FLOOR);
  fillTiles(level, rectIndices(level, { x0: 4, z0: 1, x1: 10, z1: 3 }), TILE.WATER);
  for (let z = 1; z <= 3; z++) for (let x = 7; x <= 10; x++) level.depths[z * 12 + x] = 25;
  return level;
}

describe('gange og svømming', () => {
  it('øyehøyden følger bunnen til vannet blir for dypt', () => {
    expect(eyeHeight(0)).toBe(EYE);
    expect(eyeHeight(-0.7)).toBeCloseTo(EYE - 0.7, 6);
    expect(isSwimming(-0.7)).toBe(false);
    expect(isSwimming(-2.5)).toBe(true);
    expect(eyeHeight(-2.5)).toBeCloseTo(WATER_SURFACE + SWIM_EYE, 6);
  });

  it('man går ut i det dype og flyter i overflaten', () => {
    const level = pool();
    const theme = getTheme('pool');
    const walker = new Walker();
    walker.reset(level, { x: 2.5, z: 2.5, a: -Math.PI / 2 }); // ser mot +x
    const cam = camera();
    walker.applyToCamera(cam);
    expect(cam.position.y).toBeCloseTo(EYE, 1);
    for (let i = 0; i < 400 && walker.x < 9; i++) walker.update(1 / 60, ahead, level, theme);
    for (let i = 0; i < 120; i++) walker.update(1 / 60, still, level, theme);
    expect(walker.x).toBeGreaterThan(8);
    walker.applyToCamera(cam);
    expect(cam.position.y).toBeCloseTo(WATER_SURFACE + SWIM_EYE, 2);
  });

  it('svømming går saktere enn å vasse', () => {
    const level = pool();
    const theme = getTheme('pool');
    const speed = (x) => {
      const walker = new Walker();
      walker.reset(level, { x, z: 2.5, a: -Math.PI / 2 });
      for (let i = 0; i < 60; i++) walker.update(1 / 60, ahead, level, theme);
      return walker.x - x;
    };
    expect(speed(7.2)).toBeLessThan(speed(4.2));
  });
});
