import { describe, expect, it } from 'vitest';
import { createLevel, TILE } from '../src/core/level.js';
import { fillTiles, rectIndices } from '../src/core/ops.js';
import { mulberry32 } from '../src/core/rng.js';
import { MonsterAI, MONSTER, distanceMap } from '../src/world/monster-ai.js';
import { MOODS } from '../src/gen/moods.js';
import { Darkness } from '../src/view3d/nightmare.js';

function hall() {
  const level = createLevel({ w: 60, h: 7 });
  fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 58, z1: 5 }), TILE.FLOOR);
  return level;
}
const player = (x, z) => ({ x, z, y: 0, yaw: 0 });

describe('Nightmare', () => {
  it('har oftere og lengre strømbrudd enn Uncanny, flere mørke deler og en jakt som koster', () => {
    const [u, n] = [MOODS.uncanny, MOODS.nightmare];
    expect(n.blackout.every[1]).toBeLessThan(u.blackout.every[0]);
    expect(n.blackout.dark[0]).toBeGreaterThan(u.blackout.dark[1]);
    expect(n.blackout.first[1]).toBeLessThan(u.blackout.first[0]);
    expect(n.dark.zones).toBeGreaterThan(u.dark.zones);
    expect(n.chase).toMatchObject({ inDarkness: true, caught: 'restart' });
    expect(n.chase.speed).toBeGreaterThan(MONSTER.SPEED);
    expect(n.chase.speed).toBeLessThan(3.1); // løping (view3d/walker.js) redder deg fortsatt
    expect(u.chase).toBeUndefined(); // Uncanny: det viser seg bare
  });

  it('monsteret dukker opp nærmere og tar igjen en som går mye raskere', () => {
    const time = (chase) => {
      const m = new MonsterAI(hall(), mulberry32(4));
      m.chase = chase;
      const p = player(30.5, 3.5);
      m.update(0.05, p, true);
      const d = distanceMap(m.level, 30, 3)[Math.floor(m.z) * m.level.w + Math.floor(m.x)];
      for (let t = 0; t < 60; t += 0.05) if (m.update(0.05, p, true) === 'caught') return { d, t };
      return { d, t: Infinity };
    };
    const calm = time({}), night = time(MOODS.nightmare.chase);
    expect(night.d).toBeLessThanOrEqual(MOODS.nightmare.chase.near[1] + 1);
    expect(night.t).toBeLessThan(calm.t);
  });

  it('mørket i øyehøyde regnes med hysterese, så det ikke blafrer ved grensen', () => {
    let light = 0.03;
    const viewer = { walk: { walker: { x: 3.3, z: 4.1, floorY: 0 } }, world: { field: { sample: () => [light, light, light, 0, 0, 0, 0] } } };
    const d = new Darkness(viewer);
    expect(d.update()).toBe(true);
    light = 0.07;
    expect(d.update()).toBe(true); // fortsatt mørkt til det er tydelig lysere
    light = 0.1;
    expect(d.update()).toBe(false);
    light = 0.07;
    expect(d.update()).toBe(false); // og lyst til det er tydelig mørkere
    expect(new Darkness({ walk: viewer.walk, world: null }).update()).toBe(false);
  });
});
