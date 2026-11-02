import { describe, expect, it } from 'vitest';
import { generateLevel } from '../src/gen/index.js';
import { OBJECTS } from '../src/core/objects.js';
import { ceilingAt } from '../src/core/heights.js';

const make = (seed, w = 56, h = 40) => {
  const rooms = [];
  const level = generateLevel({ theme: 'backrooms', w, h, seed, layout: 'halls', onPlan: (p) => rooms.push(...p) });
  return { level, halls: rooms.filter((r) => r.kind === 'hall') };
};

describe('hallene i Level 0', () => {
  it('lange, brede og tomme haller etter hverandre, med blekt tapet, sterkere lys og mindre dis', () => {
    const { level, halls } = make(3);
    expect(halls.length).toBeGreaterThan(2);
    for (const r of halls) {
      const [long, short] = r.alongX ? [r.x1 - r.x0 + 1, r.z1 - r.z0 + 1] : [r.z1 - r.z0 + 1, r.x1 - r.x0 + 1];
      expect(long).toBeGreaterThan(short * 3);
      expect(short).toBeGreaterThanOrEqual(6);
      expect(ceilingAt(level, r.x0 + 2, r.z0 + 2)).toBeGreaterThanOrEqual(2.9);
    }
    expect(level.look).toBe(1);
    expect(level.bright).toBeGreaterThan(1);
    expect(level.fog).toBeLessThan(1);
  });

  it('én rad lysrør langs midten', () => {
    const { level, halls } = make(5);
    for (const r of halls) {
      const rows = new Set();
      for (let z = r.z0; z <= r.z1; z++) for (let x = r.x0; x <= r.x1; x++) if (level.lights[z * level.w + x]) rows.add(r.alongX ? z : x);
      expect(rows.size).toBe(1);
      expect([...rows][0]).toBe(Math.floor(r.alongX ? (r.z0 + r.z1) / 2 : (r.x0 + r.x1) / 2));
    }
  });

  it('mørke vinduer, ventiler og stoler – og ingen halvvegger', () => {
    const ids = new Set();
    for (const seed of [1, 2, 3, 4]) for (const o of make(seed).level.objects) ids.add(o.id);
    expect([...ids]).toEqual(expect.arrayContaining(['darkwindow', 'floorvent', 'woodenchair']));
    expect(ids.has('halfwall')).toBe(false);
    expect(OBJECTS.darkwindow.mount).toBe('wall');
    expect(OBJECTS.floorvent.size[1]).toBeLessThan(0.05); // man går over den
  });

  it('kommer ofte i nye Level 0-nivåer', () => {
    let n = 0;
    for (let seed = 1; seed <= 60; seed++) if ((generateLevel({ theme: 'backrooms', w: 48, h: 40, seed }).layout ?? '').includes('halls')) n++;
    expect(n).toBeGreaterThan(5);
  }, 60000);
});
