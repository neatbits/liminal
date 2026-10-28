import { describe, expect, it } from 'vitest';
import { createLevel, HEIGHT_MIN, HEIGHT_MAX, DEPTH_MIN, DEPTH_MAX, DECK_MIN, DECK_MAX, FLOOR_MAX } from '../src/core/level.js';
import { levelToJSON, levelFromJSON, encodeLevel, decodeLevel, VERSION } from '../src/core/serialize.js';

describe('romformat v3 og eldre sonelag', () => {
  it.each([
    ['ceilings', HEIGHT_MIN * 10, HEIGHT_MAX * 10],
    ['depths', DEPTH_MIN * 10, DEPTH_MAX * 10],
    ['floors', 1, FLOOR_MAX * 10],
    ['decks', DECK_MIN * 10, DECK_MAX * 10],
    ['finish', 1, 15], ['meta', 1, 15], ['corners', 1, 8], ['leds', 1, 8], ['panels', 1, 3],
  ])('bevarer alle lovlige verdier i %s, inkludert 0', (key, min, max) => {
    const level = createLevel({ w: 16, h: 16 });
    for (let v = min; v <= max; v++) level[key][v - min + 1] = v;
    const json = JSON.parse(JSON.stringify(levelToJSON(level)));
    expect(json.v).toBe(VERSION);
    expect(json[key].every((row) => row.length === level.w * 2)).toBe(true);
    expect(levelFromJSON(json)[key]).toEqual(level[key]);
  });

  it('høye tak, platåer, dekker, LED-striper og lyspaneler følger med delingslenker', async () => {
    const level = createLevel({ w: 8, h: 8 });
    level.ceilings.set([82, 83, 200], 9);
    level.floors.set([61, 62, 100], 17);
    level.decks.set([84, 85, 100], 25);
    level.leds.set([1, 8, 5], 0);
    level.panels.set([3, 1, 2], 20);
    const back = await decodeLevel(await encodeLevel(level));
    for (const key of ['ceilings', 'floors', 'decks', 'leds', 'panels']) expect(back[key]).toEqual(level[key]);
  });

  it.each([undefined, 1, 2])('leser gamle ett-tegns lag (versjon %s)', (v) => {
    const json = levelToJSON(createLevel({ w: 8, h: 8 }));
    json.v = v;
    json.ceilings = ['01z00000', ...Array(7).fill('00000000')];
    json.floors = ['0z000000', ...Array(7).fill('00000000')];
    json.decks = ['0z000000', ...Array(7).fill('00000000')];
    const back = levelFromJSON(JSON.parse(JSON.stringify(json)));
    expect(Array.from(back.ceilings.slice(0, 3))).toEqual([0, 22, 82]);
    expect(back.floors[1]).toBe(61);
    expect(back.decks[1]).toBe(84);
    expect(levelFromJSON(levelToJSON(back)).ceilings).toEqual(back.ceilings);
  });

  it.each(['gg', '0x', 'ff', '01'])('avviser ugyldig takverdi %s', (value) => {
    const json = levelToJSON(createLevel({ w: 8, h: 8 }));
    json.ceilings = [value + '00'.repeat(7), ...Array(7).fill('00'.repeat(8))];
    expect(() => levelFromJSON(json)).toThrow('Invalid zone');
  });

  it.each([0, VERSION + 1, '3', 2.5])('avviser ukjent formatversjon %s', (v) => {
    const json = { ...levelToJSON(createLevel()), v };
    expect(() => levelFromJSON(json)).toThrow('Unsupported room version');
  });
});
