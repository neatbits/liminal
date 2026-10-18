import { describe, expect, it } from 'vitest';
import { createLevel, TILE } from '../src/core/level.js';
import { fillTiles, rectIndices } from '../src/core/ops.js';
import { DOOR } from '../src/core/doors.js';
import { mulberry32 } from '../src/core/rng.js';
import { MonsterAI, MONSTER, distanceMap, passable } from '../src/world/monster-ai.js';
import { Blackout } from '../src/view3d/events.js';

// To rom (x 1–14 og x 16–29) med en døråpning i veggen mellom dem (x 15, z 6).
function rooms(doorState = DOOR.NONE) {
  const level = createLevel({ w: 31, h: 13 });
  fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 29, z1: 11 }), TILE.FLOOR);
  fillTiles(level, rectIndices(level, { x0: 15, z0: 1, x1: 15, z1: 11 }), TILE.WALL);
  level.tiles[6 * 31 + 15] = TILE.DOOR;
  level.meta[6 * 31 + 15] = doorState;
  return level;
}

const player = (x, z, yaw = 0) => ({ x, z, y: 0, yaw });

describe('monsteret – veien fram', () => {
  it('finner veien gjennom døråpningen, men ikke gjennom en lukket dør', () => {
    const open = distanceMap(rooms(), 3, 6);
    expect(open[6 * 31 + 25]).toBeGreaterThan(20);
    expect(open[6 * 31 + 25]).toBeLessThan(25);
    const closed = distanceMap(rooms(DOOR.CLOSED), 3, 6);
    expect(closed[6 * 31 + 25]).toBe(Infinity);
    expect(passable(rooms(DOOR.CLOSED), 15, 6)).toBe(false);
  });
});

describe('monsteret – oppførsel', () => {
  it('viser seg rett fram i lyset, og forsvinner når man går mot det', () => {
    const level = rooms();
    const m = new MonsterAI(level, mulberry32(3));
    m.lurkIn = 0;
    const p = player(2.5, 6.5, -Math.PI / 2); // ser mot +x
    expect(m.update(0.1, p, false)).toBe('appear');
    expect(m.x - p.x).toBeGreaterThan(MONSTER.LURK[0] - 1);
    expect(m.update(0.1, player(m.x - 3, m.z), false)).toBe('vanish');
  });

  it('i mørket kommer det etter en og tar en som bare går', () => {
    const level = rooms();
    const m = new MonsterAI(level, mulberry32(5));
    let p = player(3.5, 6.5);
    expect(m.update(0.05, p, true)).toBe('hunt');
    let caught = false;
    for (let t = 0; t < 30 && !caught; t += 0.05) caught = m.update(0.05, p, true) === 'caught';
    expect(caught).toBe(true);
  });

  it('en lukket dør stopper det', () => {
    const level = rooms(DOOR.CLOSED);
    const m = new MonsterAI(level, mulberry32(5));
    const p = player(3.5, 6.5);
    m.update(0.05, p, true);
    m.x = 25.5; // på den andre siden av døren
    m.z = 6.5;
    let caught = false;
    for (let t = 0; t < 20; t += 0.05) caught ||= m.update(0.05, p, true) === 'caught';
    expect(caught).toBe(false);
  });

  it('når lyset kommer tilbake, er det borte', () => {
    const m = new MonsterAI(rooms(), mulberry32(1));
    m.update(0.05, player(3.5, 6.5), true);
    expect(m.update(0.05, player(3.5, 6.5), false)).toBe('vanish');
    expect(m.visible).toBe(false);
  });
});

describe('monsteret uten jumpscares', () => {
  it('kommer nær, men trekker seg unna i stedet for å ta en', () => {
    const m = new MonsterAI(rooms(), mulberry32(5));
    m.gentle = true;
    const p = player(3.5, 6.5);
    m.update(0.05, p, true);
    const events = [];
    for (let t = 0; t < 30; t += 0.05) {
      const e = m.update(0.05, p, true);
      if (e) events.push(e);
    }
    expect(events).not.toContain('caught');
    expect(events).toContain('vanish');
  });
});

describe('strømbrudd i Scary mode', () => {
  it('kan vare lenger', () => {
    const b = new Blackout(mulberry32(2), { first: [1, 1], dark: [15, 15] });
    let darkFor = 0;
    for (let t = 0; t < 30; t += 0.05) {
      b.update(0.05);
      if (b.phase === 'dark') darkFor += 0.05;
    }
    expect(darkFor).toBeGreaterThan(14);
  });
});
