import { describe, expect, it } from 'vitest';
import { TILE, createLevel } from '../src/core/level.js';
import { fillRect } from '../src/gen/util.js';
import { Trail } from '../src/world/monster-trail.js';
import { MonsterAI } from '../src/world/monster-ai.js';
import { MOODS } from '../src/gen/moods.js';

/** To rom med en åpning i veggen mellom dem (x = 10). */
function rooms() {
  const level = createLevel({ theme: 'backrooms', w: 24, h: 14, height: 2.7, name: 't' });
  fillRect(level, 1, 1, 9, 12, TILE.FLOOR);
  fillRect(level, 11, 1, 22, 12, TILE.FLOOR);
  fillRect(level, 10, 11, 10, 12, TILE.FLOOR);
  return level;
}

describe('sporet: hvor monsteret tror du er', () => {
  const chase = { sense: 3, sight: 10 };

  it('uten sense vet det alltid hvor du er', () => {
    const t = new Trail();
    const level = rooms();
    t.follow(0.1, level, { x: 3, z: 3 }, { x: 15, z: 3 }, {});
    expect(t.follow(0.1, level, { x: 3, z: 3 }, { x: 20, z: 3 }, {})).toEqual({ x: 20, z: 3 });
  });

  it('bak en vegg holder det seg til det gamle sporet, til det er tid for nytt', () => {
    const t = new Trail();
    const level = rooms();
    const from = { x: 5, z: 3 };
    t.follow(0.1, level, from, { x: 15, z: 3 }, chase);
    expect(t.follow(2.5, level, from, { x: 20, z: 3 }, chase)).toEqual({ x: 15, z: 3 });
    expect(t.follow(0.6, level, from, { x: 20, z: 3 }, chase)).toEqual({ x: 20, z: 3 });
  });

  it('ser det deg, følger det deg med en gang', () => {
    const t = new Trail();
    const level = rooms();
    const from = { x: 13, z: 3 };
    t.follow(0.1, level, from, { x: 15, z: 3 }, chase);
    expect(t.follow(0.1, level, from, { x: 18, z: 3 }, chase)).toEqual({ x: 18, z: 3 });
  });

  it('langt unna ser det deg ikke, selv med fri sikt', () => {
    const t = new Trail();
    const level = rooms();
    const from = { x: 11.5, z: 3 };
    t.follow(0.1, level, from, { x: 12, z: 3 }, chase);
    expect(t.follow(0.1, level, from, { x: 22, z: 3 }, chase)).toEqual({ x: 12, z: 3 });
  });
});

describe('Nightmare: monsteret går etter sporet', () => {
  it('blir stående der du var, når du ristet det av deg', () => {
    const level = rooms();
    const m = new MonsterAI(level);
    m.chase = { sense: 100, sight: 10 };
    const hidden = { x: 3.5, z: 3.5, y: 0, yaw: 0 };
    m.update(0.05, hidden, true);
    Object.assign(m, { x: 16.5, z: 3.5, y: 0 });
    m.trail.clear();
    m.update(0.05, { x: 20.5, z: 3.5, y: 0, yaw: 0 }, true); // sett her
    for (let t = 0; t < 8; t += 0.05) m.update(0.05, hidden, true); // borte bak veggen, utenfor synsvidde
    expect(Math.hypot(m.x - 20.5, m.z - 3.5)).toBeLessThan(0.5);
  });

  it('står man stille, finner det deg likevel', () => {
    const m = new MonsterAI(rooms());
    m.chase = MOODS.nightmare.chase;
    const p = { x: 3.5, z: 3.5, y: 0, yaw: 0 };
    m.update(0.05, p, true);
    Object.assign(m, { x: 20.5, z: 3.5, y: 0 });
    let caught = false;
    for (let t = 0; t < 40 && !caught; t += 0.05) caught = m.update(0.05, p, true) === 'caught';
    expect(caught).toBe(true);
  });

  it('sporet glemmes når lyset kommer tilbake', () => {
    const m = new MonsterAI(rooms());
    m.chase = MOODS.nightmare.chase;
    const p = { x: 3.5, z: 3.5, y: 0, yaw: 0 };
    m.update(0.05, p, true);
    m.update(0.05, p, true);
    m.update(0.05, p, false);
    expect(m.trail.at).toBe(null);
  });
});
