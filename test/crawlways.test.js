import { describe, it, expect } from 'vitest';
import { createLevel, TILE, getTile } from '../src/core/level.js';
import { THEME_IDS } from '../src/core/themes.js';
import { generateLevel } from '../src/gen/index.js';
import { addCrawlways, crawlCount, NO_CRAWLWAYS } from '../src/gen/crawlways.js';
import { fillInterior } from '../src/gen/util.js';
import { reachableCells, placeTapes } from '../src/gen/tapes.js';
import { crawlNooks, crawlFronts } from '../src/core/crawl.js';
import { poser, objectBox } from '../src/core/object-pose.js';
import { OBJECTS } from '../src/core/objects.js';
import { mulberry32 } from '../src/core/rng.js';
import { moodLevel } from '../src/gen/moods.js';
import { resolveSpawn } from '../src/core/spawn.js';

const crawlCells = (l) => [...l.tiles.keys()].filter((i) => l.tiles[i] === TILE.CRAWL);

/** Sammenhengende ganger, som lister av ruter. */
function ways(l) {
  const seen = new Set();
  const out = [];
  for (const start of crawlCells(l)) {
    if (seen.has(start)) continue;
    const way = [start];
    seen.add(start);
    for (let k = 0; k < way.length; k++) {
      for (const d of [1, -1, l.w, -l.w]) {
        const j = way[k] + d;
        if (l.tiles[j] === TILE.CRAWL && !seen.has(j)) {
          seen.add(j);
          way.push(j);
        }
      }
    }
    out.push(way);
  }
  return out;
}

const hall = () => {
  const l = createLevel({ theme: 'backrooms', w: 40, h: 40 });
  fillInterior(l, TILE.FLOOR);
  l.spawn = { x: 3.5, z: 3.5, a: 0 };
  return l;
};

describe('generated crawlways', () => {
  it('turn up in almost every theme', () => {
    const missing = [];
    for (const theme of THEME_IDS.filter((t) => !NO_CRAWLWAYS.includes(t))) {
      let n = 0;
      for (let seed = 1; seed <= 6; seed++) n += ways(generateLevel({ theme, w: 48, h: 48, seed })).length;
      if (n < (theme === 'hotel' || theme === 'pool' ? 1 : 3)) missing.push(`${theme}: ${n}`); // tett bygd, eller mest vann
    }
    expect(missing).toEqual([]);
  }, 60000);

  it('are the same for the same seed, and never in the examples', () => {
    const a = generateLevel({ theme: 'backrooms', w: 48, h: 48, seed: 11 });
    expect(generateLevel({ theme: 'backrooms', w: 48, h: 48, seed: 11 }).tiles).toEqual(a.tiles);
    expect(crawlCells(generateLevel({ theme: 'backrooms', w: 48, h: 48, seed: 11, vary: false }))).toEqual([]);
  });

  it('never in the mall, and not in tiny rooms', () => {
    expect(crawlCells(generateLevel({ theme: 'mall', w: 56, h: 40, seed: 2 }))).toEqual([]);
    expect(crawlCount(createLevel({ w: 8, h: 8 }))).toBe(0);
  });

  it('always have a way in from where you can walk, and walls around them', () => {
    for (const theme of ['backrooms', 'office', 'hotel', 'ward']) {
      for (let seed = 1; seed <= 8; seed++) {
        // Level 0 har også korte krypehull i noen planløsninger (gen/level0-layouts.js).
        const l = generateLevel({ theme, w: 48, h: 48, seed, layout: theme === 'backrooms' ? 'classic' : undefined });
        const closed = new Set(crawlCells(l));
        const reach = reachableCells(l, l.spawn.x, l.spawn.z, closed);
        for (const way of ways(l)) {
          expect(way.length, `${theme} ${seed}`).toBeGreaterThanOrEqual(4);
          const mouths = way.filter((i) => [1, -1, l.w, -l.w].some((d) => l.tiles[i + d] !== TILE.CRAWL && l.tiles[i + d] !== TILE.WALL));
          expect(mouths.length, `${theme} ${seed}`).toBeGreaterThanOrEqual(1);
          expect(mouths.every((i) => [1, -1, l.w, -l.w].some((d) => reach[i + d]))).toBe(true);
          for (const i of way) {
            const [x, z] = [i % l.w, Math.floor(i / l.w)];
            if (mouths.includes(i)) continue;
            for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) expect([TILE.WALL, TILE.CRAWL]).toContain(getTile(l, x + dx, z + dz));
          }
        }
      }
    }
  }, 60000);

  it('never close off anything you could walk to', () => {
    // To rom med en smal gang imellom: en blokk over gangen ville delt rommet i to.
    const rooms = () => {
      const l = createLevel({ theme: 'backrooms', w: 44, h: 30 });
      for (let z = 1; z < 29; z++) for (let x = 1; x < 43; x++) if (x < 15 || x > 28 || (z >= 13 && z <= 15)) l.tiles[z * l.w + x] = TILE.FLOOR;
      l.spawn = { x: 3.5, z: 3.5, a: 0 };
      return l;
    };
    let made = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const l = rooms();
      made += addCrawlways(l, mulberry32(seed), 4);
      const reach = reachableCells(l, l.spawn.x, l.spawn.z, new Set(crawlCells(l)));
      const lost = [...l.tiles.keys()].filter((i) => l.tiles[i] === TILE.FLOOR && !reach[i]);
      expect(lost, `seed ${seed}`).toEqual([]);
    }
    expect(made).toBeGreaterThan(30);
  });

  it('nothing stands in front of an opening', () => {
    for (const theme of ['office', 'basement', 'school']) {
      for (let seed = 1; seed <= 8; seed++) {
        const l = generateLevel({ theme, w: 48, h: 48, seed });
        const pose = poser(l);
        const boxes = l.objects.filter((o) => !OBJECTS[o.id].mount && !OBJECTS[o.id].floats).map((o) => objectBox(pose(o))); // det på veggen er ikke i veien
        for (const [x, z] of crawlFronts(l)) {
          const hit = boxes.some(([x0, z0, x1, z1]) => x0 < x + 0.95 && x1 > x + 0.05 && z0 < z + 0.95 && z1 > z + 0.05);
          expect(hit, `${theme} ${seed} (${x}, ${z})`).toBe(false);
        }
      }
    }
  }, 60000);

  it('keep clear of the start, and of cells that must stay', () => {
    const l = hall();
    const keep = new Set();
    for (let z = 10; z < 30; z++) for (let x = 10; x < 30; x++) keep.add(z * l.w + x);
    addCrawlways(l, mulberry32(4), 3, keep);
    for (const i of crawlCells(l)) {
      expect(keep.has(i)).toBe(false);
      expect(Math.hypot((i % l.w) + 0.5 - 3.5, Math.floor(i / l.w) + 0.5 - 3.5)).toBeGreaterThan(5);
    }
    expect(ways(l).length).toBeGreaterThan(0);
  });

  it('often hide a tape at the end of a dead end, where it can be reached', () => {
    let hidden = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const l = hall();
      addCrawlways(l, mulberry32(seed), 3);
      if (!crawlNooks(l).length) continue;
      const tapes = placeTapes(l, l.spawn, mulberry32(seed + 100), 2);
      const inside = tapes.filter((t) => l.tiles[Math.floor(t.z) * l.w + Math.floor(t.x)] === TILE.CRAWL);
      hidden += inside.length;
      expect(inside.length).toBeLessThanOrEqual(1);
    }
    expect(hidden).toBeGreaterThan(0);
  });

  it('stronger moods add more on generated levels, but never in your own room', () => {
    const l = hall();
    expect(crawlCells(moodLevel(l, 'nightmare', mulberry32(1))).length).toBeGreaterThan(0);
    const mine = moodLevel(l, 'nightmare', mulberry32(1), { home: true });
    expect(crawlCells(mine ?? l)).toEqual([]);
    expect(moodLevel(l, 'normal', mulberry32(1))).toBe(null);
  });

  it('the start is still a place to stand', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const l = generateLevel({ theme: 'hotel', w: 48, h: 48, seed });
      const s = resolveSpawn(l);
      expect(getTile(l, Math.floor(s.x), Math.floor(s.z))).not.toBe(TILE.CRAWL);
    }
  });
});
