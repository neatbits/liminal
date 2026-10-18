import { describe, expect, it } from 'vitest';
import { createLevel, TILE } from '../src/core/level.js';
import { fillTiles, rectIndices } from '../src/core/ops.js';
import { DOOR } from '../src/core/doors.js';
import { mulberry32 } from '../src/core/rng.js';
import { getTheme } from '../src/core/themes.js';
import { Autopilot, exitSpots, DRIFT } from '../src/world/autopilot.js';
import { Walker } from '../src/view3d/walker.js';

// To rom med en åpning imellom, et basseng i det første og en dør til ingensteds i det andre.
function rooms() {
  const level = createLevel({ w: 31, h: 13 });
  fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 29, z1: 11 }), TILE.FLOOR);
  fillTiles(level, rectIndices(level, { x0: 15, z0: 1, x1: 15, z1: 11 }), TILE.WALL);
  level.tiles[6 * 31 + 15] = TILE.FLOOR;
  fillTiles(level, rectIndices(level, { x0: 5, z0: 3, x1: 9, z1: 8 }), TILE.WATER);
  level.tiles[6 * 31 + 30] = TILE.DOOR; // i ytterveggen mot øst
  level.meta[6 * 31 + 30] = DOOR.CLOSED;
  return level;
}

/** Lar autopiloten styre en gåer i `seconds` sekunder; returnerer gåeren og en eventuell utgang. */
function drive(level, seconds, seed = 1) {
  const pilot = new Autopilot(level, mulberry32(seed));
  const walker = new Walker();
  walker.reset(level, { x: 2.5, z: 2.5, a: 0 });
  const theme = getTheme('backrooms');
  let exit = null;
  let wet = false;
  for (let t = 0; t < seconds && !exit; t += 1 / 30) {
    const step = pilot.update(1 / 30, walker);
    if (!step) break;
    if (step.exit) exit = step.exit;
    else {
      if (step.yaw !== null) walker.yaw = step.yaw;
      walker.update(1 / 30, { forward: step.forward, strafe: 0, running: false, consumeLook: () => [0, 0] }, level, theme);
      wet ||= level.tiles[Math.floor(walker.z) * level.w + Math.floor(walker.x)] === TILE.WATER;
    }
  }
  return { walker, exit, wet, pilot };
}

describe('drømmegange', () => {
  it('finner utgangene og ruten foran dem', () => {
    const [e] = exitSpots(rooms());
    expect([e.x, e.z, e.fx, e.fz]).toEqual([30, 6, 29, 6]);
  });

  it('glir rundt i rommene uten å gå ut i bassenget', () => {
    const { walker, wet, pilot } = drive(rooms(), 60);
    expect(wet).toBe(false);
    expect(pilot.legs).toBeGreaterThan(1);
    expect(walker.distance).toBeGreaterThan(20);
  });

  it('går før eller siden til en dør til ingensteds', () => {
    const { exit } = drive(rooms(), 400, 3);
    expect(exit).not.toBeNull();
    expect(exit.x).toBe(30);
  });

  it('går sakte – omtrent 0,9 m/s', () => {
    const { walker } = drive(rooms(), 10, 2);
    expect(walker.distance / 10).toBeLessThan(1.6 * DRIFT.SPEED + 0.1);
  });
});
