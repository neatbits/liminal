import { describe, expect, it } from 'vitest';
import { createLevel, setTile, TILE } from '../src/core/level.js';
import { fillRect } from '../src/gen/util.js';
import { LED_POWER, ledFaces, ledLights, ledFillCells, paintLeds } from '../src/core/leds.js';
import { PANEL_COLORS, panelCells, panelLights, paintPanels } from '../src/core/panels.js';
import { applyFill, applyRect, paintAt, toolById } from '../src/editor/tools.js';
import { collectLights } from '../src/world/lighting.js';

/** To rom (x 1–3 og 5–7) skilt av veggen x = 4, i et 9 × 6-kart. */
function rooms() {
  const level = createLevel({ w: 9, h: 6, height: 3 });
  fillRect(level, 1, 1, 3, 4, TILE.FLOOR);
  fillRect(level, 5, 1, 7, 4, TILE.FLOOR);
  return level;
}
const at = (level, x, z) => z * level.w + x;

describe('LED-striper', () => {
  it('gir én flate per nabo man kan stå i, med taket over naboen', () => {
    const level = rooms();
    level.ceilings[at(level, 5, 2)] = 40;
    level.leds[at(level, 4, 2)] = 3;
    const faces = ledFaces(level);
    expect(faces.map(({ dx, dz }) => [dx, dz])).toEqual([[1, 0], [-1, 0]]);
    expect(faces.find((f) => f.dx === 1)).toMatchObject({ x: 4, z: 2, color: 3, ceil: 4 });
    expect(faces.find((f) => f.dx === -1).ceil).toBe(3);
  });

  it('hopper over dører, skrå hjørner og ruter som ikke er vegg; trapper og vann får stripe', () => {
    const level = rooms();
    level.leds[at(level, 4, 1)] = 1;
    setTile(level, 3, 1, TILE.DOOR);
    setTile(level, 5, 1, TILE.STAIRS);
    level.leds[at(level, 4, 3)] = 1;
    setTile(level, 3, 3, TILE.WATER);
    level.corners[at(level, 5, 3)] = 1;
    level.leds[at(level, 2, 2)] = 1; // gulv
    expect(ledFaces(level).map(({ x, z, dx }) => [x, z, dx])).toEqual([[4, 1, 1], [4, 3, -1]]);
  });

  it('lyset sitter like under remsen, litt ut i naboruten, med svak styrke per meter', () => {
    const level = rooms();
    level.leds[at(level, 4, 2)] = 2;
    const [right] = ledLights(level).filter((l) => l.cx === 5);
    expect(right).toMatchObject({ cz: 2, z: 2.5, power: LED_POWER, object: true, hex: '#00e5d4' });
    expect(right.x).toBeGreaterThan(5);
    expect(right.x).toBeLessThan(5.5);
    expect(right.y).toBeGreaterThan(2.5);
    expect(right.y).toBeLessThan(3);
  });

  it('males bare på vegger, og setTile fjerner stripen når veggen blir noe annet', () => {
    const level = rooms();
    expect(paintLeds(level, [at(level, 4, 2), at(level, 2, 2)], 5)).toBe(1);
    expect(level.leds[at(level, 2, 2)]).toBe(0);
    setTile(level, 4, 2, TILE.FLOOR);
    expect(level.leds[at(level, 4, 2)]).toBe(0);
    setTile(level, 4, 2, TILE.WALL);
    expect(level.leds[at(level, 4, 2)]).toBe(0);
  });

  it('Fill i et rom gir veggene rundt det rommet, ikke hele det sammenhengende veggnettet', () => {
    const level = rooms();
    const cells = ledFillCells(level, 2, 2);
    expect(cells).toHaveLength(4 * 2 + 3 * 2); // 4 ruter høyt og 3 bredt, uten hjørnene
    expect(cells.every((i) => level.tiles[i] === TILE.WALL)).toBe(true);
    expect(cells.some((i) => i % level.w > 4)).toBe(false);
    expect(ledFillCells(level, 4, 2)).toEqual([at(level, 4, 2)]);
    expect(ledFillCells(level, -1, 2)).toEqual([]);
  });
});

describe('lyspaneler', () => {
  it('ligger der man står, ikke i vegger, søyler, døråpninger eller under for lave tak', () => {
    const level = rooms();
    expect(paintPanels(level, [at(level, 2, 2), at(level, 4, 2), at(level, 6, 2)], 2)).toBe(2);
    setTile(level, 2, 4, TILE.DOOR);
    level.panels[at(level, 2, 4)] = 1;
    expect(panelCells(level).map(({ x, z, type }) => [x, z, type])).toEqual([[2, 2, 2], [6, 2, 2]]);
    setTile(level, 6, 2, TILE.PILLAR);
    expect(level.panels[at(level, 6, 2)]).toBe(0);
  });

  it('gir ett lys per rute, 10 cm under taket, med paneltypens styrke', () => {
    const level = rooms();
    level.panels[at(level, 2, 2)] = 1;
    level.panels[at(level, 6, 2)] = 3;
    const [white, dim] = panelLights(level);
    expect(white).toMatchObject({ x: 2.5, z: 2.5, power: PANEL_COLORS[1].power, object: true });
    expect(white.y).toBeCloseTo(2.9);
    expect(dim.power).toBeLessThan(white.power);
  });

  it('bakingen får lineære farger (rgb) for både striper og paneler', () => {
    const level = rooms();
    level.leds[at(level, 4, 2)] = 8;
    level.panels[at(level, 2, 2)] = 1;
    const colored = collectLights(level).filter((l) => l.object && l.rgb);
    expect(colored).toHaveLength(3);
    for (const l of colored) {
      expect(l.hex).toBeUndefined();
      expect(l.rgb.every((c) => c >= 0 && c <= 1)).toBe(true);
    }
  });
});

describe('verktøyene LED Strip og Ceiling panel', () => {
  const led = { ...toolById('led'), value: 4 };
  const panel = { ...toolById('panel'), value: 2 };

  it('pensel, rektangel og fill maler og visker ut', () => {
    const level = rooms();
    expect(paintAt(level, led, 4, 2, 3, false)).toBe(3);
    expect(paintAt(level, led, 0, 0, 3, false)).toBe(3); // utenfor kartet og gulvet (1, 1) hoppes over
    expect(paintAt(level, led, 4, 2, 1, true)).toBe(1);
    expect(applyRect(level, panel, { x0: 0, z0: 0, x1: 8, z1: 5 }, false)).toBe(24);
    expect(applyFill(level, panel, 2, 2, true)).toBe(12);
    expect(panelCells(level).every(({ x }) => x > 4)).toBe(true);
    expect(applyFill(level, led, 6, 2, false)).toBeGreaterThan(0);
    expect(level.leds[at(level, 8, 2)]).toBe(4);
    expect(paintAt(level, { ...toolById('led') }, 4, 4, 1, false)).toBe(1);
    expect(level.leds[at(level, 4, 4)]).toBe(1); // uten valgt farge: rosa
  });
});
