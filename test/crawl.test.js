import { describe, it, expect } from 'vitest';
import { createLevel, TILE, LIGHT, CRAWL_HEIGHT, setLight } from '../src/core/level.js';
import { autoLights } from '../src/core/ops.js';
import { ceilingAt, headAt } from '../src/core/heights.js';
import { CRAWL, canStand, crawlAhead, crawlPrompt, crawlNooks } from '../src/core/crawl.js';
import { levelToJSON, levelFromJSON } from '../src/core/serialize.js';
import { moveCircle } from '../src/world/collision.js';
import { Walker } from '../src/view3d/walker.js';
import { getTheme } from '../src/core/themes.js';
import { createLightField } from '../src/world/lighting.js';
import { distanceMap, passable } from '../src/world/paths.js';
import { paintAt, toolById } from '../src/editor/tools.js';

/** To rom med en vegg imellom, og en gang gjennom den (rad 6, x = 7–10). */
export function tunnel() {
  const l = createLevel({ theme: 'backrooms', w: 18, h: 13, height: 3 });
  for (let z = 1; z < 12; z++) {
    for (let x = 1; x < 17; x++) if (x < 7 || x > 10) l.tiles[z * l.w + x] = TILE.FLOOR;
  }
  for (let x = 7; x <= 10; x++) l.tiles[6 * l.w + x] = TILE.CRAWL;
  l.spawn = { x: 3.5, z: 6.5, a: -Math.PI / 2 };
  return l;
}

const input = (forward, extra = {}) => ({ forward, strafe: 0, running: false, jumping: false, consumeLook: () => [0, 0], ...extra });

function walkEast(l, { down = false, seconds = 8 } = {}) {
  const w = new Walker();
  w.reset(l, { x: 5.5, z: 6.5, a: -Math.PI / 2 });
  if (down) w.toggleCrawl();
  const theme = getTheme(l.theme);
  for (let t = 0; t < seconds; t += 1 / 60) w.update(1 / 60, input(1), l, theme);
  return w;
}

describe('crawlways', () => {
  it('the ceiling is low, whatever the room height or a raised floor', () => {
    const l = tunnel();
    expect(ceilingAt(l, 8, 6)).toBe(CRAWL_HEIGHT);
    l.floors[6 * l.w + 8] = 5;
    expect(ceilingAt(l, 8, 6)).toBeCloseTo(0.5 + CRAWL_HEIGHT);
    expect(headAt(l, 8.5, 6.5, 0.5)).toBeCloseTo(1.4);
  });

  it('survives JSON and keeps old rooms readable', () => {
    const back = levelFromJSON(levelToJSON(tunnel()));
    expect(back.tiles[6 * back.w + 8]).toBe(TILE.CRAWL);
    expect(ceilingAt(back, 8, 6)).toBe(CRAWL_HEIGHT);
    const old = levelToJSON(createLevel({ w: 8, h: 8 }));
    expect(() => levelFromJSON({ ...old, v: 4 })).not.toThrow();
  });

  it('you cannot walk in upright, only on all fours', () => {
    const stood = walkEast(tunnel());
    expect(stood.x).toBeLessThan(7);
    const crept = walkEast(tunnel(), { down: true, seconds: 10 });
    expect(crept.x).toBeGreaterThan(11);
  });

  it('crawling is slower than walking, and you cannot jump', () => {
    const l = tunnel();
    const w = new Walker();
    w.reset(l, { x: 8.5, z: 6.5, a: -Math.PI / 2 });
    const theme = getTheme(l.theme);
    for (let k = 0; k < 40; k++) w.update(1 / 60, input(1, { jumping: k === 20 }), l, theme);
    expect(Math.hypot(w.vx, w.vz)).toBeLessThanOrEqual(CRAWL.SPEED + 1e-6);
    expect(w.vy).toBe(0);
    expect(w.down).toBe(true);
  });

  it('you stay down until there is room, and then stand up by yourself', () => {
    const l = tunnel();
    const theme = getTheme(l.theme);
    const w = new Walker();
    w.reset(l, { x: 8.5, z: 6.5, a: -Math.PI / 2 });
    expect(w.low).toBe(1); // startpunkt i gangen
    w.toggleCrawl();
    w.toggleCrawl();
    w.update(1 / 60, input(0), l, theme);
    expect(w.down).toBe(true);
    for (let t = 0; t < 5; t += 1 / 60) w.update(1 / 60, input(1), l, theme);
    expect(w.x).toBeGreaterThan(11);
    expect(w.down).toBe(false);
  });

  it('the footprint counts: not standing with your shoulder under the lintel', () => {
    const l = tunnel();
    expect(canStand(l, 6.6, 6.5, 0)).toBe(true); // 0,4 m fra åpningen
    expect(canStand(l, 6.85, 6.5, 0)).toBe(false);
    expect(canStand(l, 8.5, 6.5, 0)).toBe(false);
  });

  it('collision uses the body you have right now', () => {
    const l = tunnel();
    expect(moveCircle(l, 6.5, 6.5, 2, 0, 0.28, true, 0)[0]).toBeLessThan(7);
    expect(moveCircle(l, 6.5, 6.5, 2, 0, 0.28, true, 0, CRAWL.BODY)[0]).toBeCloseTo(8.5);
  });

  it('hints at the opening and when you can stand up', () => {
    const l = tunnel();
    const w = { x: 6, z: 6.5, yaw: -Math.PI / 2, floorY: 0, down: false, wantDown: false };
    expect(crawlAhead(l, 6, 6.5, -Math.PI / 2)).toBe(true);
    expect(crawlAhead(l, 6, 6.5, Math.PI / 2)).toBe(false);
    expect(crawlPrompt(w, l)).toBe('C – crawl');
    expect(crawlPrompt(w, l, true)).toBe('Tap Crawl to crawl');
    expect(crawlPrompt({ ...w, down: true, wantDown: true, x: 3 }, l)).toBe('C – stand up');
    expect(crawlPrompt({ ...w, down: true, wantDown: true, x: 8.5 }, l)).toBe(null); // ikke plass
  });

  it('is dark: light from the room stops at the opening, and darker than an unlit room', () => {
    const l = tunnel();
    l.lights[6 * l.w + 5] = LIGHT.ON;
    const field = createLightField(l, getTheme(l.theme));
    const lit = (x, z) => field.sample(x, 0.01, z, 0, 1, 0)[0];
    expect(lit(9.5, 6.5)).toBeLessThan(lit(5.5, 8.5) * 0.25);
    const empty = tunnel();
    const dark = createLightField(empty, getTheme(empty.theme));
    expect(dark.sample(9.5, 0.01, 6.5, 0, 1, 0)[0]).toBeCloseTo(dark.sample(3.5, 0.01, 3.5, 0, 1, 0)[0] * CRAWL.SHADE, 5);
  });

  it('counts as open ground, unless you ask for walking only', () => {
    const l = tunnel();
    expect(passable(l, 8, 6)).toBe(true);
    expect(passable(l, 8, 6, false, true)).toBe(false);
    expect(passable(l, 8, 6, true)).toBe(false); // drømmegangen
    expect(distanceMap(l, 3, 6)[6 * l.w + 14]).toBeLessThan(Infinity);
    expect(distanceMap(l, 3, 6, false, true)[6 * l.w + 14]).toBe(Infinity);
  });

  it('finds the 2 × 2 nook at the end of a dead end', () => {
    const l = createLevel({ w: 12, h: 12 });
    for (const [x, z] of [[3, 3], [4, 3], [5, 3], [5, 4], [6, 3], [6, 4]]) l.tiles[z * l.w + x] = TILE.CRAWL;
    expect(crawlNooks(l)).toEqual([3 * l.w + 5]);
  });

  it('never has lights, so it stays dark', () => {
    const l = tunnel();
    expect(setLight(l, 8, 6, LIGHT.ON)).toBe(false);
    autoLights(l, { spacing: 2, state: LIGHT.ON });
    expect(l.lights[6 * l.w + 8]).toBe(LIGHT.NONE);
    expect(l.lights.some((v) => v)).toBe(true);
  });

  it('can be painted and erased in the editor', () => {
    const l = createLevel({ w: 12, h: 12 });
    const t = toolById('crawl');
    expect(paintAt(l, t, 5, 5, 1, false)).toBeGreaterThan(0);
    expect(l.tiles[5 * l.w + 5]).toBe(TILE.CRAWL);
    paintAt(l, t, 5, 5, 1, true);
    expect(l.tiles[5 * l.w + 5]).toBe(TILE.WALL);
  });
});
