import { describe, expect, it } from 'vitest';
import { TILE } from '../src/core/level.js';
import { storeyCount, storeyLevel, storeyGap } from '../src/core/storeys.js';
import { THROUGH, walkLevels, storeyEntry, linkCells } from '../src/core/stairwells.js';
import { LADDER } from '../src/core/ladders.js';
import { mulberry32 } from '../src/core/rng.js';
import { getTheme } from '../src/core/themes.js';
import { generateLevel } from '../src/gen/index.js';
import { nextLevel } from '../src/gen/endless.js';
import { moodLevel } from '../src/gen/moods.js';
import { reachableCells } from '../src/gen/tapes.js';
import { addFloors, floorCount, stairRun, BIG_ROOM, MIX_THEMES, STAIR_MAX } from '../src/gen/mixed-floors.js';
import { LEVEL_SIZES, levelDims, variedDims } from '../src/gen/sizes.js';

const NO_CORRIDORS = { corridor: 0 };

/** Bygg fra de uendelige nivåene, helst med flere etasjer. */
function buildings(n, scale = 1, seed = 3) {
  const rand = mulberry32(seed);
  const out = [];
  for (let depth = 1; out.length < n && depth < 400; depth++) {
    const { level, kind } = nextLevel(depth, 'backrooms', rand, NO_CORRIDORS, scale);
    if (kind === 'room' && storeyCount(level) > 1) out.push(level);
  }
  return out;
}

/** Kan man gå fra starten og opp i alle etasjene? Returnerer etasjene man nådde. */
function climbAll(room) {
  const { levels, wells } = walkLevels(room);
  let start = room.spawn;
  let reached = 0;
  for (let k = 0; k < levels.length - 1; k++) {
    const reach = reachableCells(levels[k], start.x, start.z);
    const well = wells.find((x) => x.k === k);
    const ladder = levels[k].ladders[0];
    const foot = well ? well.run[0] - well.dir[0] - well.dir[1] * room.w : ladder?.i;
    if (foot === undefined || !reach[foot]) return reached;
    reached = k + 1;
    start = storeyEntry(levels, wells, k + 1);
    if (!start) return reached - 1;
  }
  return reached;
}

describe('bygg med ulike etasjer', () => {
  it('antall etasjer: oftest én, høyst tre, og to i store rom', () => {
    const rand = mulberry32(1);
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 2000; i++) counts[floorCount(rand)]++;
    expect(counts[1]).toBeGreaterThan(counts[2]);
    expect(counts[2]).toBeGreaterThan(counts[3]);
    expect(counts[3]).toBeGreaterThan(100);
    for (let i = 0; i < 200; i++) expect(floorCount(rand, BIG_ROOM)).toBeLessThanOrEqual(2);
  });

  it('alle etasjene kan nås, med én forbindelse mellom hver etasje', () => {
    for (const scale of [LEVEL_SIZES.small.scale, 1]) {
      for (const room of buildings(30, scale)) {
        const n = storeyCount(room);
        expect(n).toBeLessThanOrEqual(3);
        const { levels, wells } = walkLevels(room);
        expect(wells.length + levels.flatMap((l) => l.ladders).length, room.theme).toBe(n - 1);
        expect(climbAll(room), `${room.theme} ${room.w}x${room.h}`).toBe(n - 1);
      }
    }
  }, 120_000);

  it('etasjene har oftest hvert sitt tema, og både trapper og stiger forekommer', () => {
    const rooms = buildings(40);
    const mixed = rooms.filter((room) => storeyLevel(room, 1).theme !== room.theme);
    expect(mixed.length).toBeGreaterThan(rooms.length / 2);
    for (const room of mixed) {
      const themes = Array.from({ length: storeyCount(room) }, (_, k) => storeyLevel(room, k).theme);
      expect(new Set(themes).size).toBe(themes.length);
      expect(themes.every((t) => MIX_THEMES.includes(t))).toBe(true);
    }
    const links = rooms.map((room) => walkLevels(room));
    expect(links.some(({ wells }) => wells.length)).toBe(true);
    expect(links.some(({ levels }) => levels.some((l) => l.ladders.length))).toBe(true);
  }, 60_000);

  it('trappen er lang nok til at stigningen er grei; høye etasjer får stige', () => {
    expect(stairRun(3)).toBe(5);
    expect(stairRun(STAIR_MAX)).toBeGreaterThan(5);
    for (const room of buildings(30)) {
      const { wells } = walkLevels(room);
      for (const { gap, run } of wells) {
        expect(gap).toBeLessThanOrEqual(STAIR_MAX + 0.01);
        expect(gap / run.length).toBeLessThan(0.75);
      }
    }
  }, 60_000);

  it('samme rom gir samme bygg, og kjøpesenteret får ikke etasjer', () => {
    const make = () => nextLevel(5, 'hotel', mulberry32(77), NO_CORRIDORS);
    expect(make().level.storeys?.[0]?.tiles).toEqual(make().level.storeys?.[0]?.tiles);
    const mall = generateLevel({ theme: 'mall', w: 52, h: 38, seed: 4, layout: 'classic' });
    expect(addFloors(mall, () => 0.99)).toBe(1);
  });

  it('kassettene finner veien inn i en etasje med bare stige', () => {
    const room = buildings(60).find((r) => {
      const { levels } = walkLevels(r);
      return levels.some((l) => l.ladders.length);
    });
    const { levels, wells } = walkLevels(room);
    const k = levels.findIndex((l) => l.holes.length);
    const entry = storeyEntry(levels, wells, k);
    const { x, z, dir } = levels[k].holes[0];
    expect(entry).toEqual({ x: x + dir[0] + 0.5, z: z + dir[1] + 0.5 });
    expect(levels[k].tiles[Math.floor(entry.z) * room.w + Math.floor(entry.x)]).toBe(TILE.FLOOR);
  }, 60_000);
});

describe('stemningen i alle etasjene', () => {
  const lit = (level) => level.lights.reduce((n, l) => n + (l === 1 ? 1 : 0), 0);

  it('øvre etasjer får også ødelagte lys', () => {
    const [room] = buildings(1);
    const before = lit(room.storeys[0]);
    const out = moodLevel(room, 'abandoned', mulberry32(2));
    expect(lit(out.storeys[0])).toBeLessThan(before);
    expect(lit(room.storeys[0])).toBe(before); // originalen er urørt
  });

  it('Nightmare stenger aldri en trapp eller stige, i noen etasje', () => {
    for (const room of buildings(25)) {
      for (let s = 1; s <= 3; s++) {
        const out = moodLevel(room, 'nightmare', mulberry32(s));
        const { levels, wells } = walkLevels(out);
        expect(wells.length + levels.flatMap((l) => l.ladders).length).toBe(storeyCount(room) - 1);
        expect(climbAll(out), room.theme).toBe(storeyCount(room) - 1);
      }
    }
  }, 120_000);

  it('rutene rundt forbindelsene er merket, og «Make it wrong» rydder opp etter seg', () => {
    const [room] = buildings(1);
    const { levels, wells } = walkLevels(room);
    const keep = linkCells(levels, wells);
    expect(keep.length).toBe(storeyCount(room));
    expect(keep.every((cells, k) => k === keep.length - 1 ? cells.size > 0 : cells.size >= 2)).toBe(true);
    expect('keep' in moodLevel(room, 'nightmare', mulberry32(1))).toBe(false);
  });

  it('dype bassenger bare i etasje 0, så etasjehøyden og trappene holder', () => {
    for (const room of buildings(10)) {
      const out = moodLevel(room, 'nightmare', mulberry32(9));
      const before = room.storeys[0].depths.join();
      expect(out.storeys[0].depths.join()).toBe(before);
    }
  }, 60_000);
});

describe('størrelsen varierer fra nivå til nivå', () => {
  it('holder seg mellom Small og Huge for temaet, og er ikke alltid lik', () => {
    const rand = mulberry32(6);
    for (const theme of ['mall', 'hotel', 'pool']) {
      const [lo, hi] = [levelDims(theme, LEVEL_SIZES.small.scale), levelDims(theme, LEVEL_SIZES.huge.scale)];
      const seen = new Set();
      for (const { scale } of Object.values(LEVEL_SIZES)) {
        for (let i = 0; i < 40; i++) {
          const [w, h] = variedDims(theme, scale, rand);
          seen.add(`${w}x${h}`);
          expect(w).toBeGreaterThanOrEqual(lo[0]);
          expect(h).toBeGreaterThanOrEqual(lo[1]);
          expect(w).toBeLessThanOrEqual(hi[0]);
          expect(h).toBeLessThanOrEqual(hi[1]);
        }
      }
      expect(seen.size).toBeGreaterThan(20);
    }
  });

  it('nye bygg har gulv i hver etasje', () => {
    for (const room of buildings(12, LEVEL_SIZES.small.scale, 8)) {
      for (let k = 0; k < storeyCount(room); k++) {
        expect(storeyLevel(room, k).tiles.filter((t) => t === TILE.FLOOR).length).toBeGreaterThan(40);
      }
      expect(getTheme(room.theme)).toBeTruthy();
      expect(storeyGap(storeyLevel(room, 0), storeyLevel(room, 1))).toBeGreaterThan(2);
    }
  }, 60_000);

  it('stigene og trappene er lagret på gulvet i etasjen under', () => {
    for (const room of buildings(8)) {
      const has = (t, m, level) => level.tiles.some((tile, i) => tile === t && level.meta[i] & m);
      expect(has(TILE.STAIRS, THROUGH, room) || has(TILE.FLOOR, LADDER, room)).toBe(true);
    }
  }, 30_000);
});
