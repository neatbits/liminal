import { describe, expect, it } from 'vitest';
import { createLevel, TILE, LIGHT } from '../src/core/level.js';
import { autoLights } from '../src/core/ops.js';
import { mulberry32 } from '../src/core/rng.js';
import { objectFits } from '../src/core/objects.js';
import { THEME_IDS } from '../src/core/themes.js';
import { fillRect } from '../src/gen/util.js';
import { generateLevel, presetById } from '../src/gen/index.js';
import { reachableCells } from '../src/gen/tapes.js';
import { SPECIALS } from '../src/gen/special-rooms.js';
import { applySpecial, findRooms, NO_SPECIALS } from '../src/gen/specials.js';

/** En gang med et stort og et lite rom bak hver sin dør; man starter i gangen. */
function building(theme = 'office') {
  const level = createLevel({ theme, w: 30, h: 20, height: 2.8 });
  fillRect(level, 1, 2, 28, 3, TILE.FLOOR);
  fillRect(level, 2, 5, 17, 16, TILE.FLOOR);
  fillRect(level, 20, 5, 26, 10, TILE.FLOOR);
  fillRect(level, 10, 4, 10, 4, TILE.DOOR);
  fillRect(level, 23, 4, 23, 4, TILE.DOOR);
  autoLights(level, { spacing: 3, state: LIGHT.ON });
  level.spawn = { x: 2.5, z: 2.5, a: 0 };
  return level;
}

const reached = (l) => reachableCells(l, l.spawn.x, l.spawn.z).reduce((n, c) => n + c, 0);

describe('spesialrom', () => {
  it('rommene er områdene mellom vegger og dører', () => {
    const rooms = findRooms(building()).map((r) => r.area).sort((a, b) => a - b);
    expect(rooms).toEqual([42, 56, 192]);
  });

  it.each(SPECIALS.map((s) => s.id))('%s: får plass, gjør noe og stenger ingenting inne', (id) => {
    const s = SPECIALS.find((k) => k.id === id);
    const theme = ['office', 'hotel', 'school', 'basement'].find((t) => !s.not?.includes(t) && (!s.themes || s.themes.includes(t)));
    const level = building(theme);
    const before = JSON.stringify([level.tiles, level.lights, level.ceilings, level.depths, level.leds, level.panels, level.objects]);
    const corridor = reached(level) - 192 - 42 - 2;
    let got = null;
    for (let seed = 1; seed <= 12 && !got; seed++) got = applySpecial(level, mulberry32(seed), id);
    expect(got, id).toBe(id);
    expect(JSON.stringify([level.tiles, level.lights, level.ceilings, level.depths, level.leds, level.panels, level.objects])).not.toBe(before);
    expect(reached(level)).toBeGreaterThanOrEqual(corridor + 2); // gangen og dørene er der fortsatt
    for (const o of level.objects) expect(objectFits(level, o), `${id}: ${o.id}`).toBe(true);
  });

  it('mange ulike, og omtrent annethvert nivå har ett', () => {
    const kinds = new Set();
    let n = 0;
    let total = 0;
    for (const theme of THEME_IDS.filter((t) => !NO_SPECIALS.includes(t))) {
      for (let seed = 1; seed <= 12; seed++) {
        const l = generateLevel({ theme, w: 48, h: 40, seed });
        total++;
        if (l.specials?.length) n++;
        for (const k of l.specials ?? []) kinds.add(k);
      }
    }
    expect(n / total).toBeGreaterThan(0.45);
    expect(kinds.size).toBeGreaterThanOrEqual(14);
  }, 120000);

  it('likt for samme frø, og aldri i eksemplene eller kjøpesenteret', () => {
    const a = generateLevel({ theme: 'hotel', w: 48, h: 40, seed: 4 });
    const b = generateLevel({ theme: 'hotel', w: 48, h: 40, seed: 4 });
    expect(b.specials).toEqual(a.specials);
    expect(b.objects).toEqual(a.objects);
    for (const id of ['level0', 'office', 'hotel', 'school']) expect(presetById(id).make().specials).toBeUndefined();
    for (let seed = 1; seed <= 6; seed++) expect(generateLevel({ theme: 'mall', w: 48, h: 40, seed }).specials).toBeUndefined();
  }, 60000);
});
