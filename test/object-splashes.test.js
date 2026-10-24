import { describe, expect, it, vi } from 'vitest';
import { createLevel, TILE, WATER_SURFACE } from '../src/core/level.js';
import { SoftPhysics } from '../src/world/softphysics.js';
import { ObjectSplashes } from '../src/world/object-splashes.js';
import { WaterPlay } from '../src/view3d/water-play.js';
import { Ripples } from '../src/world/ripples.js';
import { splash } from '../src/audio/effects.js';

function room(theme = 'pool', x = 6) {
  const level = createLevel({ w: 14, h: 10, theme });
  for (let z = 1; z < 9; z++) for (let x = 1; x < 13; x++) level.tiles[z * 14 + x] = x >= 8 ? TILE.WATER : TILE.FLOOR;
  level.objects = [{ id: 'plasticchair', x, z: 4, rot: 0 }];
  return level;
}
const run = (phys, seconds) => { for (let i = 0; i < seconds * 60; i++) phys.step(1 / 60); };

describe('fysikkgjenstander i vann', () => {
  it('en plaststol dyttes fra tørt gulv til bassenget: ett plask, uten å endre romdata', () => {
    const level = room(), before = JSON.stringify(level);
    const phys = new SoftPhysics(level); phys.onSplash = vi.fn();
    run(phys, 2);
    expect(phys.onSplash).not.toHaveBeenCalled();
    let x = 4.5, z = 4.5;
    for (let i = 0; i < 150; i++) {
      x += 1.5 / 60;
      phys.step(1 / 60, { x, y: 0, z, vx: 1.5, vz: 0 });
      [x, z] = phys.pushOut(x, z, 0.28, 0);
    }
    run(phys, 3);
    expect(phys.onSplash).toHaveBeenCalledTimes(1);
    const [sx, sz, strength] = phys.onSplash.mock.calls[0];
    expect(sx).toBeGreaterThanOrEqual(8);
    expect(sz).toBeGreaterThan(4); expect(sz).toBeLessThan(5);
    expect(strength).toBeGreaterThan(0.2);
    expect(phys.poses()[0].low).toBeLessThan(-0.5);
    expect(JSON.stringify(level)).toBe(before);
  });

  it('registrerer stolbeinet før tyngdepunktet treffer, og krever faktisk vannkontakt', () => {
    const level = room(), phys = new SoftPhysics(level), body = phys.blocks[0].body;
    const detector = new ObjectSplashes(level, phys.blocks), hit = vi.fn();
    body.position.set(8.5, 1, 4.5); body.velocity.set(0, -2, 0);
    detector.step(1 / 60, hit);
    expect(hit).not.toHaveBeenCalled(); // rett over vann, fortsatt i lufta
    body.position.y = WATER_SURFACE + 0.40;
    detector.step(1 / 60, hit);
    expect(body.position.y).toBeGreaterThan(WATER_SURFACE);
    expect(hit).toHaveBeenCalledTimes(1);
    body.position.set(7.5, -0.1, 4.5);
    for (let i = 0; i < 60; i++) detector.step(1 / 60, hit);
    expect(hit).toHaveBeenCalledTimes(1); // tørt gulv er ikke vann
  });

  it('gir ikke plask fra tomrommet mellom stolbein, selv om ytterboksen overlapper vann', () => {
    const level = room(), phys = new SoftPhysics(level), body = phys.blocks[0].body;
    level.tiles.fill(TILE.FLOOR); level.tiles[4 * 14 + 8] = TILE.WATER;
    const detector = new ObjectSplashes(level, phys.blocks), hit = vi.fn();
    // Den nordvestlige delen av ytterboksen er over vann. Begge beina ligger på tørt gulv.
    body.position.set(9.27, WATER_SURFACE + 0.4, 5.26);
    body.updateAABB();
    expect(body.aabb.lowerBound.x).toBeLessThan(9);
    expect(body.aabb.lowerBound.z).toBeLessThan(5);
    detector.step(1 / 60, hit);
    expect(hit).not.toHaveBeenCalled();
  });

  it('lar en velting treffe med hjørnet og følger rotasjonen', () => {
    const phys = new SoftPhysics(room()), body = phys.blocks[0].body;
    const detector = new ObjectSplashes(phys.level, phys.blocks), hit = vi.fn();
    body.position.set(8.5, 0.3, 4.5);
    detector.step(1 / 60, hit);
    expect(hit).not.toHaveBeenCalled();
    body.quaternion.setFromEuler(0, 0, Math.PI / 4);
    detector.step(1 / 60, hit);
    expect(hit).toHaveBeenCalledTimes(1);
  });

  it('holder neddykkede ting stille, men kan plaske igjen etter å ha vært helt ute', () => {
    const phys = new SoftPhysics(room('pool', 9)), body = phys.blocks[0].body;
    phys.onSplash = vi.fn(); run(phys, 2);
    expect(phys.onSplash).not.toHaveBeenCalled();
    body.wakeUp(); body.position.y = 2; body.velocity.set(0, 0, 0);
    run(phys, 2);
    expect(phys.onSplash).toHaveBeenCalledTimes(1);
    run(phys, 2);
    expect(phys.onSplash).toHaveBeenCalledTimes(1);
  });

  it('demping hindrer flere plask når stolen vipper fram og tilbake ved overflaten', () => {
    const phys = new SoftPhysics(room()), body = phys.blocks[0].body;
    const detector = new ObjectSplashes(phys.level, phys.blocks), hit = vi.fn();
    body.position.set(8.5, 0, 4.5);
    for (let i = 0; i < 60; i++) { body.position.y = i % 2 ? 1 : 0; detector.step(1 / 60, hit); }
    expect(hit).toHaveBeenCalledTimes(1);
  });

  it('høyere fall gir sterkere plask, og lette baller gir mindre enn stoler', () => {
    const phys = new SoftPhysics(room()), body = phys.blocks[0].body;
    const detector = new ObjectSplashes(phys.level, phys.blocks), hit = vi.fn();
    body.position.set(8.5, 0, 4.5);
    body.velocity.y = -0.5; const slow = detector.contact(detector.bodies[0]);
    body.velocity.y = -4; const fast = detector.contact(detector.bodies[0]);
    body.mass = 0.035; const light = detector.contact(detector.bodies[0]);
    expect(fast.strength).toBeGreaterThan(slow.strength);
    expect(light.strength).toBeLessThan(slow.strength);
    const ripples = new Ripples();
    ripples.splash(8.5, 4.5, light.strength); const small = ripples.points.at(-1).s;
    ripples.splash(8.5, 4.5, fast.strength);
    expect(ripples.points.at(-1).s).toBeGreaterThan(small);
    expect(hit).not.toHaveBeenCalled();
  });

  it.each(['pool', 'mall', 'office'])('%s: reagerer på vann, uten simulering ved dt=0', (theme) => {
    const phys = new SoftPhysics(room(theme)), body = phys.blocks[0].body;
    phys.onSplash = vi.fn(); body.position.set(8.5, 0, 4.5);
    phys.step(0); expect(phys.onSplash).not.toHaveBeenCalled();
    phys.step(1 / 60); expect(phys.onSplash).toHaveBeenCalledTimes(1);
  });

  it('ballbinger og rom uten vann gir aldri vannplask', () => {
    for (const level of [room('playroom'), room()]) {
      if (level.theme === 'pool') level.tiles.fill(TILE.FLOOR);
      const phys = new SoftPhysics(level); phys.onSplash = vi.fn();
      phys.blocks[0].body.position.set(8.5, -0.2, 4.5); run(phys, 1);
      expect(phys.onSplash).not.toHaveBeenCalled();
    }
  });

  it('også en rotert kule treffer med undersiden, uten å kreve at sentrum er neddykket', () => {
    const level = room(); level.objects[0].id = 'playball';
    const phys = new SoftPhysics(level), body = phys.blocks[0].body;
    phys.onSplash = vi.fn(); body.quaternion.setFromEuler(Math.PI, 0, 0);
    body.position.set(8.5, WATER_SURFACE + 0.06, 4.5);
    phys.step(1 / 60);
    expect(phys.onSplash).toHaveBeenCalledTimes(1);
    expect(body.position.y).toBeGreaterThan(WATER_SURFACE);
  });
});

describe('plaskkobling til vann og lyd', () => {
  function play() {
    const walk = { walker: { x: 7, z: 4.5 }, sound: true, audio: { splash: vi.fn() } };
    const play = new WaterPlay(walk);
    play.water = { setRipples: vi.fn() }; play.floaters = { splash: vi.fn(), poses: () => [] };
    return { play, walk };
  }

  it('gir ringer ved treffpunktet og lyd som avtar med avstanden', () => {
    const { play: p, walk } = play();
    p.soft.onSplash(8.5, 4.5, 2);
    expect(p.ripples.points).toHaveLength(2);
    expect(p.ripples.points.every(({ x, z }) => x === 8.5 && z === 4.5)).toBe(true);
    expect(p.floaters.splash).toHaveBeenCalledWith(8.5, 4.5, 2);
    const near = walk.audio.splash.mock.lastCall[1];
    walk.walker.x = 28; p.soft.onSplash(8.5, 4.5, 2);
    expect(walk.audio.splash.mock.lastCall[1]).toBeLessThan(near / 10);
  });

  it('mute beholder synlige ringer og nullstiller dem når gåmodusen resettes', () => {
    const { play: p, walk } = play(); walk.sound = false;
    p.soft.onSplash(8.5, 4.5, 2);
    expect(p.ripples.points).toHaveLength(2);
    expect(walk.audio.splash).not.toHaveBeenCalled();
    p.level = room(); p.soft.reset = vi.fn(); p.reset();
    expect(p.ripples.points).toHaveLength(0);
    expect([...p.water.setRipples.mock.lastCall[0]].every((n) => n === 0)).toBe(true);
  });

  it('lydens ekstra nivå brukes for gjenstander, mens spillerens plask beholder standardnivået', () => {
    const engine = { ctx: {}, graph: { sound: {} }, splashSound: {}, _oneShot: vi.fn() };
    splash(engine, 2); const normal = engine._oneShot.mock.lastCall[1];
    splash(engine, 2, 0.2);
    expect(engine._oneShot.mock.lastCall[1]).toBeCloseTo(normal * 0.2);
  });
});
