import { describe, expect, it } from 'vitest';
import { createLevel, TILE } from '../src/core/level.js';
import { mulberry32 } from '../src/core/rng.js';
import { paintWindows, windows } from '../src/core/windows.js';
import { addWindows } from '../src/gen/windows.js';

function hall(theme) {
  const level = createLevel({ theme, w: 64, h: 48 });
  for (let z = 1; z < 47; z++) for (let x = 1; x < 63; x++) level.tiles[z * 64 + x] = TILE.FLOOR;
  return level;
}

describe('sparsomme automatiske vinduer', () => {
  // Tidligere sannsynlighet × andelen mønsterplasser. Sammenlign over flere frø,
  // ikke mot et bestemt antall i ett rom, som fortsatt skal kunne variere.
  it.each([['office', 0.85 * 2 / 3], ['playroom', 0.8 / 2],
    ['school', 0.9 * 3 / 4], ['ward', 0.85 / 2]])('%s får omtrent en fjerdedel av tidligere tetthet', (theme, oldDensity) => {
    let total = 0;
    for (let seed = 1; seed <= 40; seed++) total += addWindows(hall(theme), mulberry32(seed));
    const density = total / (40 * (62 + 46) * 2);
    expect(density / oldDensity).toBeGreaterThan(0.21);
    expect(density / oldDensity).toBeLessThan(0.29);
  });

  it('beholder håndmalte vinduer og genererer identisk med samme frø', () => {
    const a = hall('office');
    const b = hall('office');
    const cells = Array.from({ length: 12 }, (_, x) => [x + 1, 0]);
    paintWindows(a, cells, true);
    paintWindows(b, cells, true);
    addWindows(a, mulberry32(3));
    addWindows(b, mulberry32(3));
    expect(a.meta).toEqual(b.meta);
    expect(a.sky).toBe(b.sky);
    for (const [x, z] of cells) expect(windows(a).some((win) => win.x === x && win.z === z)).toBe(true);
  });
});
