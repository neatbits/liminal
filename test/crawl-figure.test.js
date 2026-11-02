import { describe, it, expect } from 'vitest';
import { createLevel, TILE, getTile } from '../src/core/level.js';
import { MonsterAI, MONSTER } from '../src/world/monster-ai.js';
import { Autopilot } from '../src/world/autopilot.js';

/** To rom med full vegg imellom, og en krypegang (rad 6, x = 8–12) som eneste vei. */
function rooms() {
  const l = createLevel({ theme: 'backrooms', w: 22, h: 13, height: 3 });
  for (let z = 1; z < 12; z++) for (let x = 1; x < 21; x++) if (x < 8 || x > 12) l.tiles[z * l.w + x] = TILE.FLOOR;
  for (let x = 8; x <= 12; x++) l.tiles[6 * l.w + x] = TILE.CRAWL;
  l.spawn = { x: 3.5, z: 6.5, a: 0 };
  return l;
}

/** Skikkelsen på jakt fra (x, z) etter en spiller i (px, pz), i `seconds` sekunder. */
function hunt(l, [x, z], [px, pz], seconds = 12) {
  const ai = new MonsterAI(l, () => 0.5);
  ai._place([x, z]);
  ai.state = 'hunt';
  const player = { x: px, z: pz, y: 0, yaw: 0 };
  const events = [];
  for (let t = 0; t < seconds; t += 1 / 30) {
    const e = ai.update(1 / 30, player, true);
    if (e) events.push(e);
    if (e === 'vanish') break;
    expect(getTile(l, Math.floor(ai.x), Math.floor(ai.z)), 'never inside').not.toBe(TILE.CRAWL);
  }
  return { ai, events };
}

describe('the figure and crawlways', () => {
  it('goes to the opening and stops there when you are inside', () => {
    const { ai } = hunt(rooms(), [2, 2], [10.5, 6.5], 9);
    expect(Math.floor(ai.x)).toBe(7);
    expect(Math.floor(ai.z)).toBe(6);
  });

  it('takes the nearest opening: the one on your side, not around', () => {
    const { ai } = hunt(rooms(), [18, 10], [10.5, 6.5], 9);
    expect(Math.floor(ai.x)).toBe(13);
    expect(Math.floor(ai.z)).toBe(6);
  });

  it('waits a while, gives up, and stays away for a while', () => {
    const l = rooms();
    const ai = new MonsterAI(l, () => 0.5);
    ai._place([7, 6]);
    ai.state = 'hunt';
    const player = { x: 10.5, z: 6.5, y: 0, yaw: 0 };
    let t = 0;
    let event = null;
    while (t < 30 && event !== 'vanish') {
      event = ai.update(1 / 30, player, true);
      t += 1 / 30;
    }
    expect(event).toBe('vanish');
    expect(t).toBeGreaterThan(MONSTER.PATIENCE - 0.5);
    expect(t).toBeLessThan(MONSTER.PATIENCE + 1);
    expect(ai.update(1 / 30, player, true)).toBe(null); // ikke rett tilbake
    expect(ai.state).toBe('hidden');
    ai.away = 0;
    expect(ai.update(1 / 30, player, true)).toBe('hunt');
  });

  it('does not use the tunnel as a short cut when you are in the other room', () => {
    const l = rooms();
    const { ai } = hunt(l, [5, 6], [16.5, 6.5], 6);
    expect(Math.floor(ai.x)).toBeLessThan(8);
  });

  it('never appears inside', () => {
    const l = rooms();
    for (let seed = 0; seed < 30; seed++) {
      const ai = new MonsterAI(l, () => seed / 30);
      expect(ai._hunt({ x: 10.5, z: 6.5, y: 0, yaw: 0 })).toBe(true);
      expect(getTile(l, Math.floor(ai.x), Math.floor(ai.z))).toBe(TILE.FLOOR);
    }
  });

  it('still takes you just inside the opening', () => {
    const { events } = hunt(rooms(), [7, 6], [8.1, 6.5], 3);
    expect(events).toContain('caught');
  });

  it('dream walking stays out of the tunnels', () => {
    const l = rooms();
    const pilot = new Autopilot(l, () => 0.5);
    pilot._plan(3.5, 6.5);
    expect(pilot.target && getTile(l, Math.floor(pilot.target.x), Math.floor(pilot.target.z))).not.toBe(TILE.CRAWL);
    expect(pilot.target?.x ?? 0).toBeLessThan(8);
  });
});
