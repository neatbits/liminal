import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/core/rng.js';
import { ghostSpot, facingWall } from '../src/world/window-ghost.js';

describe('spøkelset ute i kjellerbyen', () => {
  const win = { x: 8, z: 0, n: [0, 1], floor: 0 }; // vindu i nordveggen, rommet mot sør (+z)

  it('står et stykke ute, foran byen, i omtrent øyehøyde, utenfor riktig vegg', () => {
    const rand = mulberry32(3);
    for (let i = 0; i < 200; i++) {
      const s = ghostSpot(win, rand);
      expect(s.frame).toEqual([0, 1]);
      expect(s.out).toBeGreaterThanOrEqual(8);
      expect(s.out).toBeLessThanOrEqual(15); // godt foran de nærmeste tårnene (første rekke 42 m ute)
      expect(s.y).toBeGreaterThan(-2.5);
      expect(s.y).toBeLessThan(3.2);
      // Langs veggen i utsiktens koordinater (−nz, nx): her −x, nær vinduets midte.
      expect(Math.abs(s.along - -8.5)).toBeLessThanOrEqual(4);
    }
  });

  it('vet om man ser mot veggen spøkelset står utenfor', () => {
    expect(facingWall([0, -1], [0, 1])).toBe(true); // ser nordover, ut av vinduet
    expect(facingWall([0, 1], [0, 1])).toBe(false); // ryggen mot vinduet
    expect(facingWall([1, 0], [0, 1])).toBe(false); // langs veggen
    expect(facingWall([0.5, -0.5], [0, 1])).toBe(true); // på skrå mot vinduet
  });
});
