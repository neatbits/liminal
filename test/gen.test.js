import { describe, expect, it } from 'vitest';
import { TILE } from '../src/core/level.js';
import { THEME_IDS } from '../src/core/themes.js';
import { isWalkableCell } from '../src/core/spawn.js';
import { generateLevel, levelFromTemplate, PRESETS, TEMPLATES } from '../src/gen/index.js';
import { labelRegions } from '../src/gen/util.js';
import { DOOR, doorInfo } from '../src/core/doors.js';

/** Kanten er vegg – eller en lukket utgang (dør til ingensteds). */
function borderIsWall(level) {
  const closed = (x, z) => {
    const t = level.tiles[z * level.w + x];
    if (t === TILE.WALL) return true;
    const d = doorInfo(level, x, z);
    return t === TILE.DOOR && d?.oneSided && d.state === DOOR.CLOSED;
  };
  for (let x = 0; x < level.w; x++) if (!closed(x, 0) || !closed(x, level.h - 1)) return false;
  for (let z = 0; z < level.h; z++) if (!closed(0, z) || !closed(level.w - 1, z)) return false;
  return true;
}

describe('generatorer', () => {
  for (const theme of THEME_IDS) {
    it(`${theme}: sammenhengende, lukket, med lys og gyldig startpunkt`, () => {
      const level = generateLevel({ theme, w: 40, h: 36, seed: 11 });
      const { sizes } = labelRegions(level);
      expect(sizes).toHaveLength(1);
      expect(sizes[0]).toBeGreaterThan(200);
      expect(borderIsWall(level)).toBe(true);
      expect(level.lights.some((l) => l > 0)).toBe(true);
      expect(isWalkableCell(level, Math.floor(level.spawn.x), Math.floor(level.spawn.z))).toBe(true);
    });
  }

  it('samme frø gir samme rom', () => {
    const a = generateLevel({ theme: 'office', w: 32, h: 32, seed: 99 });
    const b = generateLevel({ theme: 'office', w: 32, h: 32, seed: 99 });
    const c = generateLevel({ theme: 'office', w: 32, h: 32, seed: 100 });
    expect(Array.from(a.tiles)).toEqual(Array.from(b.tiles));
    expect(Array.from(a.tiles)).not.toEqual(Array.from(c.tiles));
  });

  it('alle eksempler kan lages', () => {
    for (const p of PRESETS) {
      const level = p.make({ seed: 7, layout: 'gallery' });
      expect(level.name).toBe(p.name);
      expect(labelRegions(level).sizes).toHaveLength(1);
    }
  });

  it('maler gir forventet innhold', () => {
    for (const t of TEMPLATES) {
      const level = levelFromTemplate(t.id, { theme: 'pool', w: 20, h: 20, seed: 1, name: 'x' });
      const open = level.tiles.filter((v) => v !== TILE.WALL).length;
      if (t.id === 'empty') expect(open).toBe(0);
      else expect(open).toBeGreaterThan(50);
    }
  });

  it('genererte rom får utganger (dører til ingensteds) et stykke fra startpunktet', () => {
    for (const theme of THEME_IDS) {
      const level = generateLevel({ theme, w: 40, h: 36, seed: 3 });
      const exits = [];
      for (let i = 0; i < level.tiles.length; i++) {
        const d = doorInfo(level, i % level.w, (i / level.w) | 0);
        if (d?.oneSided && d.state === DOOR.CLOSED) exits.push(d);
      }
      expect(exits.length, theme).toBeGreaterThan(0);
      for (const d of exits) expect(Math.hypot(d.x + 0.5 - level.spawn.x, d.z + 0.5 - level.spawn.z)).toBeGreaterThan(2);
    }
  });
});
