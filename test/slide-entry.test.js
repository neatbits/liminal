import { describe, expect, it } from 'vitest';
import { createLevel, TILE, LAYERS } from '../src/core/level.js';
import { fillTiles, rectIndices } from '../src/core/ops.js';
import { fillZone } from '../src/core/zones.js';
import { SLIDE, slidePath, slideEntry } from '../src/core/slides.js';
import { buildSlides } from '../src/world/slides.js';
import { Rider } from '../src/view3d/rider.js';

function fixture(start = 5) {
  const level = createLevel({ w: 22, h: 22, height: 6, theme: 'pool' });
  fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 20, z1: 12 }), TILE.FLOOR);
  fillZone(level, 'floor', rectIndices(level, { x0: 2, z0: 4, x1: 5, z1: 8 }), 2.4);
  fillTiles(level, rectIndices(level, { x0: 9, z0: 3, x1: 20, z1: 11 }), TILE.WATER);
  const points = [];
  for (let x = start; x <= 6; x++) points.push([x, 6]);
  points.push([6, 7], [7, 8], [8, 9], [9, 9], [10, 9], [11, 9]);
  const slide = { points, tube: false, color: 'red' };
  level.slides = [slide];
  return { level, slide };
}

describe('rett innløp ved sklieplattformen', () => {
  it('holder starten rett, flat og uten krenging', () => {
    const { level, slide } = fixture();
    const path = slidePath(level, slide);
    expect(path.problem).toBeNull();
    for (const p of path.samples.filter((p) => p.s <= 1)) {
      expect(p.x).toBeCloseTo(5.5 + p.s, 8);
      expect(p.z).toBeCloseTo(6.5, 8);
      expect(p.y).toBeCloseTo(2.4 + SLIDE.LIP, 8);
      expect(p.t[1]).toBeCloseTo(0, 8);
      expect(p.bank).toBe(0);
    }
    expect(path.samples.at(-1)).toMatchObject({ x: 11.5, z: 9.5 });
    expect(path.samples.at(-1).y).toBeCloseTo(SLIDE.EXIT, 8);
  });

  it.each([5, 3])('platået skjærer ikke gjennom rennen, heller ikke ved start lenger inne (%s)', (start) => {
    const { level } = fixture(start);
    const mesh = buildSlides(level, null).slideIn_red;
    for (let i = 0; i < mesh.pos.length; i += 3) {
      const [x, y, z] = mesh.pos.slice(i, i + 3);
      if (x > 2 && x < 6 && z > 4 && z < 9) expect(y).toBeGreaterThan(2.41);
    }
  });

  it('oppdaterer innløpet når platået forlenges uten å endre sklieobjektet', () => {
    const { level, slide } = fixture();
    const before = slidePath(level, slide);
    fillZone(level, 'floor', rectIndices(level, { x0: 6, z0: 4, x1: 7, z1: 8 }), 2.4);
    const after = slidePath(level, slide);
    expect(after).not.toBe(before);
    for (const p of after.samples.filter((p) => p.x < 8 && p.z < 9)) expect(p.y).toBeGreaterThanOrEqual(2.4 - 1e-8);
  });

  it('kan fortsatt brukes fra plattformen og sklir helt fram til vannet', () => {
    const { level, slide } = fixture();
    const path = slideEntry(level, 5.5, 6.5, 2.4);
    expect(path).toBe(slidePath(level, slide));
    const rider = new Rider();
    rider.start(path);
    let landed = null;
    for (let i = 0; i < 1200 && !landed; i++) landed = rider.update(1 / 60, { consumeLook: () => [0, 0] });
    expect(landed).not.toBeNull();
    expect(landed.speed).toBeGreaterThan(1);
  });

  it.each([0, 1, 2, 3])('tåler diagonal start og tidlig sving i retning %s, både renne og rør', (rotation) => {
    for (const tube of [false, true]) {
      const { level } = fixture();
      let points = [[5, 6], [6, 7], [6, 8], [7, 9], [8, 9], [9, 9], [10, 9], [11, 9]];
      for (let r = 0; r < rotation; r++) {
        for (const key of LAYERS) {
          const next = new Uint8Array(22 * 22);
          for (let z = 0; z < 22; z++) for (let x = 0; x < 22; x++) next[x * 22 + 21 - z] = level[key][z * 22 + x];
          level[key] = next;
        }
        points = points.map(([x, z]) => [21 - z, x]);
      }
      const slide = { points, tube, color: 'red' };
      level.slides = [slide];
      const path = slidePath(level, slide);
      expect(path.problem).toBeNull();
      for (const p of path.samples.filter((p) => p.s <= 1)) {
        expect(p.y).toBeCloseTo(2.4 + SLIDE.LIP, 8);
        expect(p.bank).toBe(0);
        expect(p.t[0]).toBeCloseTo(path.samples[0].t[0], 8);
        expect(p.t[2]).toBeCloseTo(path.samples[0].t[2], 8);
      }
      const mesh = buildSlides(level, null).slideIn_red;
      for (let i = 0; i < mesh.pos.length; i += 3) {
        const [x, y, z] = mesh.pos.slice(i, i + 3);
        if (level.floors[Math.floor(z) * 22 + Math.floor(x)] === 24) expect(y).toBeGreaterThanOrEqual(2.4 - 1e-8);
      }
    }
  });

  it('ber om mer plass når det ikke er rom til fall etter platåkanten', () => {
    const { level } = fixture();
    level.tiles[6 * 22 + 6] = TILE.WATER;
    const path = slidePath(level, { points: [[5, 6], [6, 6]] });
    expect(path.problem).toMatch(/more room after the platform/);
    expect(path.samples.every((p) => Number.isFinite(p.y))).toBe(true);
  });
});
