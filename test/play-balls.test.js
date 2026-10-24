import { describe, expect, it } from 'vitest';
import { createLevel, TILE } from '../src/core/level.js';
import { objectPose, objectFits, MAX_OBJECTS, placeObject } from '../src/core/objects.js';
import { PLAY_BALL_LIMIT, pitBallY } from '../src/core/play-balls.js';
import { levelToJSON, levelFromJSON, encodeLevel, decodeLevel } from '../src/core/serialize.js';
import { generateLevel, presetById } from '../src/gen/index.js';
import { ballLayout } from '../src/world/ball-layout.js';

describe('løse lekeballer', () => {
  // Genererer også 128 × 128 to ganger. Dette er en funksjonstest, ikke en ytelsesgrense.
  it.each([[32, 28], [48, 40], [96, 80], [128, 128]].flatMap(([w, h]) => [1, 6].map((seed) => [w, h, seed])))(
    'har tilfeldig, repeterbar plassering på gulv og i binger (%s × %s, frø %s)', (w, h, seed) => {
      const level = generateLevel({ theme: 'playroom', w, h, seed });
      const balls = level.objects.filter((o) => o.id === 'playball');
      expect(balls.length).toBeGreaterThan(0);
      expect(balls.length).toBeLessThanOrEqual(PLAY_BALL_LIMIT);
      expect(level.objects.length).toBeLessThanOrEqual(MAX_OBJECTS);
      expect(balls.some((o) => level.tiles[o.z * w + o.x] === TILE.FLOOR)).toBe(true);
      expect(balls.some((o) => level.tiles[o.z * w + o.x] === TILE.WATER)).toBe(true);
      for (const o of balls) {
        expect(objectFits(level, o)).toBe(true);
        const p = objectPose(level, o);
        expect(Math.abs(p.x - o.x - 0.5)).toBeLessThanOrEqual(0.28);
        expect(Math.abs(p.z - o.z - 0.5)).toBeLessThanOrEqual(0.28);
      }
      expect(generateLevel({ theme: 'playroom', w, h, seed }).objects).toEqual(level.objects);
  }, 15000);

  it('lagrer type, farge og plassering gjennom JSON og delingslenker', async () => {
    const level = presetById('playroom').make();
    const balls = level.objects.filter((o) => o.id === 'playball');
    expect(balls.length).toBeGreaterThan(0);
    for (const copy of [levelFromJSON(levelToJSON(level)), await decodeLevel(await encodeLevel(level))]) {
      expect(copy.objects.filter((o) => o.id === 'playball')).toEqual(balls);
      expect(balls.map((o) => objectPose(copy, o))).toEqual(balls.map((o) => objectPose(level, o)));
    }
  });

  it('kan settes inn manuelt i en ballbinge, men ikke i vann i Poolrooms', () => {
    const level = createLevel({ theme: 'playroom', w: 8, h: 8 });
    level.tiles[3 * 8 + 3] = TILE.WATER;
    expect(placeObject(level, 3, 3, 'playball')).toBe(1);
    level.theme = 'pool'; level.objects = [];
    expect(placeObject(level, 3, 3, 'playball')).toBe(0);
  });

  it('topplaget har sammenhengende hauger over flere ruter, uten å øke antall baller', () => {
    expect(Math.abs(pitBallY(8 - 0.0001, 7) - pitBallY(8 + 0.0001, 7))).toBeLessThan(0.0001);
    const level = createLevel({ theme: 'playroom', w: 16, h: 16 });
    for (let z = 1; z < 15; z++) for (let x = 1; x < 15; x++) level.tiles[z * 16 + x] = TILE.WATER;
    const balls = ballLayout(level), upper = balls.filter((b) => b.y > pitBallY(b.x, b.z) - 0.03);
    expect(upper.length).toBe(196 * 36);
    expect(Math.max(...upper.map((b) => b.y)) - Math.min(...upper.map((b) => b.y))).toBeGreaterThan(0.11);
  });
});
