import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Flashlight } from '../src/view3d/flashlight.js';
import { FLASH, FLASH_PARS } from '../src/world/flashlight.js';
import { createSharedUniforms } from '../src/world/materials.js';

const camera = () => {
  const c = new THREE.PerspectiveCamera();
  c.position.set(2, 1.6, 3);
  return c;
};

describe('flashlight', () => {
  it('starts off, and does nothing until it is switched on', () => {
    const f = new Flashlight();
    f.update(1 / 60, camera());
    expect(FLASH.uFlashPos.value.w).toBe(0);
  });

  it('comes on quickly, and goes out again', () => {
    const f = new Flashlight();
    const c = camera();
    f.toggle();
    for (let k = 0; k < 12; k++) f.update(1 / 60, c);
    expect(FLASH.uFlashPos.value.w).toBeGreaterThan(1);
    f.toggle();
    for (let k = 0; k < 20; k++) f.update(1 / 60, c);
    expect(FLASH.uFlashPos.value.w).toBe(0);
  });

  it('is held a little to the right of and below the eye', () => {
    const f = new Flashlight();
    f.toggle();
    f.update(1 / 60, camera());
    const p = FLASH.uFlashPos.value;
    expect(p.x).toBeGreaterThan(2);
    expect(p.y).toBeLessThan(1.6);
    expect(p.z).toBeCloseTo(3);
  });

  it('follows the view with a small lag, and points the right way when switched on', () => {
    const f = new Flashlight();
    const c = camera();
    c.rotation.set(0, Math.PI / 2, 0, 'YXZ'); // mot −x
    f.update(1 / 60, c);
    f.toggle();
    f.update(1 / 60, c);
    expect(FLASH.uFlashDir.value.x).toBeCloseTo(-1);
    c.rotation.set(0, 0, 0, 'YXZ'); // mot −z
    f.update(1 / 60, c);
    expect(FLASH.uFlashDir.value.x).toBeLessThan(-0.3); // henger etter
    for (let k = 0; k < 40; k++) f.update(1 / 60, c);
    expect(FLASH.uFlashDir.value.z).toBeCloseTo(-1, 2);
  });

  it('stands still while paused (no time passes)', () => {
    const f = new Flashlight();
    const c = camera();
    f.toggle();
    f.update(0, c);
    expect(f.level).toBe(0);
  });

  it('goes out at once when you leave walking', () => {
    const f = new Flashlight();
    f.toggle();
    for (let k = 0; k < 12; k++) f.update(1 / 60, camera());
    f.off();
    expect(f.on).toBe(false);
    expect(FLASH.uFlashPos.value.w).toBe(0);
  });

  it('is shared by every floor, so one update reaches them all', () => {
    expect(createSharedUniforms([1, 1, 1]).uFlashPos).toBe(createSharedUniforms([1, 1, 1]).uFlashPos);
  });

  it('adds nothing when off, before the costly part', () => {
    expect(FLASH_PARS.match(/if \(uFlashPos\.w <= 0\.0\) return vec3\(0\.0\);/g)).toHaveLength(2);
  });
});
