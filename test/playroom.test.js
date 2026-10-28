import { describe, it, expect } from 'vitest';
import { createLevel, TILE, WATER_SURFACE } from '../src/core/level.js';
import { getTheme } from '../src/core/themes.js';
import { generateLevel, presetById } from '../src/gen/index.js';
import { slidePath } from '../src/core/slides.js';
import { ballLayout, BALL_RADIUS } from '../src/world/ball-layout.js';

function pit() {
  const level = createLevel({ w: 8, h: 8, theme: 'playroom' });
  for (let z = 1; z < 5; z++) for (let x = 1; x < 5; x++) level.tiles[z * 8 + x] = TILE.FLOOR;
  level.tiles[2 * 8 + 2] = TILE.WATER;
  level.tiles[2 * 8 + 3] = TILE.WATER;
  return level;
}

describe('ballbinger', () => {
  it('lekerommet fyller bassengene med baller i fire farger', () => {
    const theme = getTheme('playroom');
    expect(theme.pit).toBe('balls');
    expect(theme.pitColors).toHaveLength(4);
  });

  it('ballene ligger i bassengrutene, ved overflaten, og er like hver gang', () => {
    const level = pit();
    const balls = ballLayout(level, null, 4);
    expect(balls.length).toBeGreaterThan(60);
    for (const b of balls) {
      expect(Math.floor(b.z)).toBe(2);
      expect([2, 3]).toContain(Math.floor(b.x));
      expect(Math.abs(b.y - WATER_SURFACE)).toBeLessThan(BALL_RADIUS * 3);
    }
    expect(ballLayout(level, null, 4)).toEqual(balls);
  });

  it('alle fire farger er med, omtrent like ofte', () => {
    const counts = [0, 0, 0, 0];
    for (const b of ballLayout(pit(), null, 4)) counts[b.color]++;
    const total = counts.reduce((a, b) => a + b, 0);
    for (const c of counts) expect(c / total).toBeGreaterThan(0.12);
  });

  it('lyset hentes fra lysfeltet over bingen', () => {
    const field = { sample: () => [0.5, 0.4, 0.3] };
    expect(ballLayout(pit(), field, 4)[0].light).toEqual([0.5, 0.4, 0.3]);
  });
});

describe('lekerommet', () => {
  it('genererte lekerom er gyldige; sklie (om den finnes) ender i vann', () => {
    for (let seed = 1; seed <= 8; seed++) {
      const level = generateLevel({ theme: 'playroom', w: 48, h: 40, seed });
      expect(level.tiles.filter((t) => t === TILE.FLOOR).length).toBeGreaterThan(80);
      for (const slide of level.slides) {
        const [ex, ez] = slide.points.at(-1);
        expect(level.tiles[ez * level.w + ex]).toBe(TILE.WATER);
        expect(slidePath(level, slide).problem).toBeNull();
      }
    }
  });

  it('lekerom varierer: noen har stor ballbinge med sklie, andre åpen lekesal', () => {
    let withSlide = 0, withLargePit = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const level = generateLevel({ theme: 'playroom', w: 48, h: 40, seed });
      if (level.slides.length > 0) withSlide++;
      if (level.tiles.filter((t) => t === TILE.WATER).length > 100) withLargePit++;
    }
    expect(withSlide).toBeGreaterThan(2);     // variant A forekommer
    expect(withSlide).toBeLessThan(18);       // ikke alle (B og C har ingen sklie)
    expect(withLargePit).toBeGreaterThan(3);  // noen rom har stor ballbinge
  });

  it('eksempelet «The Playroom» finnes og bruker lekeromstemaet', () => {
    const level = presetById('playroom').make();
    expect(level.theme).toBe('playroom');
    expect(level.slides).toHaveLength(1);
  });
});
