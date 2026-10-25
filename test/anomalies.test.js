import { describe, expect, it } from 'vitest';
import { createLevel, TILE, LIGHT } from '../src/core/level.js';
import { fillTiles, rectIndices } from '../src/core/ops.js';
import { mulberry32 } from '../src/core/rng.js';
import { getTheme } from '../src/core/themes.js';
import { DOOR, doorInfo } from '../src/core/doors.js';
import { findLoops, Loops, loopShift, textureRepeats } from '../src/world/anomalies.js';
import { corridorLevel, CORRIDOR_THEMES } from '../src/gen/corridors.js';
import { nextLevel } from '../src/gen/endless.js';
import { MOODS } from '../src/gen/moods.js';
import { presetById } from '../src/gen/index.js';
import { Walker } from '../src/view3d/walker.js';

// En rett gang 40 m lang (x 1–40), 2 m bred, med et lys hver 4. meter.
function corridor() {
  const level = createLevel({ w: 42, h: 6 });
  fillTiles(level, rectIndices(level, { x0: 1, z0: 2, x1: 40, z1: 3 }), TILE.FLOOR);
  for (let x = 1; x <= 40; x += 4) level.lights[2 * 42 + x] = LIGHT.ON;
  return level;
}

describe('ganger som er lengre innenfra enn utenfra', () => {
  it('finner en rett gang med lys i fast takt', () => {
    const [loop] = findLoops(corridor());
    expect(loop).toMatchObject({ axis: 'x', v0: 2, v1: 3, L: 4 });
    expect(loop.u1 - loop.u0).toBeGreaterThan(30);
  });

  it('ikke i en gang der mønsteret brytes, og ikke i store rom', () => {
    const broken = corridor();
    for (let x = 1; x <= 40; x += 7) broken.lights[3 * 42 + x] = LIGHT.FLICKER; // et annet mønster oppå
    broken.lights[3 * 42 + 20] = LIGHT.BROKEN;
    const loops = findLoops(broken);
    for (const l of loops) expect(l.u1 - l.u0).toBeLessThan(25);
    const hall = createLevel({ w: 30, h: 30 });
    fillTiles(hall, rectIndices(hall, { x0: 1, z0: 1, x1: 28, z1: 28 }), TILE.FLOOR);
    expect(findLoops(hall)).toEqual([]);
  });

  it('den uendelige gangen i eksemplene og korridornivåene gjentar seg', () => {
    expect(findLoops(presetById('corridor').make()).length).toBeGreaterThan(0);
    const rand = mulberry32(5);
    for (const theme of CORRIDOR_THEMES) {
      const level = corridorLevel(theme, rand, 'Level 3');
      expect(findLoops(level).length, theme).toBeGreaterThan(0);
      // Utgangen sitter i den andre enden, langt fra startpunktet.
      const exits = [];
      for (let i = 0; i < level.tiles.length; i++) if (doorInfo(level, i % level.w, (i / level.w) | 0)?.oneSided) exits.push(i % level.w);
      expect(exits).toEqual([level.w - 2]);
    }
  });

  it('man går og går, men kommer ikke fram før gangen slipper taket', () => {
    const level = corridor();
    const loops = new Loops(level, () => 0, [3, 3]); // tre runder
    const w = new Walker();
    w.reset(level, { x: 2.5, z: 3, a: -Math.PI / 2 }); // mot +x
    const input = { forward: 1, strafe: 0, running: false, consumeLook: () => [0, 0] };
    let shifts = 0;
    for (let t = 0; t < 60 && w.x < 39; t += 1 / 30) {
      const [px, pz] = [w.x, w.z];
      w.update(1 / 30, input, level, getTheme('backrooms'));
      if (loops.update(px, pz, w)) shifts++;
    }
    expect(shifts).toBe(3);
    // Gått langt lenger enn gangen er lang før man nådde enden.
    expect(w.distance).toBeGreaterThan(37 + 3 * 4 - 1);
    expect(w.x).toBeGreaterThan(38);
  });

  it('flyttingen er sømløs: samme sted i mønsteret, samme fart', () => {
    const level = corridor();
    const loops = new Loops(level, () => 0, [1, 1]);
    const { mid, L } = loops.loops[0];
    const w = { x: mid + 0.01, z: 2.7, vx: 1.5, vz: 0 };
    loops.update(mid - 0.04, 2.7, w);
    expect(w.x).toBeCloseTo(mid + 0.01 - L, 6); // uten teksturer: én periode
    expect(w.vx).toBe(1.5);
  });
});

describe('flytting som går opp i teksturene', () => {
  it('hotellteppet (1,2 m) og en periode på 8 m gir flytting på 24 m', () => {
    const loop = { L: 8, u0: 2, u1: 83, mid: 43 };
    expect(loopShift(loop, [1.2, 1.2, 1, 2, 2])).toBe(24);
    expect(loopShift(loop, [])).toBe(8);
    expect(loopShift({ L: 8, u0: 2, u1: 40, mid: 21 }, [1.2])).toBe(0); // får ikke plass
  });

  it('alle korridornivåene kan brukes med temaets teksturer', () => {
    const rand = mulberry32(8);
    for (const theme of CORRIDOR_THEMES) {
      for (let k = 0; k < 4; k++) {
        const level = corridorLevel(theme, rand, 'x');
        expect(new Loops(level, rand, [2, 2], textureRepeats(getTheme(theme))).loops.length, theme).toBeGreaterThan(0);
      }
    }
  });
});

describe('neste nivå', () => {
  it('bytter alltid tema til neste nivå – også i korridorene og betongsalene', { timeout: 30000 }, () => {
    const odds = { corridor: 0.25 };
    for (const prev of ['backrooms', 'pool', 'office', 'hotel', 'basement', 'school', 'mall', 'babbdi']) {
      for (let s = 1; s <= 30; s++) {
        const { level, kind } = nextLevel(3, prev, mulberry32(s), odds);
        expect(level.theme, `${prev} → ${kind} (seed ${s})`).not.toBe(prev);
      }
    }
  });

  it('aldri det samme rommet igjen og ingen dør tilbake, i noen stemning', { timeout: 30000 }, () => {
    for (const [id, mood] of Object.entries(MOODS)) {
      expect(Object.keys(mood.anomalies).sort(), id).toEqual(['corridor', 'loops']);
      const kinds = new Set();
      for (let s = 1; s <= 40; s++) kinds.add(nextLevel(4, 'basement', mulberry32(s), mood.anomalies).kind);
      for (const kind of kinds) expect(['room', 'corridor', 'halls'], id).toContain(kind);
    }
  });

  it('korridorene har dører videre', () => {
    const level = corridorLevel('hotel', mulberry32(2), 'x');
    const exits = [];
    for (let i = 0; i < level.tiles.length; i++) {
      const d = doorInfo(level, i % level.w, (i / level.w) | 0);
      if (d?.oneSided && d.state === DOOR.CLOSED) exits.push(d);
    }
    expect(exits.length).toBeGreaterThan(0);
  });
});
