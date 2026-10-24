import { describe, it, expect } from 'vitest';
import { createLevel, TILE } from '../src/core/level.js';
import { poser } from '../src/core/objects.js';
import { SHADOW_KINDS, shadowAlpha, contactShadowPlan } from '../src/core/contact-shadows.js';

function room() {
  const l = createLevel({ theme: 'office', w: 12, h: 12 });
  for (let z = 1; z < 11; z++) for (let x = 1; x < 11; x++) l.tiles[z * l.w + x] = TILE.FLOOR;
  return l;
}
describe('contact shadow receivers', () => {
  it('has soft bounded masks, with distinct round bases and furniture feet', () => {
    for (const kind of SHADOW_KINDS)
      for (let x = -1; x <= 1; x += 0.1)
        for (let z = -1; z <= 1; z += 0.1) {
          const a = shadowAlpha(kind, x, z);
          expect(a).toBeGreaterThanOrEqual(0);
          expect(a).toBeLessThanOrEqual(0.5);
        }
    expect(shadowAlpha('box', 1, 1)).toBe(0);
    expect(shadowAlpha('round', 0.7, 0.7)).toBeLessThan(shadowAlpha('box', 0.7, 0.7));
    expect(shadowAlpha('legs', 0.6, 0.6)).toBeGreaterThan(shadowAlpha('legs', 0, 0) * 3);
  });
  it('clips broad footprints away from walls, pool openings and a lower floor', () => {
    const l = room(),
      o = { id: 'vhsshelf', x: 5, z: 5, rot: 0 };
    l.objects = [o];
    l.tiles[5 * l.w + 4] = TILE.WATER;
    l.tiles[5 * l.w + 6] = TILE.WALL;
    l.floors[6 * l.w + 5] = 10;
    const plan = contactShadowPlan(l, o, poser(l));
    expect(plan.patches.length).toBeGreaterThan(0);
    for (const [a, b, c, d] of plan.patches) {
      const x = Math.floor((a + c) / 2),
        z = Math.floor((b + d) / 2);
      expect(l.tiles[z * l.w + x]).toBe(TILE.FLOOR);
      expect(l.floors[z * l.w + x]).toBe(0);
    }
  });
  it('keeps a computer shadow on its desk and within the tabletop', () => {
    const l = room();
    l.objects = [
      { id: 'desk2', x: 5, z: 5, rot: 0 },
      { id: 'retropcdesktop', x: 5, z: 5, rot: 0 },
    ];
    const plan = contactShadowPlan(l, l.objects[1], poser(l));
    expect(plan.y).toBeCloseTo(0.8);
    expect(plan.patches).toHaveLength(1);
    const b = plan.patches[0];
    expect(b[0]).toBeGreaterThanOrEqual(4.8);
    expect(b[2]).toBeLessThanOrEqual(6.2);
    expect(b[1]).toBeGreaterThanOrEqual(5.125);
    expect(b[3]).toBeLessThanOrEqual(5.875);
  });
  it('omits floating/mounted objects and follows a stacked block receiver', () => {
    const l = room();
    l.objects = [
      { id: 'fan', x: 4, z: 4, rot: 0 },
      { id: 'clock', x: 4, z: 5, rot: 0 },
      { id: 'duck', x: 3, z: 3, rot: 0 },
      { id: 'softblock', x: 6, z: 6, rot: 0 },
      { id: 'softcube', x: 6, z: 6, rot: 0 },
    ];
    l.tiles[3 * l.w + 3] = TILE.WATER;
    const pose = poser(l);
    for (const o of l.objects.slice(0, 3)) expect(contactShadowPlan(l, o, pose)).toBeNull();
    expect(contactShadowPlan(l, l.objects[4], pose).y).toBeCloseTo(0.6);
  });
});
