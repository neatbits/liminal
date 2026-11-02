import { describe, it, expect } from 'vitest';
import { LIGHT, TILE, getTile } from '../src/core/level.js';
import { flickerGroup } from '../src/world/lighting.js';
import { menuRoom, menuShot } from '../src/gen/menu-room.js';

const lamps = (level) => {
  const out = [];
  level.lights.forEach((state, i) => state !== LIGHT.NONE && out.push({ state, x: i % level.w, z: Math.floor(i / level.w) }));
  return out;
};

describe('rommet bak hovedmenyen', () => {
  it('er likt hver gang', () => {
    expect(Array.from(menuRoom().tiles)).toEqual(Array.from(menuRoom().tiles));
    expect(Array.from(menuRoom().lights)).toEqual(Array.from(menuRoom().lights));
  });

  it('har lys som blinker i ulike grupper, og mørke innerst', () => {
    const all = lamps(menuRoom());
    const flicker = all.filter((l) => l.state === LIGHT.FLICKER);
    expect(new Set(flicker.map((l) => flickerGroup(l.x, l.z))).size).toBe(4); // ikke i takt
    expect(flicker.some((l) => l.x > 36)).toBe(true); // gangen innerst
    expect(all.filter((l) => l.x > 25 && l.state === LIGHT.ON)).toEqual([]);
  });

  it('har lys bare over gulv', () => {
    const level = menuRoom();
    for (const { x, z } of lamps(level)) expect(getTile(level, x, z)).toBe(TILE.FLOOR);
  });

  it('kameraet holder seg på gulvet, under taket og borte fra søylene', () => {
    const level = menuRoom();
    for (let t = 0; t < 200; t += 0.5) {
      for (const [px, py] of [[-1, -1], [1, 1]]) {
        const { x, y, z } = menuShot(t, px, py);
        expect(y).toBeLessThan(level.height - 0.3);
        for (const [dx, dz] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) {
          expect(getTile(level, Math.floor(x + dx), Math.floor(z + dz))).toBe(TILE.FLOOR);
        }
      }
    }
  });

  it('kameraet ser innover hallen, med hallen til høyre for midten', () => {
    const { yaw } = menuShot(0);
    expect(yaw).toBeGreaterThan(-Math.PI / 2); // -π/2 er rett langs hallen
    expect(yaw).toBeLessThan(-Math.PI / 2 + 0.4);
  });
});
