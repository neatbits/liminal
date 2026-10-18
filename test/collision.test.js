import { describe, expect, it } from 'vitest';
import { createLevel, setTile, TILE } from '../src/core/level.js';
import { fillTiles, rectIndices } from '../src/core/ops.js';
import { moveCircle, resolveCircle, rayDistance } from '../src/world/collision.js';
import { resolveSpawn, autoSpawn, isWalkableCell } from '../src/core/spawn.js';

function room() {
  const level = createLevel({ w: 10, h: 10 });
  fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 8, z1: 8 }), TILE.FLOOR);
  return level;
}

describe('kollisjon', () => {
  it('skyver spilleren ut av veggen', () => {
    const [x] = resolveCircle(room(), 1.1, 5, 0.3);
    expect(x).toBeCloseTo(1.3, 5);
  });

  it('kan ikke gå gjennom vegg selv med stort steg', () => {
    const [x] = moveCircle(room(), 5, 5, 20, 0, 0.3);
    expect(x).toBeLessThanOrEqual(8.7 + 1e-9);
  });

  it('kolliderer med søyler', () => {
    const level = room();
    setTile(level, 5, 5, TILE.PILLAR);
    const [x, z] = resolveCircle(level, 5.5, 5.5, 0.3);
    expect(Math.hypot(x - 5.5, z - 5.5)).toBeGreaterThan(0.25);
  });

  it('måler avstand til vegg', () => {
    expect(rayDistance(room(), 5, 5, 1, 0)).toBeCloseTo(4, 0);
  });
});

describe('startpunkt', () => {
  it('flyttes til nærmeste gangbare rute', () => {
    const level = room();
    level.spawn = { x: 0.5, z: 0.5, a: 0 };
    const s = resolveSpawn(level);
    expect(isWalkableCell(level, Math.floor(s.x), Math.floor(s.z))).toBe(true);
  });

  it('returnerer null for rom uten gulv', () => {
    expect(resolveSpawn(createLevel({ w: 8, h: 8 }))).toBeNull();
  });

  it('autostart ser i retningen med mest plass', () => {
    const level = createLevel({ w: 30, h: 9 });
    fillTiles(level, rectIndices(level, { x0: 1, z0: 4, x1: 28, z1: 4 }), TILE.FLOOR);
    const s = autoSpawn(level);
    expect(Math.abs(Math.sin(s.a))).toBeCloseTo(1, 5);
  });
});
