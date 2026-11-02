import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { DESCENT, descentMood, descentTapes, descentBatteries, descentLethal, drained, charged, recordDescent } from '../src/gen/descent.js';
import { MOODS } from '../src/gen/moods.js';
import { Flashlight } from '../src/view3d/flashlight.js';
import { FLASH } from '../src/world/flashlight.js';

describe('The Descent', () => {
  it('gets worse the deeper you go, ending in Nightmare', () => {
    const order = Object.keys(MOODS);
    let last = -1;
    for (let depth = 1; depth <= 12; depth++) {
      const at = order.indexOf(descentMood(depth));
      expect(at).toBeGreaterThanOrEqual(0);
      expect(at).toBeGreaterThanOrEqual(last);
      last = at;
    }
    expect(descentMood(1)).toBe('abandoned');
    expect(descentMood(20)).toBe('nightmare');
  });

  it('the figure only takes you once you have learned the rules, and it exists there', () => {
    expect(descentLethal(DESCENT.LETHAL - 1)).toBe(false);
    expect(descentLethal(DESCENT.LETHAL)).toBe(true);
    expect(MOODS[descentMood(DESCENT.LETHAL)].monster).toBeTruthy();
  });

  it('more tapes further down, but never an impossible number', () => {
    expect(descentTapes(1)).toBe(1);
    expect(descentTapes(30)).toBe(3);
    expect(descentBatteries(1)).toBeGreaterThan(descentBatteries(5));
  });

  it('the battery runs down and is topped up, within 0–1', () => {
    expect(drained(1, DESCENT.BATTERY / 2)).toBeCloseTo(0.5);
    expect(drained(0.01, 100)).toBe(0);
    expect(charged(0.2)).toBeCloseTo(0.2 + DESCENT.CHARGE);
    expect(charged(0.9)).toBe(1);
  });

  it('the flashlight dies when the battery does, and cannot be switched on again', () => {
    const f = new Flashlight();
    const c = new THREE.PerspectiveCamera();
    f.fit(true);
    f.toggle();
    for (let k = 0; k < 30; k++) f.update(1 / 30, c);
    expect(f.battery).toBeLessThan(1);
    f.battery = 0.001;
    f.update(1, c);
    expect(f.on).toBe(false);
    f.toggle();
    expect(f.on).toBe(false);
    f.battery = charged(0);
    f.toggle();
    expect(f.on).toBe(true);
  });

  it('a nearly empty battery gives a weaker light', () => {
    const f = new Flashlight();
    const c = new THREE.PerspectiveCamera();
    f.fit(true);
    f.toggle();
    for (let k = 0; k < 30; k++) f.update(1 / 30, c);
    const full = FLASH.uFlashPos.value.w;
    f.battery = 0.05;
    f.update(0, c);
    expect(FLASH.uFlashPos.value.w).toBeLessThan(full * 0.6);
  });

  it('without a battery it lasts for ever', () => {
    const f = new Flashlight();
    const c = new THREE.PerspectiveCamera();
    f.toggle();
    for (let k = 0; k < 300; k++) f.update(1, c);
    expect(f.on).toBe(true);
    expect(f.battery).toBe(1);
  });

  it('remembers the deepest level, and the fastest way there', () => {
    let r = recordDescent({}, { depth: 3, time: 200, tapes: 4 });
    expect(r).toEqual({ runs: 1, bestDepth: 3, bestTime: 200, tapes: 4 });
    r = recordDescent(r, { depth: 2, time: 50, tapes: 1 });
    expect(r).toEqual({ runs: 2, bestDepth: 3, bestTime: 200, tapes: 4 });
    r = recordDescent(r, { depth: 3, time: 150, tapes: 2 });
    expect(r.bestTime).toBe(150);
    r = recordDescent(r, { depth: 5, time: 500, tapes: 7 });
    expect(r).toEqual({ runs: 4, bestDepth: 5, bestTime: 500, tapes: 7 });
  });
});
