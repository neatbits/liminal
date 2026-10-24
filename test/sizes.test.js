import { describe, expect, it } from 'vitest';
import { MAX_SIZE, TILE } from '../src/core/level.js';
import { THEME_IDS } from '../src/core/themes.js';
import { doorInfo } from '../src/core/doors.js';
import { mulberry32 } from '../src/core/rng.js';
import { generateLevel } from '../src/gen/index.js';
import { nextLevel } from '../src/gen/endless.js';
import { corridorLevel } from '../src/gen/corridors.js';
import { LEVEL_SIZES, LEVEL_SIZE_IDS, getLevelSize, levelDims } from '../src/gen/sizes.js';

const exits = (level) =>
  level.tiles.reduce((n, t, i) => n + (doorInfo(level, i % level.w, (i / level.w) | 0)?.oneSided ? 1 : 0), 0);

describe('størrelsen på de uendelige nivåene', () => {
  it('skalaen går fra liten til stor, og Medium gir de gamle størrelsene', () => {
    const scales = LEVEL_SIZE_IDS.map((id) => LEVEL_SIZES[id].scale);
    expect(scales).toEqual([...scales].sort((a, b) => a - b));
    expect(levelDims('mall', 1)).toEqual([52, 38]);
    expect(levelDims('pool', 1)).toEqual([40, 36]);
    expect(getLevelSize('nonsense')).toBe(LEVEL_SIZES.medium);
  });

  it('holder seg innenfor kartets grenser', () => {
    for (const id of LEVEL_SIZE_IDS) {
      for (const theme of THEME_IDS) {
        const [w, h] = levelDims(theme, LEVEL_SIZES[id].scale);
        expect(Math.min(w, h)).toBeGreaterThanOrEqual(18);
        expect(Math.max(w, h)).toBeLessThanOrEqual(MAX_SIZE);
      }
    }
  });

  it('alle temaer kan genereres i minste og største størrelse, med gulv og utganger', () => {
    for (const id of ['small', 'huge']) {
      for (const theme of THEME_IDS) {
        const [w, h] = levelDims(theme, LEVEL_SIZES[id].scale);
        const level = generateLevel({ theme, w, h, seed: 11 });
        expect(level.tiles.filter((t) => t === TILE.FLOOR).length, `${theme} ${id}`).toBeGreaterThan(40);
        expect(exits(level), `${theme} ${id}`).toBeGreaterThan(0);
      }
    }
  });

  it('nextLevel lager større rom og lengre korridorer med større skala', () => {
    const room = (scale) => nextLevel(1, 'backrooms', mulberry32(5), null, { corridor: 0, again: 0 }, scale).level;
    const small = room(LEVEL_SIZES.small.scale);
    const huge = room(LEVEL_SIZES.huge.scale);
    expect(huge.w * huge.h).toBeGreaterThan(4 * small.w * small.h);
    const long = (scale) => corridorLevel('hotel', mulberry32(3), 'x', scale).w;
    expect(long(0.6)).toBeLessThan(long(1));
    expect(long(2.2)).toBeLessThanOrEqual(MAX_SIZE);
  });
});
