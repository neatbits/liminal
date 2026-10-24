import { describe, expect, it } from 'vitest';
import { Ray, Vector3 } from 'three';
import { createLevel, TILE, LAYERS } from '../src/core/level.js';
import { fillTiles, rectIndices } from '../src/core/ops.js';
import { fillZone } from '../src/core/zones.js';
import { SLIDE, slidePath } from '../src/core/slides.js';
import { buildSlides, frameAt, spanAt } from '../src/world/slides.js';

function fixture(rotation, curved) {
  const level = createLevel({ w: 24, h: 24, height: 5, theme: 'playroom' });
  fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 22, z1: 22 }), TILE.FLOOR);
  fillZone(level, 'floor', rectIndices(level, { x0: 2, z0: 6, x1: 5, z1: 10 }), 2.4);
  fillTiles(level, rectIndices(level, { x0: 10, z0: 5, x1: 21, z1: 18 }), TILE.WATER);
  let points = curved ? [[5, 8], [6, 8], [6, 9], [7, 10], [8, 11], [9, 11], [10, 11], [11, 11]]
    : Array.from({ length: 8 }, (_, i) => [5 + i, 8]);
  for (let r = 0; r < rotation; r++) {
    for (const key of LAYERS) {
      const next = new Uint8Array(24 * 24);
      for (let z = 0; z < 24; z++) for (let x = 0; x < 24; x++) next[x * 24 + 23 - z] = level[key][z * 24 + x];
      level[key] = next;
    }
    points = points.map(([x, z]) => [23 - z, x]);
  }
  level.slides = [{ points, tube: true, color: 'red' }];
  return level;
}

// Treff bare forsider, som ved ekte rendering. Dermed oppdages også feil trekantretning.
function firstHit(mesh, origin, direction) {
  const ray = new Ray(origin, direction);
  const [a, b, c, hit] = Array.from({ length: 4 }, () => new Vector3());
  let distance = Infinity;
  for (let i = 0; i < mesh.index.length; i += 3) {
    a.fromArray(mesh.pos, 3 * mesh.index[i]);
    b.fromArray(mesh.pos, 3 * mesh.index[i + 1]);
    c.fromArray(mesh.pos, 3 * mesh.index[i + 2]);
    if (ray.intersectTriangle(a, b, c, true, hit)) distance = Math.min(distance, origin.distanceTo(hit));
  }
  return distance;
}

describe('rørskliens åpning', () => {
  for (const curved of [false, true]) for (const rotation of [0, 1, 2, 3]) {
    it(`har hel bue uten hakk, fri åpning og tett skall: sving ${curved}, retning ${rotation}`, () => {
      const level = fixture(rotation, curved);
      const path = slidePath(level, level.slides[0]);
      expect(path.problem).toBeNull();
      const saved = JSON.stringify(level);
      const mesh = buildSlides(level, null);
      // Første lukkede tverrsnitt fra profilens offentlige konvolutt, ikke mesherens interne indeks.
      const p = path.samples.find((p) => spanAt(true, p.s) === Math.PI);
      const f = frameAt(p);
      const centre = new Vector3(...f.centre), t = new Vector3(...p.t).normalize();
      const up = new Vector3(...f.up), side = new Vector3(...f.side);
      const open = spanAt(false, p.s);
      for (let i = 0; i <= 12; i++) {
        const a = open + 0.02 + (2 * Math.PI - 2 * open - 0.04) * i / 12;
        const dir = side.clone().multiplyScalar(Math.sin(a)).addScaledVector(up, -Math.cos(a));
        const origin = centre.clone().addScaledVector(dir, SLIDE.RADIUS + 0.025).addScaledVector(t, -0.3);
        // Hele takets forkant ligger i samme plan; den slutter ikke i en innskåret spiss.
        expect(firstHit(mesh.slideOut_red, origin, t)).toBeCloseTo(0.3, 6);
      }
      const eye = centre.clone().addScaledVector(up, 0.3).addScaledVector(t, -0.2);
      expect(firstHit(mesh.slideIn_red, eye, t)).toBeGreaterThan(0.25);
      expect(firstHit(mesh.slideOut_red, eye, t)).toBeGreaterThan(0.25);
      // Også tak og sider rett bak munningen er tette fra utsiden og innsiden.
      const inside = frameAt(path.samples[path.samples.indexOf(p) + 1]);
      for (let j = 0; j < 32; j++) {
        const a = 2 * Math.PI * j / 32;
        const dir = new Vector3(...inside.side).multiplyScalar(Math.sin(a)).addScaledVector(new Vector3(...inside.up), -Math.cos(a));
        const c = new Vector3(...inside.centre);
        expect(firstHit(mesh.slideOut_red, c.clone().addScaledVector(dir, 0.8), dir.clone().negate())).toBeLessThan(0.33);
        expect(firstHit(mesh.slideIn_red, c, dir)).toBeLessThan(0.48);
      }
      expect(JSON.stringify(level)).toBe(saved);
      expect(slidePath(level, level.slides[0])).toBe(path);
    });
  }
});
