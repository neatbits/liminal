import { describe, expect, it } from 'vitest';
import { createLevel, TILE, LIGHT } from '../src/core/level.js';
import { toolById, paintAt, paintLine, applyRect, applyFill, placeSpawn, aimSpawn } from '../src/editor/tools.js';
import { Viewport } from '../src/editor/viewport.js';

const count = (arr, v) => arr.filter((x) => x === v).length;

describe('verktøy', () => {
  it('pensel med størrelse 3 maler 9 ruter, viskelær maler tilbake', () => {
    const level = createLevel({ w: 10, h: 10 });
    paintAt(level, toolById('floor'), 5, 5, 3, false);
    expect(count(Array.from(level.tiles), TILE.FLOOR)).toBe(9);
    paintAt(level, toolById('floor'), 5, 5, 1, true);
    expect(count(Array.from(level.tiles), TILE.FLOOR)).toBe(8);
  });

  it('linje fyller hull mellom to punkter', () => {
    const level = createLevel({ w: 12, h: 12 });
    paintLine(level, toolById('water'), [1, 1], [9, 1], 1, false);
    expect(count(Array.from(level.tiles), TILE.WATER)).toBe(9);
  });

  it('lys settes bare på åpne ruter', () => {
    const level = createLevel({ w: 10, h: 10 });
    expect(paintAt(level, toolById('light'), 3, 3, 1, false)).toBe(0);
    paintAt(level, toolById('floor'), 3, 3, 1, false);
    expect(paintAt(level, toolById('flicker'), 3, 3, 1, false)).toBe(1);
    expect(level.lights[33]).toBe(LIGHT.FLICKER);
  });

  it('rektangel med lysverktøy gir lys i mønster', () => {
    const level = createLevel({ w: 14, h: 14 });
    applyRect(level, toolById('floor'), { x0: 1, z0: 1, x1: 12, z1: 12 }, false, 3);
    const placed = applyRect(level, toolById('light'), { x0: 1, z0: 1, x1: 12, z1: 12 }, false, 3);
    expect(placed).toBeGreaterThanOrEqual(16);
    applyRect(level, toolById('light'), { x0: 0, z0: 0, x1: 13, z1: 13 }, true, 3);
    expect(level.lights.every((l) => l === 0)).toBe(true);
  });

  it('fyll med lysverktøy lyser opp hele det åpne rommet', () => {
    const level = createLevel({ w: 14, h: 8 });
    applyRect(level, toolById('floor'), { x0: 1, z0: 1, x1: 12, z1: 6 }, false, 3);
    expect(applyFill(level, toolById('light'), 2, 2, false, 3)).toBeGreaterThan(4);
  });

  it('soneverktøy maler høyden de får, og viskelær nullstiller', () => {
    const level = createLevel({ w: 12, h: 8 });
    applyRect(level, toolById('floor'), { x0: 1, z0: 1, x1: 10, z1: 6 }, false, 3);
    const ceiling = { ...toolById('ceiling'), value: 4.2 };
    expect(ceiling.kind).toBe('zone');
    expect(paintAt(level, ceiling, 3, 3, 3, false)).toBe(9);
    expect(level.ceilings[3 * 12 + 3]).toBe(42);
    paintAt(level, ceiling, 3, 3, 1, true);
    expect(level.ceilings[3 * 12 + 3]).toBe(0);
    expect(applyRect(level, ceiling, { x0: 0, z0: 0, x1: 11, z1: 7 }, false, 3)).toBe(60 - 8); // 8 hadde verdien
    expect(applyFill(level, { ...ceiling, value: 3 }, 5, 5, false, 3)).toBe(60);
    expect(level.ceilings[1 * 12 + 1]).toBe(30);
  });

  it('dybdeverktøyet virker bare på vann', () => {
    const level = createLevel({ w: 12, h: 8 });
    applyRect(level, toolById('floor'), { x0: 1, z0: 1, x1: 10, z1: 6 }, false, 3);
    applyRect(level, toolById('water'), { x0: 4, z0: 2, x1: 6, z1: 4 }, false, 3);
    const depth = { ...toolById('depth'), value: 2.5 };
    expect(applyRect(level, depth, { x0: 0, z0: 0, x1: 11, z1: 7 }, false, 3)).toBe(9);
    expect(applyFill(level, { ...depth, value: 1 }, 5, 3, false, 3)).toBe(9);
    expect(level.depths[3 * 12 + 5]).toBe(10);
  });

  it('startpunkt plasseres midt i ruten og kan siktes', () => {
    const level = createLevel({ w: 10, h: 10 });
    placeSpawn(level, 3.2, 4.9);
    expect(level.spawn).toMatchObject({ x: 3.5, z: 4.5 });
    expect(aimSpawn(level, 3.5, 1)).toBe(true);
    expect(level.spawn.a).toBeCloseTo(0, 5);
  });
});

describe('viewport', () => {
  it('zoom holder punktet under pekeren fast', () => {
    const v = new Viewport();
    const before = v.toWorld(200, 150);
    v.zoomAt(200, 150, 1.7);
    const after = v.toWorld(200, 150);
    expect(after[0]).toBeCloseTo(before[0], 6);
    expect(after[1]).toBeCloseTo(before[1], 6);
  });

  it('tilpass sentrerer rommet i visningen', () => {
    const v = new Viewport();
    v.fit(40, 20, 800, 600, 30, 22);
    const [x0] = v.toScreen(0, 0);
    const [x1] = v.toScreen(40, 0);
    expect((x0 + x1) / 2).toBeCloseTo(30 + (800 - 30) / 2, 6);
  });
});
