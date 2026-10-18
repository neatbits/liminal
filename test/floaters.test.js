import { describe, expect, it } from 'vitest';
import { createLevel, TILE, WATER_SURFACE } from '../src/core/level.js';
import { fillTiles, rectIndices } from '../src/core/ops.js';
import { Floaters } from '../src/world/floaters.js';
import { Wake } from '../src/world/ball-layout.js';

// Basseng 6 × 4 (x 2–7, z 2–5) i et rom på 10 × 8, med én and midt i.
function pool(ducks = [[4, 3]]) {
  const level = createLevel({ w: 10, h: 8 });
  fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 8, z1: 6 }), TILE.FLOOR);
  fillTiles(level, rectIndices(level, { x0: 2, z0: 2, x1: 7, z1: 5 }), TILE.WATER);
  level.objects = ducks.map(([x, z]) => ({ id: 'duck', x, z, rot: 0 }));
  return level;
}

const run = (f, seconds, player = null) => {
  for (let t = 0; t < seconds; t += 1 / 60) f.step(1 / 60, player);
};

describe('badeender i gåmodus', () => {
  it('ligger stille og duver i vannflaten når ingen rører dem', () => {
    const f = new Floaters(pool());
    run(f, 3);
    const [p] = f.poses();
    expect(p.x).toBeCloseTo(4.5);
    expect(p.z).toBeCloseTo(3.5);
    expect(Math.abs(p.y - WATER_SURFACE)).toBeLessThan(0.1);
  });

  it('dyttes framover når man vasser inn i dem, og bremses av vannet', () => {
    const f = new Floaters(pool());
    // Spilleren kommer vestfra og går inn i anden.
    f.step(1 / 60, { x: 4.2, z: 3.5, vx: 1.5, vz: 0, r: 0.28 });
    const v0 = f.bodies[0].vx;
    expect(v0).toBeGreaterThan(1);
    expect(f.bodies[0].x).toBeGreaterThan(4.6);
    run(f, 0.5);
    expect(f.bodies[0].vx).toBeLessThan(v0);
    expect(f.bodies[0].x).toBeGreaterThan(4.8);
  });

  it('blir i bassenget: spretter av kanten', () => {
    const f = new Floaters(pool());
    f.bodies[0].vx = 3;
    run(f, 4);
    expect(f.bodies[0].x).toBeLessThan(8);
    expect(f.bodies[0].x).toBeGreaterThan(2);
  });

  it('ender støter borti hverandre i stedet for å gli gjennom', () => {
    const f = new Floaters(pool([[3, 3], [5, 3]]));
    f.bodies[0].vx = 2;
    run(f, 2);
    const [a, b] = f.bodies;
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(0.27);
    expect(b.x).toBeGreaterThan(5.5);
  });

  it('et plask dytter endene utover', () => {
    const f = new Floaters(pool());
    f.splash(4, 3.5, 2);
    expect(f.bodies[0].vx).toBeGreaterThan(0);
  });

  it('gjenstander som ikke flyter, eller ender på land, er ikke med', () => {
    const level = pool([[1, 1]]);
    level.objects.push({ id: 'tv', x: 1, z: 6, rot: 0 });
    expect(new Floaters(level).bodies).toEqual([]);
  });
});

describe('kjølvann i ballbingen', () => {
  it('legger igjen punkter når man går, og de gir seg sakte', () => {
    const w = new Wake();
    w.touch(1, 1);
    w.touch(1.05, 1); // for nær: samme punkt
    w.touch(1.6, 1);
    expect(w.points).toHaveLength(2);
    w.step(1);
    expect(w.points[0].s).toBeLessThan(1);
    expect(w.points[0].s).toBeGreaterThan(0.3);
    for (let k = 0; k < 20; k++) w.step(1);
    expect(w.points).toHaveLength(0);
  });

  it('husker bare de siste punktene', () => {
    const w = new Wake();
    for (let k = 0; k < 20; k++) w.touch(k, 0);
    expect(w.points).toHaveLength(8);
    expect(w.values().slice(0, 3)).toEqual(new Float32Array([12, 0, 1]));
  });
});
