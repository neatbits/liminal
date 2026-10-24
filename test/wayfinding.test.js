import { describe, expect, it } from 'vitest';
import { createLevel, TILE } from '../src/core/level.js';
import { generateLevel } from '../src/gen/index.js';
import { buildWayfinding } from '../src/world/wayfinding.js';
import { paintWindows } from '../src/core/windows.js';

describe('skilt i temarom', () => {
  it.each(['mall', 'school', 'playroom'])('%s får sparsomme skilt med gyldig lys og atlas-koordinater', (theme) => {
    const level = generateLevel({ theme, w: 52, h: 40, seed: 6 });
    const data = buildWayfinding(level, { sample: () => [0.3, 0.4, 0.5, 0, 0, 0, 0] });
    expect(data.quadCount).toBeGreaterThan(0);
    expect(data.quadCount).toBeLessThanOrEqual(24);
    expect(data.pos.every(Number.isFinite)).toBe(true);
    expect(data.uv.every((v) => v >= 0 && v <= 1)).toBe(true);
    expect(data.light.slice(0, 3)).toEqual([0.3, 0.4, 0.5]);
    expect(buildWayfinding(level, null).pos).toEqual(data.pos);
  });

  it('tegner aldri skilt på vinduer eller legger dekor til andre temaer', () => {
    const level = createLevel({ theme: 'playroom', w: 16, h: 16 });
    const walls = [];
    for (let z = 1; z < 15; z++) for (let x = 1; x < 15; x++) level.tiles[z * 16 + x] = TILE.FLOOR;
    for (let k = 1; k < 15; k++) walls.push([k, 0], [k, 15], [0, k], [15, k]);
    paintWindows(level, walls, true);
    expect(buildWayfinding(level, null).vertexCount).toBe(0);
    level.theme = 'office';
    level.meta.fill(0);
    expect(buildWayfinding(level, null).vertexCount).toBe(0);
  });
});
