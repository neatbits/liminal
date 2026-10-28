import { describe, expect, it } from 'vitest';
import * as CANNON from 'cannon-es';
import { MoverBroadphase } from '../src/world/mover-broadphase.js';

/** Mange faste rader (som vegger og gulv i softphysics.js), noen klosser som faller og en kinematisk spiller. */
function scene() {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
  world.allowSleep = true;
  const plane = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() });
  plane.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(plane);
  for (let z = 0; z < 30; z++) {
    for (const [x, len] of [[0, 30], [8, 4], [20, 9]]) {
      const box = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Box(new CANNON.Vec3(len / 2, 0.1 + (z % 3) * 0.05, 0.5)) });
      box.position.set(x + len / 2, 0, z + 0.5);
      world.addBody(box);
    }
  }
  for (let k = 0; k < 12; k++) {
    const body = new CANNON.Body({ mass: 2, sleepSpeedLimit: 0.15, shape: new CANNON.Box(new CANNON.Vec3(0.25, 0.25, 0.25)) });
    body.position.set(4 + (k % 4) * 0.4, 1 + Math.floor(k / 4) * 0.6, 5 + (k % 3) * 0.3);
    world.addBody(body);
  }
  const player = new CANNON.Body({ type: CANNON.Body.KINEMATIC, mass: 0, allowSleep: false, shape: new CANNON.Sphere(0.3) });
  player.position.set(2, 0.6, 5.4);
  world.addBody(player);
  return { world, player };
}

const key = (a, b) => (a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`);

/** Parene broadphasen gir, som kan gi kontakt (overlappende AABB-er). */
function found(broadphase, world) {
  const [p1, p2] = [[], []];
  broadphase.collisionPairs(world, p1, p2);
  return new Set(p1.map((a, i) => [a, p2[i]]).filter(([a, b]) => a.aabb.overlaps(b.aabb)).map(([a, b]) => key(a, b)));
}

/**
 * Fasit: alle par (med oppdaterte AABB-er) som broadphasen skal vurdere, med overlappende AABB-er og
 * omsluttende kuler (cannons egen test – former som berører hverandre, oppfyller begge).
 */
function truth(world) {
  const check = new CANNON.Broadphase();
  for (const b of world.bodies) b.updateAABB();
  const out = new Set();
  world.bodies.forEach((a, i) => world.bodies.slice(i + 1).forEach((b) => {
    const [p1, p2] = [[], []];
    if (check.needBroadphaseCollision(a, b) && a.aabb.overlaps(b.aabb)) check.intersectionTest(a, b, p1, p2);
    if (p1.length) out.add(key(a, b));
  }));
  return out;
}

describe('broadphasen for fysikken i gåmodus', () => {
  it('finner alle mulige kontakter gjennom fall, stabling, dytt og søvn', () => {
    const { world, player } = scene();
    world.broadphase = new MoverBroadphase();
    let compared = 0;
    for (let step = 0; step < 400; step++) {
      player.position.x = 2 + Math.min(step, 200) * 0.02; // går inn i klossene, så står stille
      player.velocity.set(step < 200 ? 1.2 : 0, 0, 0);
      world.step(1 / 60);
      if (step % 4) continue;
      const mine = found(world.broadphase, world);
      expect(mine).toEqual(truth(world));
      compared += mine.size;
    }
    expect(compared).toBeGreaterThan(50);
    expect(world.bodies.some((b) => b.sleepState === CANNON.Body.SLEEPING)).toBe(true); // søvn er dekket
  });

  it('gir ingen par mellom faste kropper eller mellom to sovende', () => {
    const { world } = scene();
    const bp = new MoverBroadphase();
    for (const b of world.bodies) if (b.type === CANNON.Body.DYNAMIC) b.sleep();
    const [p1, p2] = [[], []];
    bp.collisionPairs(world, p1, p2);
    for (let i = 0; i < p1.length; i++) {
      expect(p1[i].type === CANNON.Body.STATIC && p2[i].type === CANNON.Body.STATIC).toBe(false);
      expect(p1[i].sleepState === CANNON.Body.SLEEPING && p2[i].sleepState === CANNON.Body.SLEEPING).toBe(false);
    }
  });
});
