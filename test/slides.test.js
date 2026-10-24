import { describe, expect, it } from 'vitest';
import { createLevel, resizeLevel, TILE } from '../src/core/level.js';
import { fillTiles, rectIndices } from '../src/core/ops.js';
import { fillZone } from '../src/core/zones.js';
import { ceilingAt } from '../src/core/heights.js';
import { History } from '../src/core/history.js';
import { SLIDE, slideProblem, slidePath, addSlide, slidesAt, removeSlidesAt, slideEntry } from '../src/core/slides.js';
import { railSides } from '../src/core/railings.js';
import { levelFromJSON, levelToJSON } from '../src/core/serialize.js';
import { buildSlides, spanAt } from '../src/world/slides.js';
import { moveCircle } from '../src/world/collision.js';
import { extendSlidePath } from '../src/editor/tools.js';
import { presetById, generateLevel } from '../src/gen/index.js';

// 22 × 12: plattform i 2 m (x 2–4, z 2–4) og basseng (x 9–19, z 3–9). Tak 2,6 m.
function poolHall() {
  const level = createLevel({ w: 22, h: 12, height: 2.6, theme: 'pool' });
  fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 20, z1: 10 }), TILE.FLOOR);
  fillZone(level, 'floor', rectIndices(level, { x0: 2, z0: 2, x1: 4, z1: 4 }), 2);
  fillTiles(level, rectIndices(level, { x0: 9, z0: 3, x1: 19, z1: 9 }), TILE.WATER);
  return level;
}
// Fra plattformen østover, en sving ned mot sør og ut i bassenget.
const ROUTE = [[4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [10, 4], [10, 5], [11, 6], [12, 6]];

describe('vannsklier', () => {
  it('må starte på et hevet gulv, ende over vann og ikke gå gjennom vegger', () => {
    const level = poolHall();
    expect(slideProblem(level, ROUTE)).toBeNull();
    expect(slideProblem(level, [[6, 3], [12, 6]])).toMatch(/floor raised/);
    expect(slideProblem(level, [[4, 3], [7, 3]])).toMatch(/end over water/);
    level.tiles[3 * 22 + 6] = TILE.PILLAR;
    expect(slideProblem(level, ROUTE)).toMatch(/in the way/);
  });

  it('banen faller jevnt fra plattformen til litt over vannet og krenger i svingen', () => {
    const level = poolHall();
    const path = slidePath(level, { points: ROUTE, tube: false });
    const { samples } = path;
    expect(samples[0]).toMatchObject({ x: 4.5, z: 3.5, y: 2 + SLIDE.LIP });
    expect(samples[samples.length - 1].y).toBeCloseTo(SLIDE.EXIT, 6);
    for (let i = 1; i < samples.length; i++) expect(samples[i].y).toBeLessThanOrEqual(samples[i - 1].y + 1e-9);
    expect(path.length).toBeGreaterThan(8);
    expect(Math.max(...samples.map((s) => Math.abs(s.bank)))).toBeGreaterThan(0.1);
    expect(path.supports.length).toBeGreaterThan(0);
  });

  it('løfter taket der rennen trenger plass, og kan fjernes igjen', () => {
    const level = poolHall();
    expect(addSlide(level, ROUTE)).toBe(1);
    expect(ceilingAt(level, 5, 3)).toBeGreaterThanOrEqual(slidePath(level, level.slides[0]).samples[5].y + SLIDE.CLEARANCE - 0.1);
    expect(slidesAt(level, 10, 4)).toEqual([0]);
    expect(removeSlidesAt(level, 10, 4)).toBe(1);
    expect(level.slides).toHaveLength(0);
  });

  it('dragningen kan gå tilbake over seg selv', () => {
    const pts = [[4, 3]];
    extendSlidePath(pts, [7, 3]);
    expect(pts).toHaveLength(4);
    extendSlidePath(pts, [6, 3]);
    expect(pts).toEqual([[4, 3], [5, 3], [6, 3]]);
  });

  it('lagres, angres og flyttes med når rommet endrer størrelse', () => {
    const level = poolHall();
    const history = new History();
    history.push(level);
    addSlide(level, ROUTE, true);
    const back = levelFromJSON(JSON.parse(JSON.stringify(levelToJSON(level))));
    expect(back.slides).toEqual([{ points: ROUTE, tube: true, color: 'blue' }]);
    const big = resizeLevel(level, 26, 12);
    expect(big.slides[0].points[0]).toEqual([6, 3]);
    history.undo(level);
    expect(level.slides).toHaveLength(0);
    const bad = levelToJSON(back);
    bad.slides[0].points[0] = [99, 3];
    expect(() => levelFromJSON(bad)).toThrow('Invalid slides');
  });

  it('vernet på plattformen får en åpning der sklien går ut', () => {
    const level = poolHall();
    expect(railSides(level, 4, 3).map((r) => `${r.dx},${r.dz}`)).toContain('1,0');
    addSlide(level, ROUTE);
    expect(railSides(level, 4, 3).map((r) => `${r.dx},${r.dz}`)).not.toContain('1,0');
    // Rennen er bred: vernet på naboruten, som rennen passerer tett forbi, må også vekk.
    expect(railSides(level, 4, 2).map((r) => `${r.dx},${r.dz}`)).not.toContain('1,0');
    expect(railSides(level, 4, 4).map((r) => `${r.dx},${r.dz}`)).not.toContain('1,0');
    // Men lenger unna står vernet.
    expect(railSides(level, 3, 4).map((r) => `${r.dx},${r.dz}`)).toContain('0,1');
  });

  it('bygger renne eller rør med støtteben – men ikke sklier som ikke virker', () => {
    const level = poolHall();
    addSlide(level, ROUTE, false);
    const open = buildSlides(level, null);
    level.slides = [{ points: ROUTE, tube: true, color: 'blue' }];
    const tube = buildSlides(level, null);
    expect(open.slideIn_blue.quadCount).toBeGreaterThan(100);
    expect(tube.slideIn_blue.quadCount).toBeGreaterThan(open.slideIn_blue.quadCount); // eget tak over rennen
    expect(open.slideLeg.quadCount).toBeGreaterThan(0);
    level.slides = [{ points: [[6, 3], [12, 6]], tube: false }];
    expect(buildSlides(level, null).slideIn_blue.quadCount).toBe(0);
  });

  it('har farge: lagres, havner i riktig 3D-materiale og varierer i generatoren', () => {
    const level = poolHall();
    addSlide(level, ROUTE, false, 'red');
    expect(levelFromJSON(JSON.parse(JSON.stringify(levelToJSON(level)))).slides[0].color).toBe('red');
    const meshes = buildSlides(level, null);
    expect(meshes.slideIn_red.quadCount).toBeGreaterThan(0);
    expect(meshes.slideIn_blue.quadCount).toBe(0);
    const colors = new Set();
    for (let seed = 1; seed <= 30; seed++) for (const s of generateLevel({ theme: 'pool', w: 48, h: 48, seed }).slides) colors.add(s.color);
    expect(colors.size).toBeGreaterThan(2);
  });

  it('røret er åpent ved inngangen og lukket lenger ned', () => {
    const level = poolHall();
    addSlide(level, ROUTE, true);
    const { slideOut_blue: out, slideIn_blue: inside } = buildSlides(level, null);
    // Kanten øverst (leppa) finnes bare der rennen er åpen: noen, men færre enn for en åpen renne.
    level.slides = [{ ...level.slides[0], tube: false }];
    const { slideOut_blue: open, slideIn_blue: openInside } = buildSlides(level, null);
    expect(out.quadCount - inside.quadCount).toBeLessThan(open.quadCount - openInside.quadCount);
  });

  it('Poolrooms-eksempelet får en sklie som virker, med trapp opp til plattformen', () => {
    const level = presetById('pools').make();
    expect(level.slides).toHaveLength(1);
    expect(slidePath(level, level.slides[0]).problem).toBeNull();
    expect(level.tiles.some((t) => t === TILE.STAIRS)).toBe(true);
  });

  it('i genererte rom med sklie er taket høyt i hele bassengrommet', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const level = generateLevel({ theme: 'pool', w: 48, h: 48, seed });
      if (!level.slides.length) continue;
      const path = slidePath(level, level.slides[0]);
      const [sx, sz] = level.slides[0].points[0];
      const [ex, ez] = level.slides[0].points.at(-1);
      // Taket over plattformen og over enden av sklien (i bassenget) er like høyt.
      const top = ceilingAt(level, sx, sz);
      expect(top).toBeCloseTo(Math.max(level.height, path.h0 + 2.5), 6);
      expect(ceilingAt(level, ex, ez)).toBeCloseTo(top, 6);
    }
  });

  it('rennen stopper spilleren der den er lav, men inngangen er fri', () => {
    const level = poolHall();
    addSlide(level, [[4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3]]);
    // Langs gulvet under sklien der den er lav (nær bassenget), på tvers av den.
    const [, z] = moveCircle(level, 8.5, 5.5, 0, -4, 0.28, true);
    expect(z).toBeGreaterThan(4);
    // På plattformen kan man gå helt bort til toppen.
    const path = slidePath(level, level.slides[0]);
    const [x] = moveCircle(level, 2.5, 3.5, 2, 0, 0.28, true);
    expect(x).toBeCloseTo(4.5, 6);
    expect(slideEntry(level, 4.5, 3.5, 2)).toBe(path);
    expect(slideEntry(level, 4.5, 3.5, 0)).toBeNull();
  });
});

describe('starten på sklien', () => {
  it('har høyere sider de første metrene, som slakker av til vanlig renne', () => {
    expect(spanAt(false, 0)).toBeGreaterThan(spanAt(false, 0.6));
    expect(spanAt(false, 0.6)).toBeGreaterThan(spanAt(false, 2));
    expect(spanAt(false, 2)).toBeCloseTo(spanAt(false, 5), 9);
    // Røret lukker seg likevel helt etter inngangen.
    expect(spanAt(true, 3)).toBeCloseTo(Math.PI, 6);
  });
});
