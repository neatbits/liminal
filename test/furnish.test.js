import { describe, expect, it } from 'vitest';
import { TILE } from '../src/core/level.js';
import { THEME_IDS } from '../src/core/themes.js';
import { objectPose, objectBox, OBJECTS } from '../src/core/objects.js';
import { generateLevel } from '../src/gen/index.js';
import { PLANS } from '../src/gen/furnish.js';

const ids = (level) => new Set(level.objects.map((o) => o.id));

describe('gjenstander i genererte rom', () => {
  it('hvert tema får bare gjenstander som hører hjemme der', () => {
    for (const theme of THEME_IDS) {
      const allowed = new Set(PLANS[theme].flatMap((p) => (p.set === 'desk' ? ['desk', 'laptop', 'tv', 'boombox'] : p.set === 'tvrow' ? ['tv'] : [p.id])));
      for (const seed of [1, 2]) {
        for (const id of ids(generateLevel({ theme, w: 44, h: 38, seed }))) expect(allowed.has(id), `${theme}: ${id}`).toBe(true);
      }
    }
  });

  it('kontoret får skrivebord, ofte med noe oppå; kjelleren alltid et TV', () => {
    const office = generateLevel({ theme: 'office', w: 44, h: 38, seed: 1 });
    const desks = office.objects.filter((o) => o.id === 'desk');
    expect(desks.length).toBeGreaterThan(3);
    const onTop = office.objects.filter((o) => o.id !== 'desk' && objectPose(office, o).y > 0.5);
    expect(onTop.length).toBeGreaterThan(0);
    expect(ids(generateLevel({ theme: 'basement', w: 36, h: 28, seed: 4 })).has('tv')).toBe(true);
  });

  it('ender ligger i vannet; alt annet står på gulv og ikke i vegger', () => {
    for (const theme of ['pool', 'office', 'mall', 'playroom']) {
      const level = generateLevel({ theme, w: 44, h: 38, seed: 3 });
      for (const o of level.objects) {
        const tile = level.tiles[o.z * level.w + o.x];
        expect(tile, `${theme}: ${o.id}`).toBe(o.id === 'duck' ? TILE.WATER : TILE.FLOOR);
        const b = objectBox(objectPose(level, o));
        for (const [x, z] of [[b[0] + 0.03, b[1] + 0.03], [b[2] - 0.03, b[3] - 0.03]]) {
          expect(level.tiles[Math.floor(z) * level.w + Math.floor(x)]).not.toBe(TILE.WALL);
        }
      }
    }
  });

  it('ingenting står rett ved startpunktet, og samme frø gir samme gjenstander', () => {
    const a = generateLevel({ theme: 'office', w: 40, h: 36, seed: 8 });
    const b = generateLevel({ theme: 'office', w: 40, h: 36, seed: 8 });
    expect(a.objects).toEqual(b.objects);
    for (const o of a.objects) {
      if (OBJECTS[o.id].floats) continue;
      expect(Math.hypot(o.x + 0.5 - a.spawn.x, o.z + 0.5 - a.spawn.z)).toBeGreaterThanOrEqual(2.9);
    }
  });
});
