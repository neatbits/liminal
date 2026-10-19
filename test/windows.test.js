import { describe, expect, it } from 'vitest';
import { createLevel, TILE } from '../src/core/level.js';
import { fillTiles, rectIndices } from '../src/core/ops.js';
import { canHoldWindow, paintWindows, windowInfo, windows, sunPatch, SKIES, SILL } from '../src/core/windows.js';
import { levelFromJSON, levelToJSON } from '../src/core/serialize.js';
import { collectLights } from '../src/world/lighting.js';
import { buildSurfaces } from '../src/world/surfaces.js';
import { buildWindows } from '../src/world/windows.js';
import { moveCircle } from '../src/world/collision.js';
import { generateLevel } from '../src/gen/index.js';

// Rom 12 × 10 med gulv i x 1–10, z 1–8; nordveggen (z 0) har plass til vinduer.
function room() {
  const level = createLevel({ w: 12, h: 10, height: 2.7 });
  fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 10, z1: 8 }), TILE.FLOOR);
  return level;
}

describe('vinduer', () => {
  it('bare i en vegg med rom på én side', () => {
    const level = room();
    expect(canHoldWindow(level, 5, 0)).toBe(true);
    expect(canHoldWindow(level, 0, 0)).toBe(false); // hjørne: ingen åpen side
    expect(canHoldWindow(level, 5, 4)).toBe(false); // gulv
    level.tiles[4 * 12 + 5] = TILE.WALL; // frittstående vegg: rom på flere sider
    expect(canHoldWindow(level, 5, 4)).toBe(false);
  });

  it('er fortsatt vegg: stopper spilleren, og åpningen vender mot rommet', () => {
    const level = room();
    expect(paintWindows(level, [[5, 0], [6, 0]], true)).toBe(2);
    const win = windowInfo(level, 5, 0);
    expect(win.n).toEqual([0, 1]);
    expect(win.sill).toBeCloseTo(SILL);
    const [, z] = moveCircle(level, 5.5, 1.5, 0, -2, 0.28, true, 0);
    expect(z).toBeGreaterThan(1.2);
    expect(paintWindows(level, [[5, 0]], false)).toBe(1);
    expect(windows(level)).toHaveLength(1);
  });

  it('slipper inn dagslys i himmelens farge, uten armatur', () => {
    const level = room();
    paintWindows(level, [[5, 0]], true);
    level.sky = 'golden';
    const light = collectLights(level).find((l) => l.rgb);
    expect(light.object).toBe(true);
    expect(light.power).toBe(SKIES.golden.power);
    expect(light.z).toBeGreaterThan(1);
  });

  it('sola gir en flekk på gulvet innenfor rommet – men ikke om natta', () => {
    const level = room();
    paintWindows(level, [[5, 0]], true);
    const win = windowInfo(level, 5, 0);
    const patch = sunPatch(level, win, SKIES.golden.sun);
    expect(patch.points).toHaveLength(4);
    for (const [x, z] of patch.points) {
      expect(z).toBeGreaterThan(1);
      expect(level.tiles[Math.floor(z) * 12 + Math.floor(x)]).toBe(TILE.FLOOR);
    }
    expect(sunPatch(level, win, SKIES.night.sun)).toBeNull();
  });

  it('veggen får en åpning, og vinduet får glass og karm', () => {
    const level = room();
    paintWindows(level, [[5, 0]], true);
    const ys = (mesh) => new Set(mesh.pos.filter((_, k) => k % 3 === 1).map((y) => Math.round(y * 100) / 100));
    const wall = ys(buildSurfaces(level, null, { subdivide: 1 }).wall);
    expect(wall.has(0.9)).toBe(true);
    expect(wall.has(2.2)).toBe(true);
    const parts = buildWindows(level, null);
    expect(parts.glass.vertexCount).toBe(4);
    expect(parts.frame.vertexCount).toBe(16);
    expect(parts.sun.vertexCount).toBe(4);
  });

  it('lagres med tiden på døgnet, og kontoret får vinduer', () => {
    const level = room();
    paintWindows(level, [[5, 0]], true);
    level.sky = 'dusk';
    const back = levelFromJSON(JSON.parse(JSON.stringify(levelToJSON(level))));
    expect(back.sky).toBe('dusk');
    expect(windows(back)).toHaveLength(1);
    const office = generateLevel({ theme: 'office', w: 40, h: 32, seed: 2 });
    expect(windows(office).length).toBeGreaterThan(10);
    expect(SKIES[office.sky]).toBeTruthy();
    expect(windows(generateLevel({ theme: 'backrooms', w: 40, h: 32, seed: 2 }))).toHaveLength(0);
  });
});

describe('solflekker', () => {
  it('går aldri gjennom en innervegg og inn i rommet ved siden av', () => {
    // Rom med vindu mot nord og en innervegg 2 m inn i rommet (z 3), med gulv også bak den.
    const level = createLevel({ w: 12, h: 12, height: 2.7 });
    fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 10, z1: 10 }), TILE.FLOOR);
    fillTiles(level, rectIndices(level, { x0: 1, z0: 3, x1: 10, z1: 3 }), TILE.WALL);
    paintWindows(level, [[5, 0]], true);
    const patch = sunPatch(level, windowInfo(level, 5, 0), SKIES.golden.sun);
    for (const [, z] of patch?.points ?? []) expect(z).toBeLessThanOrEqual(3);
  });
});
