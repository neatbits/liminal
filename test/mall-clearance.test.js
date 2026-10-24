import { describe, expect, it } from 'vitest';
import { TILE, getTile } from '../src/core/level.js';
import { depthAt } from '../src/core/heights.js';
import { escalatorRuns } from '../src/core/escalators.js';
import { generateLevel, presetById } from '../src/gen/index.js';
import { mallLayout } from '../src/gen/mall.js';

describe('fontener og ferdsel i Mall', () => {
  it.each([[56, 40], [52, 38], [31, 23], [56, 37], [78, 57], [114, 84], [24, 30], [12, 12]])(
    '%s × %s holder vannet utenfor rulletrappenes trafikkakse, også i små rom', (w, h) => {
      for (let seed = 1; seed <= 6; seed++) {
        const level = generateLevel({ theme: 'mall', w, h, seed });
        const runs = escalatorRuns(level);
        for (let i = 0; i < level.tiles.length; i++) {
          if (level.tiles[i] !== TILE.WATER) continue;
          const z = Math.floor(i / level.w);
          // To hele gulvrader på hver side av det to meter brede trappeløpet.
          for (const run of runs) expect(z < run.origin[1] - 2 || z >= run.origin[1] + run.width + 2).toBe(true);
          expect(depthAt(level, i % w, z)).toBe(0.4);
        }
        expect(level.objects.some((o) => o.id === 'plasticpalm')).toBe(false);
      }
    });

  it('beholder fontener i eksempelet og romslige atrier', () => {
    for (const level of [presetById('mall').make({seed:7,layout:'gallery'}), generateLevel({ theme: 'mall', w: 78, h: 57, seed: 3 })]) {
      const { atrium } = mallLayout(level.w, level.h);
      const water = [];
      level.tiles.forEach((t, i) => { if (t === TILE.WATER) water.push([i % level.w, Math.floor(i / level.w)]); });
      expect(water.length).toBeGreaterThanOrEqual(12);
      for (const [x, z] of water) {
        expect(x >= atrium.x0 && x <= atrium.x1 && z >= atrium.z0 && z <= atrium.z1).toBe(true);
      }
      expect(level.objects.some((o) => o.id === 'plasticpalm')).toBe(false);
    }
  });

  it('gir tørre gulvruter rett etter nedovertrappen og før oppovertrappen', () => {
    const level = presetById('mall').make({seed:7,layout:'gallery'});
    for (const r of escalatorRuns(level)) {
      for (let distance = 0; distance < 5; distance++) for (let lane = 0; lane < r.width; lane++) {
        const x = Math.floor(r.origin[0] - r.dir[0] * (distance + 0.5));
        const z = r.origin[1] + lane;
        expect(getTile(level, x, z)).toBe(TILE.FLOOR);
      }
    }
  });

  it('Poolrooms bruker pottepalmen og utelater plastpalmen', () => {
    const level = generateLevel({ theme: 'pool', w: 56, h: 40, seed: 7 });
    expect(level.objects.some((o) => o.id === 'plasticpalm')).toBe(false);
    expect(level.objects.some((o) => o.id === 'pottedpalm')).toBe(true);
  });
});
