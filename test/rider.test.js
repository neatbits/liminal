import { describe, expect, it } from 'vitest';
import { createLevel, TILE, WATER_SURFACE } from '../src/core/level.js';
import { fillTiles, rectIndices } from '../src/core/ops.js';
import { fillZone } from '../src/core/zones.js';
import { addSlide, slidePath } from '../src/core/slides.js';
import { Rider } from '../src/view3d/rider.js';
import { Walker, EYE } from '../src/view3d/walker.js';

const still = { forward: 0, strafe: 0, running: false, consumeLook: () => [0, 0] };

function camera() {
  return {
    position: { set(x, y, z) { Object.assign(this, { x, y, z }); } },
    rotation: { set(x, y, z) { Object.assign(this, { x, y, z }); } },
  };
}

// Plattform i 2,4 m (x 2–4) og basseng fra x 9; sklie rett østover.
function level() {
  const l = createLevel({ w: 20, h: 8, height: 3.4, theme: 'pool' });
  fillTiles(l, rectIndices(l, { x0: 1, z0: 1, x1: 18, z1: 6 }), TILE.FLOOR);
  fillZone(l, 'floor', rectIndices(l, { x0: 2, z0: 2, x1: 4, z1: 5 }), 2.4);
  fillTiles(l, rectIndices(l, { x0: 9, z0: 1, x1: 18, z1: 6 }), TILE.WATER);
  addSlide(l, [[4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3]]);
  return l;
}

describe('skliing', () => {
  it('farten øker nedover, og turen ender over vannet i skliens retning', () => {
    const l = level();
    const rider = new Rider();
    rider.start(slidePath(l, l.slides[0]), 0);
    let landed = null;
    let top = 0;
    for (let i = 0; i < 600 && !landed; i++) {
      landed = rider.update(1 / 60, still);
      if (!landed) top = Math.max(top, rider.v);
    }
    expect(landed).not.toBeNull();
    expect(top).toBeGreaterThan(3);
    expect(landed.x).toBeGreaterThan(11);
    expect(landed.vx).toBeGreaterThan(2);
    expect(Math.abs(landed.vz)).toBeLessThan(0.1);
    expect(rider.active).toBe(false);
  });

  it('kameraet sitter i rennen og ser nedover banen', () => {
    const l = level();
    const rider = new Rider();
    rider.start(slidePath(l, l.slides[0]));
    for (let i = 0; i < 600 && rider.s < rider.path.launch + 0.5; i++) rider.update(1 / 60, still);
    const cam = camera();
    rider.applyToCamera(cam);
    const p = rider.sample(rider.s);
    expect(cam.position.y).toBeGreaterThan(p.y + 0.5);
    expect(cam.rotation.x).toBeLessThan(0); // ser litt ned
    expect(cam.rotation.y).toBeCloseTo(-Math.PI / 2, 1); // mot +x
  });

  it('man lander i vannet med et dukk som forsvinner', () => {
    const l = level();
    const walker = new Walker();
    walker.reset(l, { x: 3.5, z: 3.5, a: 0 });
    walker.land(l, { x: 12, z: 3.5, vx: 5, vz: 0, speed: 5 });
    expect(walker.x).toBe(12);
    expect(walker.dip).toBeGreaterThan(0.5);
    const cam = camera();
    walker.applyToCamera(cam);
    expect(cam.position.y).toBeLessThan(walker.floorY + EYE);
    for (let i = 0; i < 120; i++) walker.update(1 / 60, still, l, { sound: { step: 'tile' } });
    expect(walker.dip).toBeLessThan(0.01);
    walker.applyToCamera(cam);
    expect(cam.position.y).toBeGreaterThan(WATER_SURFACE);
  });
});
