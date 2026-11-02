import { describe, expect, it } from 'vitest';
import { createLevel, TILE } from '../src/core/level.js';
import { fillRect } from '../src/gen/util.js';
import { cellHeights } from '../src/world/lighting.js';
import { reveal, seenWall, SIGHT } from '../src/world/discover.js';

/** To rom med en vegg imellom (x = 10) og en åpning nederst (z = 8). */
function rooms() {
  const level = createLevel({ theme: 'backrooms', w: 22, h: 10, height: 2.7 });
  fillRect(level, 1, 1, 9, 8, TILE.FLOOR);
  fillRect(level, 11, 1, 20, 8, TILE.FLOOR);
  fillRect(level, 10, 8, 10, 8, TILE.FLOOR);
  return level;
}

describe('det man har sett (kartet)', () => {
  it('ser rommet man står i, men ikke gjennom veggen', () => {
    const level = rooms();
    const seen = new Uint8Array(level.w * level.h);
    expect(reveal(level, seen, 5.5, 4.5, cellHeights(level))).toBeGreaterThan(30);
    expect(seen[4 * level.w + 7]).toBe(1);
    expect(seen[2 * level.w + 13]).toBe(0); // bak veggen
  });

  it('husker det, og teller bare nye ruter', () => {
    const level = rooms();
    const seen = new Uint8Array(level.w * level.h);
    const heights = cellHeights(level);
    reveal(level, seen, 5.5, 4.5, heights);
    expect(reveal(level, seen, 5.5, 4.5, heights)).toBe(0);
  });

  it('ikke lenger enn man ser', () => {
    const level = createLevel({ theme: 'backrooms', w: 40, h: 6, height: 2.7 });
    fillRect(level, 1, 1, 38, 4, TILE.FLOOR);
    const seen = new Uint8Array(level.w * level.h);
    reveal(level, seen, 2.5, 2.5, cellHeights(level));
    expect(seen[2 * level.w + 2 + SIGHT + 2]).toBe(0);
    expect(seen[2 * level.w + 2 + SIGHT - 2]).toBe(1);
  });

  it('veggene rundt det man har sett, tegnes', () => {
    const level = rooms();
    const seen = new Uint8Array(level.w * level.h);
    reveal(level, seen, 5.5, 4.5, cellHeights(level));
    expect(seenWall(level, seen, 10, 4)).toBe(true);
    expect(seenWall(level, seen, 21, 4)).toBe(false);
    expect(seenWall(level, seen, 5, 4)).toBe(false); // gulv, ikke vegg
  });
});
