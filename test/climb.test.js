import { describe, expect, it } from 'vitest';
import { createLevel, setTile, TILE } from '../src/core/level.js';
import { fillTiles, rectIndices } from '../src/core/ops.js';
import { fillZone } from '../src/core/zones.js';
import { placeStairs } from '../src/core/stairs.js';
import { getTheme } from '../src/core/themes.js';
import { moveCircle, climbBase, STEP_UP } from '../src/world/collision.js';
import { buildSurfaces } from '../src/world/surfaces.js';
import { stepProfile } from '../src/world/stairs.js';
import { Walker } from '../src/view3d/walker.js';

// Hall 16 × 8 der x 10–14 er en plattform i 1,2 m.
function platform() {
  const level = createLevel({ w: 16, h: 8, height: 2.6 });
  fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 14, z1: 6 }), TILE.FLOOR);
  fillZone(level, 'floor', rectIndices(level, { x0: 10, z0: 1, x1: 14, z1: 6 }), 1.2);
  return level;
}

const walkTo = (level, x, z, tx) => moveCircle(level, x, z, tx - x, 0, 0.28, true)[0];

describe('klatring', () => {
  it('man kommer ikke rett opp på en høy plattform, og rekkverket hindrer fall ned', () => {
    const level = platform();
    expect(walkTo(level, 5.5, 3.5, 12.5)).toBeLessThan(10);
    expect(walkTo(level, 12.5, 3.5, 5.5)).toBeCloseTo(10 + 0.08 + 0.28, 6);
  });

  it('fra en lav kant uten rekkverk går man rett ned', () => {
    const level = platform();
    fillZone(level, 'floor', rectIndices(level, { x0: 10, z0: 1, x1: 14, z1: 6 }), 0.4);
    expect(walkTo(level, 12.5, 3.5, 5.5)).toBeCloseTo(5.5, 6);
  });

  it('lave kanter går man rett opp på', () => {
    const level = platform();
    fillZone(level, 'floor', rectIndices(level, { x0: 10, z0: 1, x1: 14, z1: 6 }), STEP_UP - 0.05);
    expect(walkTo(level, 5.5, 3.5, 12.5)).toBeCloseTo(12.5, 6);
  });

  it('trappen leder opp på plattformen', () => {
    const level = platform();
    placeStairs(level, [8, 3], [9, 3]);
    expect(walkTo(level, 5.5, 3.5, 12.5)).toBeCloseTo(12.5, 6);
  });

  it('man kommer alltid opp av bassenget', () => {
    const level = platform();
    fillTiles(level, rectIndices(level, { x0: 3, z0: 1, x1: 6, z1: 6 }), TILE.WATER);
    expect(climbBase(level, 4.5, 3.5)).toBe(0);
    expect(walkTo(level, 4.5, 3.5, 8.5)).toBeCloseTo(8.5, 6);
  });

  it('gangen følger trappen oppover', () => {
    const level = platform();
    placeStairs(level, [8, 3], [9, 3]);
    const walker = new Walker();
    walker.reset(level, { x: 6.5, z: 3.5, a: -Math.PI / 2 }); // mot +x
    const input = { forward: 1, strafe: 0, running: false, consumeLook: () => [0, 0] };
    for (let i = 0; i < 360 && walker.x < 12; i++) walker.update(1 / 60, input, level, getTheme('basement'));
    expect(walker.x).toBeGreaterThan(11);
    expect(walker.floorY).toBeGreaterThan(1.0);
  });
});

describe('flater med gulvhøyder', () => {
  it('trappen får inntrinn og opptrinn i gulvmaterialet', () => {
    const level = platform();
    placeStairs(level, [8, 3], [9, 3]);
    const { n } = stepProfile(level, 8, 3);
    expect(n).toBe(3); // 0,6 m per rute / 0,18 m ≈ 3 trinn
    const flat = buildSurfaces(platform(), null, { subdivide: 1 });
    const stairs = buildSurfaces(level, null, { subdivide: 1 });
    // To trapperuter erstatter to gulvruter: 2 × (3 inntrinn + 3 opptrinn) i stedet for 2 gulv.
    expect(stairs.floor.quadCount - flat.floor.quadCount).toBe(2 * 6 - 2);
  });

  it('kanten av plattformen får en loddrett flate vendt ned mot det lave gulvet', () => {
    const s = buildSurfaces(platform(), null, { subdivide: 1 });
    let found = false;
    for (let q = 0; q < s.wall.quadCount; q++) {
      const p = (k) => s.wall.pos.slice((q * 4 + k) * 3, (q * 4 + k) * 3 + 3);
      const xs = [0, 1, 2, 3].map((k) => p(k)[0]);
      const ys = [0, 1, 2, 3].map((k) => p(k)[1]);
      if (xs.every((x) => x === 10) && Math.min(...ys) === 0 && Math.max(...ys) <= 1.2 + 1e-6) found = true;
    }
    expect(found).toBe(true);
  });

  it('veggene på plattformen har gulvlisten ved plattformens gulv (v regnes fra gulvet)', () => {
    const s = buildSurfaces(platform(), null, { subdivide: 1 });
    // Vegg mot nord (z = 1) over x 10–14: laveste v skal være 0 selv om y starter på 1,2.
    let minV = Infinity;
    for (let q = 0; q < s.wall.quadCount; q++) {
      for (let k = 0; k < 4; k++) {
        const i = q * 4 + k;
        if (s.wall.pos[i * 3 + 2] === 1 && s.wall.pos[i * 3] >= 10 && s.wall.pos[i * 3] <= 15) minV = Math.min(minV, s.wall.uv[i * 2 + 1]);
      }
    }
    expect(minV).toBeCloseTo(0, 6);
  });

  it('en vanlig rute ved siden av vann og plattform: bassengkant opp til 0, plattformside fra 0', () => {
    const level = platform();
    setTile(level, 9, 3, TILE.WATER);
    const s = buildSurfaces(level, null, { subdivide: 1 });
    const spans = [];
    for (const [mesh, name] of [
      [s.basin, 'basin'],
      [s.wall, 'wall'],
    ]) {
      for (let q = 0; q < mesh.quadCount; q++) {
        const xs = [0, 1, 2, 3].map((k) => mesh.pos[(q * 4 + k) * 3]);
        const zs = [0, 1, 2, 3].map((k) => mesh.pos[(q * 4 + k) * 3 + 2]);
        const ys = [0, 1, 2, 3].map((k) => mesh.pos[(q * 4 + k) * 3 + 1]);
        if (xs.every((x) => x === 10) && Math.min(...zs) === 3 && Math.max(...zs) === 4) spans.push([name, Math.min(...ys), Math.max(...ys)]);
      }
    }
    expect(spans.some(([n, lo, hi]) => n === 'basin' && lo === -0.7 && hi === 0)).toBe(true);
    expect(spans.some(([n, lo, hi]) => n === 'wall' && lo === 0 && hi <= 1.2 + 1e-6)).toBe(true);
  });
});
