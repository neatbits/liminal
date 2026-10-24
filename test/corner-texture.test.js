import { describe, expect, it } from 'vitest';
import { createLevel, TILE } from '../src/core/level.js';
import { CORNER, cornerShape, setCornerAt } from '../src/core/corners.js';
import { buildSurfaces } from '../src/world/surfaces.js';
import { wallTextureMap } from '../src/world/wall-textures.js';

const FLANKS = [[[-1, 0], [0, -1]], [[0, -1], [1, 0]], [[1, 0], [0, 1]], [[0, 1], [-1, 0]]];
const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-7;

function fixture(own, k, kind, floor = 0) {
  const level = createLevel({ theme: 'playroom', w: 10, h: 10, height: 4.2 });
  for (let z = 1; z < 9; z++) for (let x = 1; x < 9; x++) level.tiles[z * level.w + x] = TILE.FLOOR;
  level.floors.fill(floor * 10);
  level.tiles[4 * level.w + 4] = own;
  if (own === TILE.FLOOR) {
    for (const [dx, dz] of FLANKS[k]) level.tiles[(4 + dz) * level.w + 4 + dx] = TILE.WALL;
  }
  setCornerAt(level, 4, 4, kind, k);
  return { level, shape: cornerShape(level, 4, 4) };
}

// Les faktiske veggquads fra hele rombygget, inkludert alle høydebånd.
function segmentQuads(mesh, a, b) {
  const out = [];
  for (let i = 0; i < mesh.vertexCount; i += 4) {
    const p = (v) => [mesh.pos[3 * v], mesh.pos[3 * v + 2]];
    if (!(near(p(i), a) && near(p(i + 1), b)) && !(near(p(i), b) && near(p(i + 1), a))) continue;
    out.push(Array.from({ length: 4 }, (_, j) => ({
      x: mesh.pos[3 * (i + j)], y: mesh.pos[3 * (i + j) + 1], z: mesh.pos[3 * (i + j) + 2],
      u: mesh.uv[2 * (i + j)], v: mesh.uv[2 * (i + j) + 1],
    })));
  }
  return out;
}

describe('teksturer langs formede vegger', () => {
  for (const own of [TILE.FLOOR, TILE.WALL]) {
    for (const kind of [CORNER.ROUND, CORNER.ANGLED]) {
      for (let k = 0; k < 4; k++) {
        it(`${own === TILE.FLOOR ? 'innvendig' : 'utvendig'}, form ${kind}, retning ${k}: sammenhengende mønster i meterskala`, () => {
          const { level, shape } = fixture(own, k, kind, 0.8);
          const mesh = buildSurfaces(level, null).wall;
          const seen = new Map();
          const towards = own === TILE.FLOOR ? shape.Q : shape.K;
          for (let j = 0; j + 1 < shape.boundary.length; j++) {
            const [a, b] = [shape.boundary[j], shape.boundary[j + 1]];
            const quads = segmentQuads(mesh, a, b);
            expect(quads.length).toBeGreaterThan(1);
            for (const quad of quads) {
              const [L, R] = quad;
              const len = Math.hypot(R.x - L.x, R.z - L.z);
              expect(R.u - L.u).toBeCloseTo(len, 8); // mønsteret går mot høyre, uten strekk
              const nx = -(R.z - L.z) / len;
              const nz = (R.x - L.x) / len;
              expect(nx * (towards[0] - L.x) + nz * (towards[1] - L.z)).toBeGreaterThan(0);
              for (const v of quad) {
                expect(v.v).toBeCloseTo(v.y - 0.8, 8); // brystningen følger hevet gulv
                const key = [v.x, v.y, v.z].map((c) => c.toFixed(7)).join(',');
                if (seen.has(key)) expect(v.u).toBeCloseTo(seen.get(key), 8); // ingen hopp ved segmentgrensen
                else seen.set(key, v.u);
              }
            }
          }
          // Mønsteret må også treffe de rette veggene uten hopp (f.eks. en sol skåret i to).
          for (const endpoint of [shape.boundary[0], shape.boundary.at(-1)]) {
            let joined = 0;
            for (let i = 0; i < mesh.vertexCount; i += 4) {
              const [x0, y, z0, x1, z1] = [mesh.pos[3 * i], mesh.pos[3 * i + 1], mesh.pos[3 * i + 2], mesh.pos[3 * (i + 1)], mesh.pos[3 * (i + 1) + 2]];
              if (y !== shape.fy || (Math.abs(x1 - x0) > 1e-7 && Math.abs(z1 - z0) > 1e-7)) continue;
              for (const v of [i, i + 1]) {
                const p = [mesh.pos[3 * v], mesh.pos[3 * v + 2]];
                if (!near(p, endpoint)) continue;
                const key = [p[0], y, p[1]].map((c) => c.toFixed(7)).join(',');
                expect(mesh.uv[2 * v]).toBeCloseTo(seen.get(key), 8);
                joined++;
              }
            }
            expect(joined).toBe(1);
          }
        });
      }
    }
  }

  it('rette vegger uten formede hjørner beholder sine opprinnelige UV-er', () => {
    const { level } = fixture(TILE.FLOOR, 0, CORNER.NONE);
    const map = wallTextureMap(level);
    expect(map([1, 1], [2, 1])).toBeUndefined();
    const wall = buildSurfaces(level, null).wall;
    for (let i = 0; i < wall.vertexCount; i += 4) {
      const [dx, dz] = [wall.pos[3 * (i + 1)] - wall.pos[3 * i], wall.pos[3 * (i + 1) + 2] - wall.pos[3 * i + 2]];
      for (let j = i; j < i + 4; j++) expect(wall.uv[2 * j]).toBeCloseTo(wall.pos[3 * j] * dx + wall.pos[3 * j + 2] * dz, 8);
    }
  });

  it('lukkede avrundede rom legger den nødvendige avslutningsskjøten på en rett vegg', () => {
    const level = createLevel({ theme: 'playroom', w: 10, h: 10 });
    for (let z = 1; z < 9; z++) for (let x = 1; x < 9; x++) level.tiles[z * level.w + x] = TILE.FLOOR;
    const corners = [[1, 1, 0], [8, 1, 1], [8, 8, 2], [1, 8, 3]];
    for (const [x, z, k] of corners) setCornerAt(level, x, z, CORNER.ROUND, k);
    const map = wallTextureMap(level);
    for (const [x, z] of corners) {
      const path = [...cornerShape(level, x, z).boundary].reverse();
      let prev;
      for (let i = 0; i + 1 < path.length; i++) {
        const [u0, u1] = map(path[i], path[i + 1]);
        if (prev !== undefined) expect(u0).toBeCloseTo(prev, 8);
        prev = u1;
      }
    }
  });
});
