import { describe, expect, it } from 'vitest';
import { createLevel, TILE } from '../src/core/level.js';
import { fillRect } from '../src/gen/util.js';
import { groundAt, stairSpan } from '../src/core/heights.js';
import { isEscalator } from '../src/core/escalators.js';
import { RAMP, RAMP_RISE, isRamp, placeRamp } from '../src/core/ramps.js';
import { placeStairs } from '../src/core/stairs.js';
import { railSides } from '../src/core/railings.js';
import { levelToJSON, levelFromJSON } from '../src/core/serialize.js';
import { surfaceHeight, stepBreaks } from '../src/world/stairs.js';
import { buildSurfaces } from '../src/world/surfaces.js';
import { applyStairs, toolById } from '../src/editor/tools.js';
import { generateLevel, presetById } from '../src/gen/index.js';
import { reachableCells } from '../src/gen/tapes.js';
import { GUARD_DROP } from '../src/core/railings.js';

/** En gang langs x (z = 2–3) med vegg på begge sider. */
function corridor() {
  const level = createLevel({ theme: 'backrooms', w: 16, h: 6, height: 2.8 });
  fillRect(level, 1, 2, 14, 3, TILE.FLOOR);
  return level;
}

describe('ramper', () => {
  it('er en trapp med rampebiten: ikke en rulletrapp, og den stiger jevnt', () => {
    const level = corridor();
    placeRamp(level, [3, 2], [6, 2], 2);
    for (const [x, z] of [[3, 2], [6, 3]]) {
      expect(isRamp(level, x, z)).toBe(true);
      expect(isEscalator(level, x, z)).toBe(false);
      expect(level.meta[z * level.w + x] & RAMP).toBe(RAMP);
    }
    expect(stairSpan(level, 6, 2).top).toBeCloseTo(4 * RAMP_RISE);
    // Jevnt: ingen trinn, høyden vokser lineært langs løpet.
    const ys = [3.1, 3.5, 3.9, 4.3].map((x) => groundAt(level, x, 2.5));
    for (let k = 1; k < ys.length; k++) expect(ys[k] - ys[k - 1]).toBeCloseTo(RAMP_RISE * 0.4, 5);
    expect(isRamp(level, 1, 2)).toBe(false);
  });

  it('en vanlig trapp er fortsatt en trapp, med trinn', () => {
    const level = corridor();
    placeStairs(level, [3, 2], [6, 2], 2);
    expect(isRamp(level, 3, 2)).toBe(false);
    expect(stepBreaks(level, 3, 2, [3, 2], [4, 2]).length).toBeGreaterThan(0);
  });

  it('i 3D er overflaten glatt, uten trinnkanter', () => {
    const level = corridor();
    placeRamp(level, [3, 2], [6, 2], 2);
    expect(stepBreaks(level, 4, 2, [4, 2], [5, 2])).toEqual([]);
    expect(surfaceHeight(level, 4, 2, 4.5, 2.5)).toBeCloseTo(groundAt(level, 4.5, 2.5), 5);
  });

  it('ingen loddrette kiler mellom banene i en bred rampe (bare langs kantene mot gulvet ved siden av)', () => {
    const level = createLevel({ theme: 'backrooms', w: 16, h: 12, height: 2.8 });
    fillRect(level, 1, 1, 14, 10, TILE.FLOOR);
    placeRamp(level, [4, 5], [9, 5], 6); // banene z = 3–8
    const s = buildSurfaces(level, null, { subdivide: 1 });
    for (let q = 0; q < s.wall.quadCount; q++) {
      const p = [0, 1, 2, 3].map((k) => s.wall.pos.slice((q * 4 + k) * 3, (q * 4 + k) * 3 + 3));
      const inside = p.every(([x, y, z]) => x > 4 && x < 10 && z > 3 && z < 9 && y < 1.5); // over: taket følger rampen
      expect(inside, JSON.stringify(p)).toBe(false);
    }
  });

  it('ender på et hevet gulv: stiger dit, uansett hvilken vei man drar', () => {
    for (const [a, b] of [[[3, 2], [5, 2]], [[5, 2], [3, 2]]]) {
      const level = corridor();
      fillRect(level, 6, 2, 9, 3, TILE.FLOOR);
      for (let x = 6; x <= 9; x++) for (const z of [2, 3]) level.floors[z * level.w + x] = 4;
      placeRamp(level, a, b, 2);
      expect(stairSpan(level, 5, 2).top).toBeCloseTo(0.4);
      expect(stairSpan(level, 3, 2).bottom).toBeCloseTo(0);
    }
  });

  it('ingen håndlist på veggen langs en rampe (trapper har det)', () => {
    const ramp = corridor();
    placeRamp(ramp, [3, 2], [6, 2], 2);
    expect(railSides(ramp, 4, 2).filter((r) => r.kind === 'wall')).toEqual([]);
    const stairs = corridor();
    placeStairs(stairs, [3, 2], [6, 2], 2);
    expect(railSides(stairs, 4, 2).some((r) => r.kind === 'wall')).toBe(true);
  });

  it('lagres og leses igjen uten ny formatversjon', () => {
    const level = corridor();
    placeRamp(level, [3, 2], [6, 2], 2);
    const back = levelFromJSON(JSON.parse(JSON.stringify(levelToJSON(level))));
    expect(isRamp(back, 4, 3)).toBe(true);
    expect(stairSpan(back, 6, 2).top).toBeCloseTo(stairSpan(level, 6, 2).top);
  });

  it('rampeverktøyet (G) legger en rampe, og viskelæret fjerner den', () => {
    const tool = toolById('ramp');
    expect(tool.key).toBe('G');
    const level = corridor();
    expect(applyStairs(level, [3, 2], [6, 2], 2, false, tool)).toBe(8);
    expect(isRamp(level, 5, 3)).toBe(true);
    applyStairs(level, [3, 2], [6, 2], 2, true, tool);
    expect(level.tiles[2 * level.w + 4]).toBe(TILE.FLOOR);
  });
});

describe('ramper i Level 0', () => {
  // Salen med bakke ned (gen/level0-layouts.js) er hevet med vilje og har egne tester (level0-slope.test.js).
  const levels = Array.from({ length: 30 }, (_, k) => generateLevel({ theme: 'backrooms', w: 48, h: 48, seed: k + 1 })).filter((l) => l.layout !== 'slope');
  const ramps = (l) => [...l.tiles.keys()].filter((i) => isRamp(l, i % l.w, Math.floor(i / l.w)));

  it('mange nivåer får dem, og de er slake og lave', () => {
    expect(levels.filter((l) => ramps(l).length).length).toBeGreaterThan(12);
    for (const l of levels) {
      for (const i of ramps(l)) {
        const { bottom, top } = stairSpan(l, i % l.w, Math.floor(i / l.w));
        expect(top - bottom).toBeLessThanOrEqual(0.2 + 1e-6);
      }
      for (let i = 0; i < l.tiles.length; i++) if (l.tiles[i] === TILE.FLOOR) expect(l.floors[i] / 10).toBeLessThanOrEqual(0.5);
    }
  });

  it('stenger ingenting ute: alt som er hevet eller skrår, kan nås fra start', () => {
    for (const l of levels) {
      const reach = reachableCells(l, l.spawn.x, l.spawn.z);
      for (let i = 0; i < l.tiles.length; i++) {
        if ((l.tiles[i] === TILE.FLOOR && l.floors[i]) || isRamp(l, i % l.w, Math.floor(i / l.w))) expect(reach[i], `seed ${l.seed}`).toBe(1);
      }
    }
  });

  it('de hevede flatene er lave nok til å gå opp kanten, så ingen kant får rekkverk', () => {
    for (const l of levels) {
      for (let i = 0; i < l.tiles.length; i++) {
        if (l.tiles[i] === TILE.FLOOR && l.floors[i] && !l.decks[i]) expect(l.floors[i] / 10).toBeLessThanOrEqual(GUARD_DROP + 0.05);
      }
    }
  });

  it('bare i Level 0 og ikke i eksemplene', () => {
    expect(ramps(presetById('level0').make())).toEqual([]);
    for (const theme of ['office', 'hotel', 'pool']) expect(ramps(generateLevel({ theme, w: 48, h: 48, seed: 3 }))).toEqual([]);
  });
});
