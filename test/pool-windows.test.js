import { describe, expect, it } from 'vitest';
import { Ray, Vector3 } from 'three';
import { createLevel, TILE } from '../src/core/level.js';
import { paintWindows, windows, windowInfo, sunPatch, SKIES } from '../src/core/windows.js';
import { windowPanes } from '../src/core/window-panes.js';
import { levelFromJSON, levelToJSON } from '../src/core/serialize.js';
import { mulberry32 } from '../src/core/rng.js';
import { addWindows } from '../src/gen/windows.js';
import { buildWindows } from '../src/world/windows.js';
import { buildSurfaces } from '../src/world/surfaces.js';

function room(w = 12, h = 10) {
  const level = createLevel({ theme: 'pool', w, h });
  for (let z = 1; z < h - 1; z++) for (let x = 1; x < w - 1; x++) level.tiles[z * w + x] = TILE.FLOOR;
  return level;
}

function hit(mesh, origin, direction) {
  const ray = new Ray(new Vector3(...origin), new Vector3(...direction));
  const [a, b, c, p] = Array.from({ length: 4 }, () => new Vector3());
  for (let i = 0; i < mesh.index.length; i += 3) {
    a.fromArray(mesh.pos, mesh.index[i] * 3); b.fromArray(mesh.pos, mesh.index[i + 1] * 3); c.fromArray(mesh.pos, mesh.index[i + 2] * 3);
    if (ray.intersectTriangle(a, b, c, true, p) && p.distanceTo(ray.origin) < 1) return true;
  }
  return false;
}

describe('store innfelte Poolrooms-vinduer', () => {
  const sides = [
    [[3, 0], [4, 0], [5, 0], [6, 0]], [[11, 3], [11, 4], [11, 5], [11, 6]],
    [[3, 9], [4, 9], [5, 9], [6, 9]], [[0, 3], [0, 4], [0, 5], [0, 6]],
  ];
  it.each(sides.map((cells, i) => [i, cells]))('ett glassfelt uten stolper eller fremspring, veggretning %s', (_, cells) => {
    const level = room();
    paintWindows(level, cells, true);
    const panes = windowPanes(level);
    expect(panes).toHaveLength(1);
    const pane = panes[0];
    expect(pane.width).toBe(4);
    expect(pane.head - pane.sill).toBeCloseTo(2.55);
    const mesh = buildWindows(level, null);
    expect(mesh.glass.vertexCount).toBe(4);
    const [nx, nz] = pane.n;
    const [fx, fz] = [pane.x + 0.5 + nx * 0.5, pane.z + 0.5 + nz * 0.5];
    for (let i = 0; i < mesh.frame.pos.length; i += 3) {
      const intoRoom = (mesh.frame.pos[i] - fx) * nx + (mesh.frame.pos[i + 2] - fz) * nz;
      expect(intoRoom).toBeLessThanOrEqual(1e-8);
    }
    const wall = buildSurfaces(level, null).wall;
    for (let i = 1; i < cells.length; i++) {
      const [x, z] = [(cells[i - 1][0] + cells[i][0]) / 2 + 0.5 + nx * 0.5, (cells[i - 1][1] + cells[i][1]) / 2 + 0.5 + nz * 0.5];
      const origin = [x + nx * 0.4, 1.5, z + nz * 0.4], direction = [-nx, 0, -nz];
      expect(hit(wall, origin, direction)).toBe(false); // ingen veggstripe ved ruteskjøten
      expect(hit(mesh.frame, origin, direction)).toBe(false);
      expect(hit(mesh.glass, origin, direction)).toBe(true);
    }
    expect(windowPanes(levelFromJSON(levelToJSON(level)))).toEqual(panes);
  });

  it('deler ved endret gulv/tak, fjerning og forskjellige vindusretninger', () => {
    const level = room();
    paintWindows(level, sides[0], true);
    level.ceilings[1 * level.w + 5] = 24;
    expect(windowPanes(level).map((w) => w.width).sort()).toEqual([1, 1, 2]);
    level.ceilings.fill(0);
    paintWindows(level, [[4, 0]], false);
    expect(windowPanes(level).map((w) => w.width).sort()).toEqual([1, 2]);
    expect(windowInfo(level, 3, 0).left).toBeGreaterThan(0);
    expect(windowInfo(level, 3, 0).right).toBeGreaterThan(0);
    level.theme = 'office';
    expect(windowPanes(level)).toHaveLength(3);
    expect(windowPanes(level).every((w) => w.head - w.sill <= 1.3 + 1e-6)).toBe(true);
  });

  it('færre automatiske vindusfelt, 3–5 m brede og repeterbare', () => {
    let count = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const level = room(64, 48), copy = room(64, 48);
      addWindows(level, mulberry32(seed)); addWindows(copy, mulberry32(seed));
      expect(copy.meta).toEqual(level.meta);
      expect(copy.sky).toBe(level.sky);
      const panes = windowPanes(level);
      count += panes.length;
      for (const pane of panes) expect(pane.width).toBeGreaterThanOrEqual(3);
      for (const pane of panes) expect(pane.width).toBeLessThanOrEqual(5);
      expect(windows(level).length).toBe(panes.reduce((n, w) => n + w.width, 0));
    }
    const previousWindows = 40 * (62 + 46) * 2 * 0.75 / 2 * 0.25;
    expect(count).toBeGreaterThan(40);
    expect(count).toBeLessThan(previousWindows * 0.45);
  });

  it('beholder håndmalte vinduer og bruker aldri for korte ytterveggstrekk', () => {
    const level = room();
    paintWindows(level, [[3, 0]], true);
    addWindows(level, mulberry32(1));
    expect(windowInfo(level, 3, 0)).not.toBeNull();
    const tiny = createLevel({ theme: 'pool', w: 8, h: 8 });
    tiny.tiles[3 * 8 + 3] = TILE.FLOOR;
    expect(addWindows(tiny, () => 0)).toBe(0);
  });

  it('bred solflekk sjekkes også mot hindringer mellom midten og kanten', () => {
    const level = room(20, 18);
    paintWindows(level, Array.from({ length: 5 }, (_, i) => [5 + i, 0]), true);
    const pane = windowPanes(level)[0];
    const patch = sunPatch(level, pane, SKIES.day.sun);
    expect(patch).not.toBeNull();
    expect(Math.hypot(patch.points[1][0] - patch.points[0][0], patch.points[1][1] - patch.points[0][1])).toBeCloseTo(4.95);
    for (let x = 1; x < 19; x++) level.tiles[3 * 20 + x] = TILE.WALL;
    const clipped = sunPatch(level, windowPanes(level)[0], SKIES.day.sun);
    for (const [, z] of clipped?.points ?? []) expect(z).toBeLessThan(3);
  });
});
