import { describe, expect, it } from 'vitest';
import { createLevel, setTile, TILE, LIGHT } from '../src/core/level.js';
import {
  brushCells,
  lineCells,
  normRect,
  rectIndices,
  fillTiles,
  floodFillTile,
  openRegion,
  autoLights,
  clearLights,
} from '../src/core/ops.js';

describe('ops', () => {
  it('pensel dekker riktig antall ruter rundt sentrum', () => {
    expect(brushCells(5, 5, 1)).toEqual([[5, 5]]);
    const cells = brushCells(5, 5, 3);
    expect(cells).toHaveLength(9);
    expect(cells[0]).toEqual([4, 4]);
  });

  it('linjer er sammenhengende i begge ender', () => {
    const line = lineCells(0, 0, 4, 2);
    expect(line[0]).toEqual([0, 0]);
    expect(line[line.length - 1]).toEqual([4, 2]);
    expect(line).toHaveLength(5);
  });

  it('rektangel normaliseres og klippes til rommet', () => {
    const level = createLevel({ w: 8, h: 8 });
    const r = normRect(6, 6, 2, 3);
    expect(r).toEqual({ x0: 2, z0: 3, x1: 6, z1: 6 });
    expect(rectIndices(level, { x0: -3, z0: -3, x1: 1, z1: 1 })).toHaveLength(4);
  });

  it('fyll erstatter bare den sammenhengende flaten', () => {
    const level = createLevel({ w: 8, h: 8 });
    fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 2, z1: 2 }), TILE.FLOOR);
    setTile(level, 5, 5, TILE.FLOOR);
    expect(floodFillTile(level, 1, 1, TILE.WATER)).toBe(4);
    expect(level.tiles[5 * 8 + 5]).toBe(TILE.FLOOR);
  });

  it('åpent område følger gulv, vann og dører, men ikke vegger', () => {
    const level = createLevel({ w: 8, h: 8 });
    setTile(level, 1, 1, TILE.FLOOR);
    setTile(level, 2, 1, TILE.DOOR);
    setTile(level, 3, 1, TILE.WATER);
    setTile(level, 5, 1, TILE.FLOOR);
    expect(openRegion(level, 1, 1)).toHaveLength(3);
  });

  it('autolys dekker også smale ganger utenfor mønsteret', () => {
    const level = createLevel({ w: 20, h: 9 });
    // gang langs rad 6, som ikke treffer mønsteret (z % 3 === 1)
    fillTiles(level, rectIndices(level, { x0: 1, z0: 6, x1: 18, z1: 6 }), TILE.FLOOR);
    const placed = autoLights(level, { spacing: 3, state: LIGHT.ON });
    expect(placed).toBeGreaterThanOrEqual(5);
    for (let x = 1; x <= 18; x++) {
      let near = false;
      for (let d = -3; d <= 3; d++) if (level.lights[6 * 20 + x + d] === LIGHT.ON) near = true;
      expect(near).toBe(true);
    }
  });

  it('autolys hopper over døråpninger', () => {
    const level = createLevel({ w: 9, h: 9 });
    fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 7, z1: 7 }), TILE.DOOR);
    autoLights(level, { spacing: 3, state: LIGHT.ON });
    expect(level.lights.every((l) => l === 0)).toBe(true);
  });

  it('autolys plasserer aldri lys på vegg eller søyle', () => {
    const level = createLevel({ w: 12, h: 12 });
    fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 10, z1: 10 }), TILE.FLOOR);
    setTile(level, 1, 1, TILE.PILLAR);
    autoLights(level, { spacing: 3, state: LIGHT.ON });
    for (let i = 0; i < level.tiles.length; i++) {
      if (level.tiles[i] === TILE.WALL || level.tiles[i] === TILE.PILLAR) expect(level.lights[i]).toBe(0);
    }
    expect(clearLights(level)).toBeGreaterThan(0);
    expect(level.lights.every((l) => l === 0)).toBe(true);
  });
});
