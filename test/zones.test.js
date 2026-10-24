import { describe, expect, it } from 'vitest';
import { createLevel, setTile, setLight, TILE, LIGHT, HEIGHT_MAX } from '../src/core/level.js';
import { ceilingAt, depthAt, floorAt } from '../src/core/heights.js';
import { fillTiles, rectIndices } from '../src/core/ops.js';
import { paintZone, fillZone, floodFillZone, zoneDm, zoneLabels } from '../src/core/zones.js';

// 12 × 8 med gulv innvendig og et basseng i x 4–7, z 3–4.
function hall() {
  const level = createLevel({ w: 12, h: 8, height: 2.7 });
  fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 10, z1: 6 }), TILE.FLOOR);
  fillTiles(level, rectIndices(level, { x0: 4, z0: 3, x1: 7, z1: 4 }), TILE.WATER);
  return level;
}

describe('soner', () => {
  it('lagrer verdien i desimeter, klemt til lovlige høyder', () => {
    expect(zoneDm('ceiling', 4.04)).toBe(40);
    expect(zoneDm('ceiling', 99)).toBe(HEIGHT_MAX * 10);
    expect(zoneDm('depth', 0.01)).toBe(3);
    expect(zoneDm('depth', 0)).toBe(0);
    expect(zoneDm('ceiling', null)).toBe(0);
  });

  it('takhøyde males bare på åpne ruter, og 0 nullstiller til rommets høyde', () => {
    const level = hall();
    expect(paintZone(level, 'ceiling', [[0, 0], [1, 1], [2, 1]], 4.5)).toBe(2);
    expect(level.ceilings[0]).toBe(0);
    expect(ceilingAt(level, 1, 1)).toBe(4.5);
    expect(paintZone(level, 'ceiling', [[1, 1]], 0)).toBe(1);
    expect(ceilingAt(level, 1, 1)).toBe(2.7);
  });

  it('dybde males bare på vann', () => {
    const level = hall();
    const n = fillZone(level, 'depth', rectIndices(level, { x0: 3, z0: 3, x1: 5, z1: 4 }), 2);
    expect(n).toBe(4); // x 4–5 er vann, x 3 er gulv
    expect(depthAt(level, 4, 3)).toBe(2);
    expect(floorAt(level, 4, 3)).toBe(-2);
    expect(floorAt(level, 3, 3)).toBe(0);
    expect(floorAt(level, 7, 3)).toBe(-0.7);
  });

  it('sonen beholdes når ruten bygges om og tilbake', () => {
    const level = hall();
    paintZone(level, 'ceiling', [[2, 2]], 5);
    setTile(level, 2, 2, TILE.WALL);
    setTile(level, 2, 2, TILE.FLOOR);
    expect(ceilingAt(level, 2, 2)).toBe(5);
  });

  it('fyll endrer bare den sammenhengende sonen med samme verdi', () => {
    const level = hall();
    fillZone(level, 'ceiling', rectIndices(level, { x0: 1, z0: 1, x1: 3, z1: 6 }), 4);
    const n = floodFillZone(level, 'ceiling', 2, 2, 6);
    expect(n).toBe(18);
    expect(ceilingAt(level, 3, 6)).toBe(6);
    expect(ceilingAt(level, 4, 1)).toBe(2.7);
    // Fyll i resten av hallen (verdi 0) stopper ved sonen.
    floodFillZone(level, 'ceiling', 9, 5, 3.2);
    expect(ceilingAt(level, 9, 5)).toBe(3.2);
    expect(ceilingAt(level, 5, 3)).toBe(3.2); // vann er åpent, og hører til samme flate
    expect(ceilingAt(level, 1, 1)).toBe(6);
  });

  it('fyll på vegg gjør ingenting', () => {
    const level = hall();
    expect(floodFillZone(level, 'ceiling', 0, 0, 4)).toBe(0);
    expect(floodFillZone(level, 'depth', 2, 2, 2)).toBe(0);
  });

  it('døråpninger er lave også i en høy sone', () => {
    const level = hall();
    setTile(level, 2, 2, TILE.DOOR);
    paintZone(level, 'ceiling', [[2, 2]], 6);
    expect(ceilingAt(level, 2, 2)).toBe(2.1);
  });

  it('gir én etikett per sone, nær midten og helst uten lys', () => {
    const level = hall();
    fillZone(level, 'ceiling', rectIndices(level, { x0: 1, z0: 1, x1: 3, z1: 3 }), 4);
    setLight(level, 2, 2, LIGHT.ON);
    fillZone(level, 'depth', rectIndices(level, { x0: 4, z0: 3, x1: 7, z1: 4 }), 1.8);
    const labels = zoneLabels(level);
    expect(labels).toHaveLength(2);
    const ceil = labels.find((l) => l.layer === 'ceiling');
    expect(ceil).toMatchObject({ value: 4, cells: 9 });
    expect(Math.abs(ceil.x - 2) + Math.abs(ceil.z - 2)).toBe(1); // nabo til midten, som har lys
    expect(labels.find((l) => l.layer === 'depth')).toMatchObject({ value: 1.8, cells: 8 });
  });

  it('etiketten legges ikke oppå startpunktet', () => {
    const level = hall();
    fillZone(level, 'ceiling', rectIndices(level, { x0: 1, z0: 1, x1: 3, z1: 3 }), 4);
    level.spawn = { x: 2.5, z: 2.5, a: 0 };
    const [label] = zoneLabels(level);
    expect(Math.abs(label.x - 2) + Math.abs(label.z - 2)).toBe(1);
  });

  it('soner som bare ligger på ruter de ikke gjelder for, får ingen etikett', () => {
    const level = hall();
    fillZone(level, 'depth', rectIndices(level, { x0: 4, z0: 3, x1: 4, z1: 3 }), 2);
    setTile(level, 4, 3, TILE.FLOOR);
    expect(zoneLabels(level)).toHaveLength(0);
  });
});
