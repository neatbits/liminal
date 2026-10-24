import { describe, expect, it } from 'vitest';
import { MeshData, faceQuad } from '../src/world/mesher.js';
import { spatialBuckets, surfaceChunks } from '../src/world/chunks.js';
import { buildSurfaces } from '../src/world/surfaces.js';
import { generateLevel } from '../src/gen/index.js';

function quads(data) {
  const out = [];
  for (let q = 0; q < data.vertexCount; q += 4) out.push(JSON.stringify([
    data.pos.slice(q * 3, (q + 4) * 3), data.uv.slice(q * 2, (q + 4) * 2),
    data.light.slice(q * 3, (q + 4) * 3), data.flick.slice(q * 4, (q + 4) * 4),
    data.index.slice(q / 4 * 6, q / 4 * 6 + 6).map((i) => i - q),
  ]));
  return out;
}

describe('romlig inndeling', () => {
  it('samler alle instanser én gang, også langs grenser og ved negative koordinater', () => {
    const items = [{ x: 0, z: 0 }, { x: 7.999, z: 0 }, { x: 8, z: 0 }, { x: -0.001, z: 0 }, { x: 0, z: 8 }];
    const groups = spatialBuckets(items, 8);
    expect(groups.map((g) => g.length)).toEqual([2, 1, 1, 1]);
    expect(groups.flat()).toEqual(items);
    expect(new Set(groups.flat()).size).toBe(items.length);
    expect(spatialBuckets([], 8)).toEqual([]);
  });

  it('beholder små flater uten oppdeling', () => {
    const data = new MeshData();
    expect(surfaceChunks(data)).toEqual([data]);
    expect(surfaceChunks(data)[0]).toBe(data);
  });

  it('beholder også firkanter som krysser en grense, med UV-er, lys, blink og omløp', () => {
    const data = new MeshData({ sample: (x, y, z, nx, ny, nz) => [x, y, z, nx, ny, nz, 0.5] });
    for (const x of [-2, 0, 15.5, 16, 32]) {
      faceQuad(data, [[x, 1, 1], [x + 1, 1, 1], [x + 1, 1, 2], [x, 1, 2]], [0, 1, 0],
        [[0.2, 0.3], [0.4, 0.3], [0.4, 0.7], [0.2, 0.7]]);
    }
    const before = quads(data), chunks = surfaceChunks(data, 16, 0);
    expect(chunks).toHaveLength(4);
    expect(chunks.flatMap(quads).sort()).toEqual(before.slice().sort());
    expect(quads(data)).toEqual(before);
    for (const part of chunks) for (const i of part.index) {
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(part.vertexCount);
    }
  });

  it.each(['pool', 'playroom'])('%s beholder hver flate uten hull, ekstra trekanter eller fargeendringer', (theme) => {
    const level = generateLevel({ theme, w: 48, h: 40, seed: 6 });
    for (const data of Object.values(buildSurfaces(level))) {
      const parts = surfaceChunks(data);
      expect(parts.reduce((n, p) => n + p.vertexCount, 0)).toBe(data.vertexCount);
      expect(parts.flatMap(quads).sort()).toEqual(quads(data).sort());
    }
  });
});
