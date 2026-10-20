import { describe, expect, it } from 'vitest';
import { createLevel, TILE } from '../src/core/level.js';
import { fillTiles, rectIndices } from '../src/core/ops.js';
import { objectPose, objectFits } from '../src/core/objects.js';
import { SoftPhysics } from '../src/world/softphysics.js';

// Rom 14 × 10 med gulv i x 1–12, z 1–8.
function room(objects) {
  const level = createLevel({ w: 14, h: 10, theme: 'playroom' });
  fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 12, z1: 8 }), TILE.FLOOR);
  level.objects = objects;
  return level;
}

const run = (phys, seconds, player = null) => {
  for (let t = 0; t < seconds; t += 1 / 60) phys.step(1 / 60, typeof player === 'function' ? player(t) : player);
};

describe('myke lekeklosser – stabling', () => {
  it('en kloss ligger oppå klossene før den, og en bjelke ligger over to søyler', () => {
    const level = room([
      { id: 'softblock', x: 3, z: 3, rot: 0 },
      { id: 'softcube', x: 3, z: 3, rot: 0 },
      { id: 'softpillar', x: 7, z: 4, rot: 0 },
      { id: 'softpillar', x: 9, z: 4, rot: 0 },
      { id: 'softbeam', x: 8, z: 4, rot: 0 },
    ]);
    const [block, cube, , , beam] = level.objects.map((o) => objectPose(level, o));
    expect(block.y).toBe(0);
    expect(cube.y).toBeCloseTo(0.6);
    expect(beam.y).toBeCloseTo(1.5);
    for (const o of level.objects) expect(objectFits(level, o)).toBe(true);
  });
});

describe('myke lekeklosser – fysikk', () => {
  it('står i ro der de er stablet når ingen rører dem', () => {
    const level = room([
      { id: 'softpillar', x: 7, z: 4, rot: 0 },
      { id: 'softpillar', x: 9, z: 4, rot: 0 },
      { id: 'softbeam', x: 8, z: 4, rot: 0 },
    ]);
    const phys = new SoftPhysics(level);
    run(phys, 3);
    const beam = phys.poses()[2];
    expect(beam.y).toBeGreaterThan(1.4);
  });

  it('en søyle velter når man går inn i den', () => {
    const level = room([{ id: 'softpillar', x: 6, z: 4, rot: 0 }]);
    const phys = new SoftPhysics(level);
    // Spilleren går østover gjennom søylens plass i 1,5 m/s.
    run(phys, 3, (t) => ({ x: 4.5 + Math.min(t, 1.6) * 1.5, y: 0, z: 4.5, vx: t < 1.6 ? 1.5 : 0, vz: 0 }));
    const [p] = phys.poses();
    const up = 1 - 2 * (p.q[0] ** 2 + p.q[2] ** 2); // hvor loddrett søylen står (1 = rett opp)
    expect(up).toBeLessThan(0.5);
    expect(p.x).toBeGreaterThan(6.5);
  });

  it('en kube dyttes framover, men går ikke gjennom veggen', () => {
    const level = room([{ id: 'softcube', x: 10, z: 4, rot: 0 }]);
    const phys = new SoftPhysics(level);
    run(phys, 4, (t) => ({ x: 8.6 + Math.min(t, 2.2) * 1.5, y: 0, z: 4.5, vx: t < 2.2 ? 1.5 : 0, vz: 0 }));
    const [p] = phys.poses();
    expect(p.x).toBeGreaterThan(10.6);
    expect(p.x).toBeLessThan(13 - 0.25);
  });

  it('høye klosser stopper spilleren, lave kan man gå over', () => {
    const level = room([{ id: 'softslab', x: 6, z: 4, rot: 0 }, { id: 'softbeam', x: 6, z: 7, rot: 0 }]);
    const phys = new SoftPhysics(level);
    run(phys, 0.5);
    const [, zNear] = phys.pushOut(6.5, 4.85, 0.28, 0);
    expect(zNear).toBeGreaterThan(4.95);
    const [, zInside] = phys.pushOut(6.5, 4.6, 0.28, 0);
    expect(zInside).toBeGreaterThan(4.95);
    // Bjelken (0,45 m) ligger lavt nok til å gå over.
    expect(phys.pushOut(6.5, 7.5, 0.28, 0)).toEqual([6.5, 7.5]);
  });
});

describe('lekerommet – byggverk av klosser', () => {
  it('genererte lekerom får klosser, stablet riktig og uten å stå i hverandre', async () => {
    const { generateLevel } = await import('../src/gen/index.js');
    const level = generateLevel({ theme: 'playroom', w: 48, h: 40, seed: 4 });
    const soft = level.objects.filter((o) => o.id.startsWith('soft'));
    expect(soft.length).toBeGreaterThan(6);
    for (const o of soft) expect(objectFits(level, o)).toBe(true);
    expect(soft.some((o) => objectPose(level, o).y > 0.4)).toBe(true); // noe ligger oppå noe
  });
});

describe('fysikk etter at man har stått stille, og lette plaststoler', () => {
  // Gåeren som i gåmodus: står stille en stund, går så østover og skyves ut av høye ting.
  function walkInto(phys, wait, from = 4.5, z = 4.5, seconds = 2) {
    const w = { x: from, z };
    for (let t = 0; t < wait + seconds + 1; t += 1 / 60) {
      const moving = t > wait && t < wait + seconds;
      if (moving) w.x += 1.5 / 60;
      phys.step(1 / 60, { x: w.x, y: 0, z: w.z, vx: moving ? 1.5 : 0, vz: 0 });
      [w.x, w.z] = phys.pushOut(w.x, w.z, 0.28, 0);
    }
    return w;
  }

  it('en stabel kan dyttes også etter at man har stått i ro (spilleren sovner ikke)', () => {
    const cube = { id: 'softcube', x: 6, z: 4, rot: 0 };
    const phys = new SoftPhysics(room([cube, { ...cube }, { ...cube }]));
    walkInto(phys, 3);
    for (const p of phys.poses()) expect(p.x).toBeGreaterThan(7);
  });

  it('en plaststol står i ro, dyttes bortover og havner i bassenget', () => {
    const level = { ...room([{ id: 'plasticchair', x: 6, z: 4, rot: 0 }]), theme: 'pool' };
    fillTiles(level, rectIndices(level, { x0: 8, z0: 1, x1: 12, z1: 8 }), TILE.WATER);
    const phys = new SoftPhysics(level);
    run(phys, 2);
    const still = phys.poses()[0];
    expect(still.y).toBeCloseTo(0, 1);
    expect(still.x).toBeCloseTo(6.5, 1);
    walkInto(phys, 0.5, 4.5, 4.5, 2.5);
    run(phys, 2);
    const p = phys.poses()[0];
    expect(p.x).toBeGreaterThan(8);
    expect(p.low).toBeLessThan(-0.5); // nede på bassengbunnen (0,7 m)
  });
});
