import { describe, expect, it } from 'vitest';
import { createLevel, TILE, setTile } from '../src/core/level.js';
import { FOUNTAIN_RIM, fountainRimAt } from '../src/core/fountains.js';
import { groundAt, floorAt } from '../src/core/heights.js';
import { buildFountains } from '../src/world/fountains.js';
import { Walker } from '../src/view3d/walker.js';
import { getTheme } from '../src/core/themes.js';

function fixture(theme = 'mall') {
  const level = createLevel({ w: 12, h: 12, height: 7.8, theme, waterDepth: 0.4 });
  for (let z = 1; z < 11; z++) for (let x = 1; x < 11; x++) setTile(level, x, z, TILE.FLOOR);
  for (let z = 4; z <= 6; z++) for (let x = 4; x <= 6; x++) setTile(level, x, z, TILE.WATER);
  return level;
}

describe('dekorbasseng i kjøpesenteret', () => {
  it.each([[4.1, 5.5], [6.9, 5.5], [5.5, 4.1], [5.5, 6.9], [4.1, 4.1]])(
    'kanten er gangbar ved %s, %s, mens bassengdybden er uendret', (x, z) => {
      const level = fixture();
      expect(fountainRimAt(level, x, z)).toBe(FOUNTAIN_RIM.height);
      expect(groundAt(level, x, z)).toBe(FOUNTAIN_RIM.height);
      expect(floorAt(level, Math.floor(x), Math.floor(z))).toBe(-0.4);
    });

  it('får ingen kant inne i vannet, på gulvet eller mot vegger/trapper', () => {
    const level = fixture();
    for (const [x, z] of [[5.5, 5.5], [5.01, 5.5], [4.5, 5.01], [3.9, 5.5]]) expect(fountainRimAt(level, x, z)).toBeNull();
    setTile(level, 3, 5, TILE.WALL);
    setTile(level, 7, 5, TILE.STAIRS);
    expect(fountainRimAt(level, 4.1, 5.5)).toBeNull();
    expect(fountainRimAt(level, 6.9, 5.5)).toBeNull();
    expect(groundAt(level, 5.5, 5.5)).toBe(-0.4);
    expect(groundAt(level, 3.9, 4.5)).toBe(0);
  });

  it('gir unike toppflater uten overlapp i hjørnene og riktig samlet kantareal', () => {
    const level = fixture();
    const meshes = buildFountains(level);
    const data = meshes.fountainStone;
    const seen = new Set();
    let area = 0;
    for (let i = 0; i < data.pos.length; i += 12) {
      const p = Array.from({ length: 4 }, (_, j) => data.pos.slice(i + j * 3, i + j * 3 + 3));
      if (!p.every((v) => v[1] === FOUNTAIN_RIM.height)) continue;
      const key = p.map((v) => `${v[0]},${v[2]}`).sort().join(';');
      expect(seen.has(key)).toBe(false);
      seen.add(key);
      const x0 = Math.min(...p.map((v) => v[0])), x1 = Math.max(...p.map((v) => v[0]));
      const z0 = Math.min(...p.map((v) => v[2])), z1 = Math.max(...p.map((v) => v[2]));
      area += (x1 - x0) * (z1 - z0);
      expect(groundAt(level, (x0 + x1) / 2, (z0 + z1) / 2)).toBe(FOUNTAIN_RIM.height);
    }
    expect(area).toBeCloseTo(9 - (3 - 2 * FOUNTAIN_RIM.width) ** 2);
    for (const mesh of Object.values(meshes)) {
      expect(mesh.vertexCount).toBeGreaterThan(0);
      expect(mesh.pos.every(Number.isFinite)).toBe(true);
      for (let i = 0; i < mesh.pos.length; i += 3) {
        expect(mesh.pos[i]).toBeGreaterThanOrEqual(3.99);
        expect(mesh.pos[i]).toBeLessThanOrEqual(7.01);
        expect(mesh.pos[i + 2]).toBeGreaterThanOrEqual(3.99);
        expect(mesh.pos[i + 2]).toBeLessThanOrEqual(7.01);
      }
    }
  });

  it('kan passeres i gåmodus og man kommer ut av bassenget igjen', () => {
    const level = fixture(), walker = new Walker();
    walker.reset(level, { x: 3.5, z: 5.5, a: -Math.PI / 2 });
    const input = { forward: 1, strafe: 0, running: false, consumeLook: () => [0, 0] };
    const theme = getTheme('mall');
    let highest = 0;
    for (let i = 0; i < 450; i++) {
      walker.update(1 / 60, input, level, theme);
      highest = Math.max(highest, walker.floorY);
    }
    expect(highest).toBeGreaterThan(0.04);
    expect(walker.x).toBeGreaterThan(7.5);
    expect(walker.floorY).toBeCloseTo(0, 2);
  });

  it('lager ikke steinkanter i Poolrooms og endrer ikke deres vann/ganghøyder', () => {
    const level = fixture('pool');
    expect(fountainRimAt(level, 4.1, 5.5)).toBeNull();
    expect(groundAt(level, 4.1, 5.5)).toBe(-0.4);
    expect(Object.values(buildFountains(level)).every((mesh) => mesh.vertexCount === 0)).toBe(true);
    expect(getTheme('pool').surfaces.basin.tex).toBe('poolTilesBlue');
    expect(getTheme('pool').water.wave).toBeGreaterThan(getTheme('mall').water.wave);
  });
});
