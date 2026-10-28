import { describe, expect, it } from 'vitest';
import { createLevel, TILE } from '../src/core/level.js';
import { fillRect } from '../src/gen/util.js';
import { SLAB, groundAt, headAt, ceilingAt } from '../src/core/heights.js';
import { placeStairs } from '../src/core/stairs.js';
import { railSides } from '../src/core/railings.js';
import { insertStorey, copyStorey, storeyElevations, storeyLevel } from '../src/core/storeys.js';
import { THROUGH, throughRuns, stairwells, walkLevels, storeyAt } from '../src/core/stairwells.js';
import { seamSpans } from '../src/world/seams.js';

const W = 12;
const at = (x, z) => z * W + x;

/** To like etasjer (12 × 10, 3 m tak) med en trapp opp fra x 3–6 (z 4) og reposet i (7, 4). */
function building({ width = 1 } = {}) {
  const room = createLevel({ theme: 'office', w: W, h: 10, height: 3 });
  fillRect(room, 1, 1, 10, 8, TILE.FLOOR);
  insertStorey(room, 1, copyStorey(room, 0));
  placeStairs(room, [3, 4], [6, 4], width);
  for (let i = 0; i < room.tiles.length; i++) if (room.tiles[i] === TILE.STAIRS) room.meta[i] |= THROUGH;
  storeyLevel(room, 1).objects = [{ id: 'pottedplant', x: 4, z: 4, rot: 0 }, { id: 'pottedplant', x: 9, z: 7, rot: 0 }];
  return room;
}

describe('trapperom mellom etasjer', () => {
  it('finner løpet nedenfra og reposet bak toppen, én bane per rute i bredden', () => {
    const room = building();
    expect(throughRuns(room)).toEqual([{ dir: [1, 0], run: [at(3, 4), at(4, 4), at(5, 4), at(6, 4)], landing: at(7, 4) }]);
    expect(throughRuns(building({ width: 2 }))).toHaveLength(2);
    const edge = building();
    placeStairs(edge, [7, 2], [10, 2]); // toppen ved kanten: reposet ville vært i ytterveggen
    for (let x = 7; x <= 10; x++) edge.meta[at(x, 2)] |= THROUGH;
    expect(throughRuns(edge)).toHaveLength(1);
  });

  it('teller ikke trappen med i etasjehøyden, og gir høyden opp til etasjen over', () => {
    const room = building();
    for (let x = 3; x <= 6; x++) room.floors[at(x, 4)] = 90; // lagret høyde betyr ingenting
    expect(storeyElevations(room)[1]).toBeCloseTo(3 + SLAB);
    const [well] = stairwells(room);
    expect(well.k).toBe(0);
    expect(well.gap).toBeCloseTo(3.3);
  });

  it('tar ikke med en trapp opp som står i sjakten eller på reposet til trappen nedenfra', () => {
    const room = building();
    const middle0 = room.storeys[0]; // etasje 2 får trappen sin rett over sjakten (som en gammel kopi)
    for (let x = 3; x <= 6; x++) for (const key of ['tiles', 'meta', 'floors']) middle0[key][at(x, 4)] = room[key][at(x, 4)];
    insertStorey(room, 2, copyStorey(room, 0));
    expect(stairwells(room).map((w) => w.k)).toEqual([0]);
    const { levels: [, middle] } = walkLevels(room);
    expect([3, 4, 5, 6].every((x) => middle.tiles[at(x, 4)] === TILE.WALL && middle.floors[at(x, 4)] === 0)).toBe(true);
    expect(middle.floors[at(7, 4)]).toBe(0); // reposet ligger på gulvet
  });

  it('lager etasjer der trappen og reposet møter gulvet over, og sjakten er vegg der oppe', () => {
    const room = building();
    const { levels: [lower, upper], wells } = walkLevels(room);
    expect(wells).toHaveLength(1);
    expect([3, 4, 5, 6].map((x) => lower.floors[at(x, 4)])).toEqual([8, 17, 25, 33]);
    expect(lower.tiles[at(7, 4)]).toBe(TILE.FLOOR);
    expect(groundAt(lower, 7.5, 4.5)).toBeCloseTo(3.3);
    expect(groundAt(upper, 7.5, 4.5)).toBe(0);
    expect(headAt(lower, 6.9, 4.5, 3.3)).toBeGreaterThan(3.3 + 2);
    expect(ceilingAt(lower, 7, 4)).toBeCloseTo(3.3 + 3);
    expect([3, 4, 5, 6].every((x) => upper.tiles[at(x, 4)] === TILE.WALL)).toBe(true);
    expect(upper.objects).toEqual([{ id: 'pottedplant', x: 9, z: 7, rot: 0 }]);
    // Reposet har vern mot fall (kollisjon), men ikke mot løpet – og vernet tegnes ikke (seams.noRail).
    expect(railSides(lower, 7, 4).map(({ dx, dz }) => [dx, dz]).sort()).toEqual([[0, -1], [0, 1], [1, 0]]);
    expect(lower.seams.noRail.has(at(7, 4))).toBe(true);
    expect(lower.borrowed).toHaveLength(1); // lys fra etasjen over ned i trapperommet
    // Rommet selv er urørt.
    expect(room.tiles[at(4, 4)]).toBe(TILE.STAIRS);
    expect(room.storeys[0].tiles[at(4, 4)]).toBe(TILE.FLOOR);
    expect(room.seams).toBeUndefined();
  });

  it('bygger ikke flatene der etasjene møtes', () => {
    const { levels: [lower, upper] } = walkLevels(building());
    const spans = [{ lo: 3.3, hi: 6.3, base: 3.3 }, { lo: 0, hi: 2, base: 0 }];
    const side = (dx, dz) => ({ dx, dz });
    expect(seamSpans(upper, at(7, 4), side(-1, 0), spans)).toEqual([]); // åpent ned trappen
    expect(seamSpans(upper, at(7, 4), side(1, 0), spans)).toBe(spans);
    expect(seamSpans(lower, at(7, 4), side(-1, 0), spans)).toBe(spans); // overliggeren over trappen
    expect(seamSpans(lower, at(7, 4), side(0, 1), spans)).toEqual([{ lo: 0, hi: 2, base: 0 }]);
    expect(lower.seams.noCeiling.has(at(7, 4)) && upper.seams.noFloor.has(at(7, 4))).toBe(true);
  });

  it('bytter etasje midt på reposet, med slingringsmonn', () => {
    const { wells } = walkLevels(building());
    expect(storeyAt(wells, 0, 7.6, 4.5, W)).toBe(1);
    expect(storeyAt(wells, 0, 7.5, 4.5, W)).toBe(0);
    expect(storeyAt(wells, 1, 7.4, 4.5, W)).toBe(0);
    expect(storeyAt(wells, 1, 7.5, 4.5, W)).toBe(1);
    expect(storeyAt(wells, 0, 6.9, 4.5, W)).toBe(0);
    expect(storeyAt(wells, 1, 8.5, 4.5, W)).toBe(1);
  });

  it('en trapp opp uten etasje over er en vanlig trapp', () => {
    const room = createLevel({ theme: 'office', w: W, h: 10, height: 3 });
    fillRect(room, 1, 1, 10, 8, TILE.FLOOR);
    placeStairs(room, [3, 4], [6, 4]);
    room.meta[at(6, 4)] |= THROUGH;
    expect(stairwells(room)).toEqual([]);
    expect(walkLevels(room).levels).toHaveLength(1);
  });
});

describe('kjøpesenter med etasjer', () => {
  it('bare øverste etasje får glasstaket, og Mall-galleriet (dekker) beholdes', async () => {
    const { generateLevel } = await import('../src/gen/index.js');
    const { mallRoof } = await import('../src/core/mall-roof.js');
    const mall = generateLevel({ theme: 'mall', w: 40, h: 28, seed: 3 });
    expect(mallRoof(mall)).not.toBeNull();
    insertStorey(mall, 1, copyStorey(mall, 0));
    const { levels } = walkLevels(mall);
    expect(mallRoof(levels[0])).toBeNull();
    expect(mallRoof(levels[1])).not.toBeNull();
    expect(levels[0].decks.some(Boolean)).toBe(true);
    expect(mallRoof(mall)).not.toBeNull(); // rommet selv er urørt
  });
});

describe('ingenting i trappen', () => {
  it('fjerner gjenstander som dekker trappen, reposet eller sjakten med fotavtrykket', async () => {
    const { applyStairs } = await import('../src/editor/tools.js');
    const { footprintCells } = await import('../src/core/object-pose.js');
    const room = building();
    // En stor palme ved siden av trappen dekker også trapperuten (fotavtrykket er over 2 m bredt).
    room.objects = [{ id: 'pottedpalm', x: 5, z: 5, rot: 0 }, { id: 'pottedplant', x: 9, z: 7, rot: 0 }];
    expect(footprintCells(room).has(at(5, 4))).toBe(true);
    const { levels: [lower, upper] } = walkLevels(room);
    expect(lower.objects.map((o) => o.id)).toEqual(['pottedplant']);
    expect(upper.objects).toEqual([{ id: 'pottedplant', x: 9, z: 7, rot: 0 }]);
    // En ny trapp i editoren rydder også.
    const flat = createLevel({ theme: 'office', w: W, h: 10, height: 3 });
    fillRect(flat, 1, 1, 10, 8, TILE.FLOOR);
    flat.objects = [{ id: 'pottedpalm', x: 4, z: 5, rot: 0 }];
    applyStairs(flat, [3, 4], [6, 4], 1, false);
    expect(flat.objects).toEqual([]);
  });
});
