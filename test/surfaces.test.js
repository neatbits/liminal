import { describe, expect, it } from 'vitest';
import { createLevel, setTile, TILE } from '../src/core/level.js';
import { buildSurfaces } from '../src/world/surfaces.js';
import { heightLevels } from '../src/world/mesher.js';

function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

describe('flater', () => {
  it('et 1×1-rom får gulv, tak, fire vegger og veggtopper rundt', () => {
    const level = createLevel({ w: 8, h: 8, height: 2.7 });
    setTile(level, 3, 3, TILE.FLOOR);
    const s = buildSurfaces(level, null, { subdivide: 1 });
    expect(s.floor.quadCount).toBe(1);
    expect(s.ceiling.quadCount).toBe(1);
    expect(s.wall.quadCount).toBe(4 * (heightLevels(0, 2.7).length - 1));
    expect(s.caps.quadCount).toBe(8);
    expect(s.mass.quadCount).toBe(64 - 1 - 8);
  });

  it('vegger vender inn mot rommet (mot-klokken sett innenfra)', () => {
    const level = createLevel({ w: 8, h: 8 });
    setTile(level, 3, 3, TILE.FLOOR);
    const { wall, floor } = buildSurfaces(level, null, { subdivide: 1 });
    const centre = [3.5, 1, 3.5];
    for (let q = 0; q < wall.quadCount; q++) {
      const p = (k) => wall.pos.slice((q * 4 + k) * 3, (q * 4 + k) * 3 + 3);
      const [a, b, c] = [p(0), p(1), p(2)];
      const n = cross([b[0] - a[0], b[1] - a[1], b[2] - a[2]], [c[0] - a[0], c[1] - a[1], c[2] - a[2]]);
      const toCentre = [centre[0] - a[0], centre[1] - a[1], centre[2] - a[2]];
      expect(n[0] * toCentre[0] + n[1] * toCentre[1] + n[2] * toCentre[2]).toBeGreaterThan(0);
    }
    const fp = floor.pos;
    const fn = cross([fp[3] - fp[0], fp[4] - fp[1], fp[5] - fp[2]], [fp[6] - fp[0], fp[7] - fp[1], fp[8] - fp[2]]);
    expect(fn[1]).toBeGreaterThan(0);
  });

  it('vann gir bassengbunn og kanter mot gulv', () => {
    const level = createLevel({ w: 8, h: 8 });
    setTile(level, 3, 3, TILE.FLOOR);
    setTile(level, 4, 3, TILE.WATER);
    const s = buildSurfaces(level, null, { subdivide: 1 });
    expect(s.basin.quadCount).toBe(2); // bunn + én kant mot gulvruten
  });

  it('døråpning får overligger mot rom med høyere tak', () => {
    const level = createLevel({ w: 8, h: 8, height: 3 });
    setTile(level, 3, 3, TILE.FLOOR);
    setTile(level, 4, 3, TILE.DOOR);
    // Overliggeren er en stripe i x = 4 som går fra dørhøyden (2,1 m) til taket (3 m).
    const lintel = (wall) => {
      let found = false;
      for (let i = 0; i < wall.pos.length; i += 3) {
        if (wall.pos[i] === 4 && wall.pos[i + 1] === 2.1) found = true;
      }
      return found;
    };
    expect(lintel(buildSurfaces(level, null, { subdivide: 1 }).wall)).toBe(true);
    setTile(level, 4, 3, TILE.FLOOR);
    expect(lintel(buildSurfaces(level, null, { subdivide: 1 }).wall)).toBe(false);
  });

  it('søyle legger til fire sider', () => {
    const level = createLevel({ w: 8, h: 8 });
    setTile(level, 3, 3, TILE.PILLAR);
    const s = buildSurfaces(level, null, { subdivide: 1 });
    const strip = heightLevels(0, level.height).length - 1;
    expect(s.wall.quadCount).toBe(8 * strip);
  });
});

/** Høyeste og laveste y blant quads i mesh som ligger helt i planet x = X. */
function spanAtX(mesh, X) {
  let lo = Infinity;
  let hi = -Infinity;
  for (let q = 0; q < mesh.quadCount; q++) {
    const ys = [];
    let inPlane = true;
    for (let k = 0; k < 4; k++) {
      const i = (q * 4 + k) * 3;
      if (Math.abs(mesh.pos[i] - X) > 1e-6) inPlane = false;
      ys.push(mesh.pos[i + 1]);
    }
    if (!inPlane) continue;
    lo = Math.min(lo, ...ys);
    hi = Math.max(hi, ...ys);
  }
  return [lo, hi];
}

describe('flater med soner', () => {
  // To gulvruter side om side: x = 3 (rommets 2,7 m) og x = 4 (egen sone).
  function pair(ceil) {
    const level = createLevel({ w: 8, h: 8, height: 2.7 });
    setTile(level, 3, 3, TILE.FLOOR);
    setTile(level, 4, 3, TILE.FLOOR);
    level.ceilings[3 * 8 + 4] = ceil * 10;
    return level;
  }

  it('høyere tak gir en vegg fra det lave taket opp til det høye', () => {
    const s = buildSurfaces(pair(4.5), null, { subdivide: 1 });
    expect(spanAtX(s.wall, 4)).toEqual([2.7, 4.5]);
    const ceilY = new Set();
    for (let i = 1; i < s.ceiling.pos.length; i += 3) ceilY.add(s.ceiling.pos[i]);
    expect([...ceilY].sort()).toEqual([2.7, 4.5]);
  });

  it('veggtoppene følger det høyeste taket rundt, og sprang lukkes', () => {
    const s = buildSurfaces(pair(4.5), null, { subdivide: 1 });
    const tops = new Set();
    for (let q = 0; q < s.caps.quadCount; q++) {
      const y = s.caps.pos.slice(q * 12, q * 12 + 12).filter((_, i) => i % 3 === 1);
      if (y.every((v) => v === y[0])) tops.add(y[0]);
    }
    expect(tops).toEqual(new Set([2.7, 4.5]));
    // Toppen over x = 2 (2,7 m) mot den høye toppen over x = 3…5 trenger et sprang.
    const [lo, hi] = spanAtX(s.caps, 3);
    expect(lo).toBeCloseTo(2.7, 6);
    expect(hi).toBeCloseTo(4.5, 6);
  });

  it('ulike dybder gir trinn i bassengbunnen', () => {
    const level = createLevel({ w: 8, h: 8 });
    setTile(level, 3, 3, TILE.WATER);
    setTile(level, 4, 3, TILE.WATER);
    level.depths[3 * 8 + 4] = 20;
    const s = buildSurfaces(level, null, { subdivide: 1 });
    expect(spanAtX(s.basin, 4)).toEqual([-2, -0.7]);
    const bottoms = new Set();
    for (let i = 1; i < s.basin.pos.length; i += 3) bottoms.add(s.basin.pos[i]);
    expect(Math.min(...bottoms)).toBe(-2);
  });

  it('uten soner blir alt som før: ingen ekstra sprang i veggtoppene', () => {
    const level = createLevel({ w: 8, h: 8, height: 2.7 });
    setTile(level, 3, 3, TILE.FLOOR);
    const s = buildSurfaces(level, null, { subdivide: 1 });
    expect(s.caps.quadCount).toBe(8);
  });
});
