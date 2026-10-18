import { describe, expect, it } from 'vitest';
import { createLevel, setTile, TILE, LIGHT, setLight, WATER_SURFACE } from '../src/core/level.js';
import { fillTiles, rectIndices } from '../src/core/ops.js';
import { getTheme } from '../src/core/themes.js';
import { buildWaterData, waterEdge } from '../src/world/water/geometry.js';
import { createLightField } from '../src/world/lighting.js';

function pool() {
  const level = createLevel({ w: 9, h: 9 });
  fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 7, z1: 7 }), TILE.FLOOR);
  fillTiles(level, rectIndices(level, { x0: 3, z0: 3, x1: 5, z1: 5 }), TILE.WATER);
  return level;
}

describe('vannflate', () => {
  it('lager 2 × 2 firkanter per vannrute', () => {
    const data = buildWaterData(pool());
    expect(data.vertexCount).toBe(9 * 4 * 4);
    expect(data.index).toHaveLength(9 * 4 * 6);
    expect(data.edge).toHaveLength(data.vertexCount);
  });

  it('kantfaktoren er 0 ved bassengkanten og 1 inne i vannet', () => {
    const level = pool();
    expect(waterEdge(level, 3, 3)).toBe(0);
    expect(waterEdge(level, 4.5, 4.5)).toBe(1);
    expect(waterEdge(level, 4, 4)).toBe(1);
    expect(waterEdge(level, 6, 4)).toBe(0);
  });

  it('ligger i lokalt XY-plan der lokal y = −verdens z', () => {
    const level = createLevel({ w: 8, h: 8 });
    setTile(level, 2, 5, TILE.WATER);
    const { pos } = buildWaterData(level);
    for (let i = 0; i < pos.length; i += 3) {
      expect(pos[i + 2]).toBe(0);
      expect(-pos[i + 1]).toBeGreaterThanOrEqual(5);
      expect(-pos[i + 1]).toBeLessThanOrEqual(6);
    }
  });

  it('trekantene vender opp (mot +Z lokalt)', () => {
    const level = createLevel({ w: 8, h: 8 });
    setTile(level, 2, 2, TILE.WATER);
    const { pos, index } = buildWaterData(level);
    for (let t = 0; t < index.length; t += 3) {
      const [a, b, c] = [index[t], index[t + 1], index[t + 2]].map((i) => pos.slice(i * 3, i * 3 + 3));
      const cz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      expect(cz).toBeGreaterThan(0);
    }
  });

  it('vannflaten får bakt lys fra armaturer', () => {
    const level = pool();
    setLight(level, 4, 4, LIGHT.ON);
    const data = buildWaterData(level, createLightField(level, getTheme('pool')));
    expect(Math.max(...data.light)).toBeGreaterThan(0.5);
  });

  it('hver vertex får vannsøylen i sin rute', () => {
    const level = createLevel({ w: 8, h: 8 });
    setTile(level, 2, 2, TILE.WATER);
    setTile(level, 3, 2, TILE.WATER);
    level.depths[2 * 8 + 3] = 25;
    const data = buildWaterData(level);
    expect(data.depth).toHaveLength(data.vertexCount);
    const perCell = data.vertexCount / 2; // ruter bygges i rekkefølge: (2,2) så (3,2)
    expect(data.depth[0]).toBeCloseTo(0.7 + WATER_SURFACE, 6);
    expect(data.depth[perCell]).toBeCloseTo(2.5 + WATER_SURFACE, 6);
  });
});
