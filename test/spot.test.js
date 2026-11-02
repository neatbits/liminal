import { describe, it, expect } from 'vitest';
import { TILE } from '../src/core/level.js';
import { SPOT, SPOT_THEMES, spotBase, spotRound, spotRight, pickChange, recordSpot } from '../src/gen/spot.js';
import { mulberry32 } from '../src/core/rng.js';
import { doorInfo, DOOR } from '../src/core/doors.js';
import { reachableCells } from '../src/gen/tapes.js';
import { objectFits } from '../src/core/objects.js';
import { TINTS } from '../src/core/tints.js';
import { levelToJSON } from '../src/core/serialize.js';

const same = (a, b) => JSON.stringify(levelToJSON(a)) === JSON.stringify(levelToJSON(b));

describe('Spot the wrong', () => {
  it.each(SPOT_THEMES)('%s: a corridor with a door behind you and one at the far end', (theme) => {
    const l = spotBase(theme, mulberry32(3));
    const z = Math.floor(l.spawn.z);
    for (const x of [l.spot.back, l.spot.onward]) {
      expect(l.tiles[z * l.w + x]).toBe(TILE.DOOR);
      expect(doorInfo(l, x, z).oneSided).toBe(true);
      expect(doorInfo(l, x, z).state).toBe(DOOR.CLOSED);
    }
    expect(l.spawn.x).toBeLessThan(5);
    expect(l.objects.length).toBeGreaterThan(4);
    for (const o of l.objects) expect(objectFits(l, o), o.id).toBe(true);
  });

  it('the first round, and the one after a mistake, is as it should be', () => {
    const base = spotBase('office', mulberry32(1));
    const { level, change } = spotRound(base, 0, () => 0, { first: true });
    expect(change).toBe(null);
    expect(same(level, base)).toBe(true);
  });

  it('a wrong round really differs, and the far door can still be reached', () => {
    for (const theme of SPOT_THEMES) {
      const base = spotBase(theme, mulberry32(5));
      let wrong = 0;
      for (let seed = 1; seed <= 40; seed++) {
        const rand = mulberry32(seed);
        const { level, change } = spotRound(base, seed % SPOT.GOAL, rand);
        if (!change) {
          expect(same(level, base)).toBe(true);
          continue;
        }
        wrong++;
        expect(same(level, base), `${theme}: ${change.name}`).toBe(false);
        expect(change.what.length).toBeGreaterThan(5);
        const reach = reachableCells(level, level.spawn.x, level.spawn.z);
        const z = Math.floor(level.spawn.z);
        expect(reach[z * level.w + level.spot.onward - 1], `${theme}: ${change.name}`).toBe(1);
      }
      expect(wrong).toBeGreaterThan(12);
    }
  }, 30000);

  it('never changes the base itself', () => {
    const base = spotBase('hotel', mulberry32(2));
    const before = JSON.stringify(levelToJSON(base));
    for (let seed = 1; seed <= 20; seed++) spotRound(base, 6, mulberry32(seed));
    expect(JSON.stringify(levelToJSON(base))).toBe(before);
  });

  it('gets harder along the streak, and does not repeat itself', () => {
    const rand = mulberry32(9);
    const early = new Set(Array.from({ length: 60 }, () => pickChange(0, rand)));
    const late = new Set(Array.from({ length: 60 }, () => pickChange(7, rand)));
    expect(early.has('ceilingUp')).toBe(false);
    expect(late.has('ceilingUp')).toBe(true);
    expect(late.has('wrongLook')).toBe(false);
    for (let k = 0; k < 30; k++) expect(pickChange(3, rand, 'lightOut')).not.toBe('lightOut');
  });

  it('the right door depends on whether anything is wrong', () => {
    expect(spotRight(null, false)).toBe(true);
    expect(spotRight(null, true)).toBe(false);
    expect(spotRight({ name: 'lightOut' }, true)).toBe(true);
    expect(spotRight({ name: 'lightOut' }, false)).toBe(false);
  });

  it('the wrong colour of light exists', () => {
    expect(TINTS.red).toBeTruthy();
  });

  it('keeps the best streak, wins and the best time', () => {
    let r = recordSpot({}, { streak: 3 });
    expect(r).toEqual({ wins: 0, bestTime: null, bestStreak: 3 });
    r = recordSpot(r, { streak: 1 });
    expect(r.bestStreak).toBe(3);
    r = recordSpot(r, { streak: SPOT.GOAL, time: 200 });
    r = recordSpot(r, { streak: SPOT.GOAL, time: 150 });
    expect(r).toEqual({ wins: 2, bestTime: 150, bestStreak: SPOT.GOAL });
    expect(recordSpot(r, { streak: SPOT.GOAL, time: 300 }).bestTime).toBe(150);
  });
});
