import { describe, expect, it } from 'vitest';
import * as CANNON from 'cannon-es';
import { createLevel, TILE } from '../src/core/level.js';
import { objectPose } from '../src/core/objects.js';
import { pitBallSupport } from '../src/core/play-balls.js';
import { ceilingAt, floorAt } from '../src/core/heights.js';
import { SoftPhysics } from '../src/world/softphysics.js';

function room(pit = false) {
  const level = createLevel({ theme: 'playroom', w: 20, h: 16 });
  for (let z = 1; z < 15; z++) for (let x = 1; x < 19; x++) level.tiles[z * 20 + x] = TILE.FLOOR;
  if (pit) for (let z = 5; z < 10; z++) for (let x = 5; x < 10; x++) level.tiles[z * 20 + x] = TILE.WATER;
  level.objects = [{ id: 'playball', x: 7, z: 7, rot: 0, v: 1 }];
  return level;
}
const advance = (phys, seconds) => { for (let i = 0; i < seconds * 60; i++) phys.step(1 / 60); };

describe('ekte ballfysikk', () => {
  it('sammenslåtte veggbokser beholder volum, søyler og åpninger', () => {
    const level = room();
    for (let x = 3; x < 16; x++) if (x !== 9) level.tiles[4 * level.w + x] = TILE.WALL;
    level.tiles[11 * level.w + 8] = TILE.PILLAR;
    const phys = new SoftPhysics(level);
    const walls = phys.world.bodies.filter((b) => b.mass === 0 && b.shapes[0] instanceof CANNON.Box);
    for (const b of walls) b.updateAABB();
    for (let z = 0; z < level.h; z++) for (let x = 0; x < level.w; x++) {
      const solid = walls.some((b) => b.aabb.lowerBound.x <= x + 0.5 && b.aabb.upperBound.x >= x + 0.5 &&
        b.aabb.lowerBound.z <= z + 0.5 && b.aabb.upperBound.z >= z + 0.5);
      expect(solid).toBe([TILE.WALL, TILE.PILLAR].includes(level.tiles[z * level.w + x]));
    }
    const expected = level.tiles.reduce((sum,t,i)=>sum+(t===TILE.WALL?4:t===TILE.PILLAR?
      .25*(ceilingAt(level,i%level.w,Math.floor(i/level.w))-floorAt(level,i%level.w,Math.floor(i/level.w))):0),0);
    expect(walls.reduce((sum, b) => sum + b.shapes[0].volume(), 0)).toBe(expected);
    expect(walls.length).toBeLessThan(level.tiles.filter((t) => t === TILE.WALL).length);
  });
  it('bruker en kule, ruller/spretter under tyngdekraft og stopper ved ytterveggen', () => {
    const phys = new SoftPhysics(room()), body = phys.blocks[0].body;
    expect(body.shapes[0]).toBeInstanceOf(CANNON.Sphere);
    body.position.y = 1;
    body.velocity.set(2, 0, 0);
    let bounce = false;
    for (let i = 0; i < 240; i++) {
      phys.step(1 / 60);
      if (body.position.y < 0.4 && body.velocity.y > 0.3) bounce = true;
    }
    expect(bounce).toBe(true);
    expect(body.position.x).toBeGreaterThan(8);
    expect(body.position.y).toBeGreaterThan(0.06);
    body.velocity.x = 3; body.wakeUp();
    advance(phys, 7);
    expect(body.position.x).toBeLessThan(18.95);
  });

  it('kan dyttes etter å ha sovnet og blokkerer ikke gåeren som en stor kasse', () => {
    const phys = new SoftPhysics(room()), body = phys.blocks[0].body;
    advance(phys, 4);
    const x = body.position.x, z = body.position.z;
    body.sleep();
    for (let i = 0; i < 100; i++) phys.step(1 / 60, { x: x - 0.7 + i * 0.025, y: 0, z, vx: 1.5, vz: 0 });
    expect(body.position.x).toBeGreaterThan(x + 0.3);
    expect(phys.pushOut(x, z, 0.28, 0)).toEqual([x, z]);
  });

  it('kolliderer med andre baller og faste møbler', () => {
    const level = room();
    level.objects.push({ id: 'playball', x: 9, z: 7, rot: 0, v: 1 }, { id: 'counter', x: 14, z: 7, rot: 0 });
    const phys = new SoftPhysics(level), [a, b] = phys.blocks.map((p) => p.body);
    a.position.set(7.5, 0.075, 7.5); b.position.set(8.5, 0.075, 7.5);
    a.velocity.x = 3;
    advance(phys, 1);
    expect(b.position.x).toBeGreaterThan(8.6);
    a.position.set(13, 0.075, 7.5); a.velocity.set(3, 0, 0); a.wakeUp();
    advance(phys, 1);
    expect(a.position.x).toBeLessThan(13.6);
  });

  it('hviler på topplaget i bingen og kan sparkes ut på gulvet', () => {
    const level = room(true), phys = new SoftPhysics(level), body = phys.blocks[0].body;
    advance(phys, 3);
    expect(body.position.y).toBeGreaterThan(pitBallSupport(body.position.x, body.position.z) + 0.04);
    body.position.set(9.6, pitBallSupport(9.6, 7.5) + 0.15, 7.5);
    body.velocity.set(2, 1, 0); body.wakeUp();
    advance(phys, 1.5);
    expect(body.position.x).toBeGreaterThan(10.2);
    expect(body.position.y).toBeGreaterThan(0.06);
    expect(body.position.y).toBeLessThan(0.3);
  });

  it('gåeren kan dytte topplagsballene også når føttene står nede i bingen', () => {
    const phys = new SoftPhysics(room(true)), body = phys.blocks[0].body;
    advance(phys, 2);
    const x = body.position.x, z = body.position.z;
    for (let i = 0; i < 90; i++) phys.step(1 / 60, { x: x - 0.7 + i * 0.025, y: -0.7, z, vx: 1.5, vz: 0 });
    expect(body.position.x).toBeGreaterThan(x + 0.3);
  });

  it('pause er uendret, renderposen følger kulens senter og reset bruker lagret startpunkt', () => {
    const level = room(), phys = new SoftPhysics(level), body = phys.blocks[0].body;
    const initial = body.position.clone();
    body.velocity.set(1, 2, 0); phys.step(0);
    expect(body.position.almostEquals(initial)).toBe(true);
    expect(body.velocity.toArray()).toEqual([1, 2, 0]);
    body.quaternion.setFromEuler(1.2, 0.7, 0.5);
    const p = phys.poses()[0];
    const centre = body.quaternion.vmult(new CANNON.Vec3(0, 0.075, 0));
    expect(p.x + centre.x).toBeCloseTo(body.position.x);
    expect(p.y + centre.y).toBeCloseTo(body.position.y);
    expect(p.z + centre.z).toBeCloseTo(body.position.z);
    advance(phys, 0.5);
    const reset = new SoftPhysics(level), pose = objectPose(level, level.objects[0]);
    expect(reset.blocks[0].body.position.toArray()).toEqual([pose.x, pose.y + 0.075, pose.z]);
  });
});
