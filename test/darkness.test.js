import { describe, expect, it } from 'vitest';
import { createLevel, TILE, LIGHT } from '../src/core/level.js';
import { fillTiles, rectIndices, autoLights } from '../src/core/ops.js';
import { DOOR, setDoor } from '../src/core/doors.js';
import { mulberry32 } from '../src/core/rng.js';
import { darkZones, regions } from '../src/gen/darkness.js';
import { moodLevel } from '../src/gen/moods.js';
import { generateLevel } from '../src/gen/index.js';

const count = (level, state) => level.lights.filter((l) => l === state).length;

// Tre rom på rad med lukkede dører imellom; man starter i det første.
function building() {
  const level = createLevel({ w: 40, h: 14 });
  for (const x0 of [1, 14, 27]) fillTiles(level, rectIndices(level, { x0, z0: 1, x1: x0 + 11, z1: 12 }), TILE.FLOOR);
  for (const x of [13, 26]) {
    level.tiles[6 * level.w + x] = TILE.DOOR;
    setDoor(level, x, 6, DOOR.CLOSED);
  }
  autoLights(level, { spacing: 3, state: LIGHT.ON });
  level.spawn = { x: 3.5, z: 6.5, a: 0 };
  return level;
}

describe('mørke deler av genererte nivåer', () => {
  it('slukker alle lysene i et helt rom bak en dør, aldri i rommet man starter i', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const level = building();
      const { id } = regions(level);
      const roomOf = (x) => id[6 * level.w + x];
      const n = darkZones(level, mulberry32(seed));
      expect(n).toBeGreaterThan(0);
      const dead = Array.from(level.lights).map((l, i) => (l === LIGHT.BROKEN ? id[i] : null)).filter((r) => r !== null);
      expect(new Set(dead).size).toBe(1); // ett rom
      expect(dead).not.toContain(roomOf(3));
      expect([roomOf(20), roomOf(33)]).toContain(dead[0]);
      for (let i = 0; i < level.lights.length; i++) if (id[i] === dead[0] && level.lights[i] !== LIGHT.NONE) expect(level.lights[i]).toBe(LIGHT.BROKEN);
    }
  });

  it('lager et mørkt område med blinkende kant i en åpen hall, et stykke unna start', () => {
    const level = createLevel({ w: 48, h: 36 });
    fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 46, z1: 34 }), TILE.FLOOR);
    autoLights(level, { spacing: 3, state: LIGHT.ON });
    level.spawn = { x: 4.5, z: 4.5, a: 0 };
    const before = count(level, LIGHT.ON);
    darkZones(level, mulberry32(4));
    const broken = Array.from(level.lights).map((l, i) => (l === LIGHT.BROKEN ? i : -1)).filter((i) => i >= 0);
    expect(broken.length).toBeGreaterThan(3);
    expect(broken.length).toBeLessThan(before / 2); // en del av hallen, ikke hele
    for (const i of broken) expect(Math.hypot((i % level.w) + 0.5 - 4.5, Math.floor(i / level.w) + 0.5 - 4.5)).toBeGreaterThan(4);
  });

  it('følger stemningen: aldri i Normal eller i rommet fra editoren, oftere jo skumlere', () => {
    const darkened = (mood, home = false, theme = 'office') => {
      let n = 0;
      for (let seed = 1; seed <= 24; seed++) {
        const level = generateLevel({ theme, w: 40, h: 32, seed });
        const out = moodLevel(level, mood, mulberry32(seed), { home });
        if (out && count(out, LIGHT.BROKEN) > count(level, LIGHT.BROKEN) + 2) n++;
      }
      return n;
    };
    expect(darkened('normal')).toBe(0);
    expect(darkened('liminal', true)).toBe(0);
    const [liminal, nightmare] = [darkened('liminal'), darkened('nightmare')];
    expect(liminal).toBeGreaterThan(4);
    expect(nightmare).toBeGreaterThanOrEqual(liminal);
    // Level 0: alltid når stemningen har mørke deler, men fortsatt aldri i Normal.
    expect(darkened('liminal', false, 'backrooms')).toBe(24);
    expect(darkened('normal', false, 'backrooms')).toBe(0);
  });
});
