import { describe, expect, it } from 'vitest';
import { TILE } from '../src/core/level.js';
import { THEME_IDS } from '../src/core/themes.js';
import { objectPose, objectBox, OBJECTS } from '../src/core/objects.js';
import { generateLevel } from '../src/gen/index.js';
import { PLANS } from '../src/gen/furnish.js';
import { SHOP_ITEMS } from '../src/gen/mall-shops.js';

const ids = (level) => new Set(level.objects.map((o) => o.id));

describe('gjenstander i genererte rom', () => {
  it('hvert tema får bare gjenstander som hører hjemme der', () => {
    for (const theme of THEME_IDS) {
      const desk = ['desk', 'desk2', 'officechair', 'laptop', 'pc', 'tv', 'boombox', 'cassette', 'console'];
      const sets = { desk, tvrow: ['tv'], table: ['cafe', 'dinerset'], foodspot: ['kiosk', 'cafe', 'dinerset'], chairs: ['dinerchair'], arcades: ['arcade2'], poolside: ['plasticchair'], gaming: ['tv', 'tvbench', 'console', 'gamepad'], livingroom: ['tv', 'tvbench', 'console', 'gamepad', 'sofa'], tvstand: ['tv', 'tvbench'], softplay: ['softcube', 'softblock', 'softpillar', 'softbeam', 'softslab'] };
      const allowed = new Set(PLANS[theme].flatMap((p) => sets[p.set] ?? [p.id]).concat(theme === 'mall' ? SHOP_ITEMS : []));
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

  it('ender og flamingoer ligger i vannet; alt annet står på gulv og ikke i vegger', () => {
    for (const theme of ['pool', 'office', 'mall', 'playroom']) {
      const level = generateLevel({ theme, w: 44, h: 38, seed: 3 });
      for (const o of level.objects) {
        const tile = level.tiles[o.z * level.w + o.x];
        expect(tile, `${theme}: ${o.id}`).toBe(OBJECTS[o.id].floats ? TILE.WATER : TILE.FLOOR);
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

describe('gatekjøkken', () => {
  it('kjøpesenteret får kiosker med kafébord, og bordene står fritt', async () => {
    const { objectPose, objectBox } = await import('../src/core/objects.js');
    const level = generateLevel({ theme: 'mall', w: 56, h: 40, seed: 7 });
    const kiosks = level.objects.filter((o) => o.id === 'kiosk');
    const cafes = level.objects.filter((o) => o.id === 'cafe');
    expect(kiosks.length).toBeGreaterThan(0);
    expect(cafes.length).toBeGreaterThan(1);
    // Kiosken står med ryggen inntil veggen: bakkanten ligger på en rutegrense mot vegg.
    const k = kiosks[0];
    const b = objectBox(objectPose(level, k));
    const backs = [b[0], b[1], b[2], b[3]].map((v) => Math.abs(v - Math.round(v)));
    expect(Math.min(...backs)).toBeLessThan(0.05);
  });

  it('skolen og sykehuset har egne skilt (CAFETERIA, KIOSK)', async () => {
    const level = generateLevel({ theme: 'school', w: 52, h: 40, seed: 6 });
    expect(level.objects.some((o) => o.id === 'kiosk')).toBe(true);
  });
});

describe('kjellerstua', () => {
  it('har en sofa som vender mot TV-en', async () => {
    const { FACING, objectPose } = await import('../src/core/objects.js');
    const level = generateLevel({ theme: 'basement', w: 40, h: 30, seed: 12 });
    const sofa = level.objects.find((o) => o.id === 'sofa');
    const tv = level.objects.find((o) => o.id === 'tv');
    expect(sofa && tv).toBeTruthy();
    const sp = objectPose(level, sofa);
    const tp = objectPose(level, tv);
    const [fx, fz] = FACING[sp.rot];
    // Sofaens forside peker mot TV-en.
    expect(fx * (tp.x - sp.x) + fz * (tp.z - sp.z)).toBeGreaterThan(2);
    // TV-en står på en TV-benk.
    expect(level.objects.some((o) => o.id === 'tvbench')).toBe(true);
    expect(tp.y).toBeCloseTo(0.6, 2);
  });
});
