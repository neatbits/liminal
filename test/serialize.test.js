import { describe, expect, it } from 'vitest';
import { createLevel, setTile, setLight, TILE, LIGHT } from '../src/core/level.js';
import { levelToJSON, levelFromJSON, encodeLevel, decodeLevel, bytesToBase64Url, base64UrlToBytes } from '../src/core/serialize.js';
import { generateLevel } from '../src/gen/index.js';

function sample() {
  const level = createLevel({ name: 'Testrom', theme: 'hotel', w: 10, h: 9, height: 3.1 });
  setTile(level, 2, 3, TILE.FLOOR);
  setTile(level, 3, 3, TILE.DOOR);
  setTile(level, 4, 3, TILE.WATER);
  setTile(level, 5, 3, TILE.PILLAR);
  setLight(level, 2, 3, LIGHT.FLICKER);
  setLight(level, 4, 3, LIGHT.BROKEN);
  level.spawn = { x: 2.5, z: 3.5, a: 1.25 };
  level.fog = 1.4;
  return level;
}

describe('serialisering', () => {
  it('gir samme rom tilbake via JSON', () => {
    const level = sample();
    const back = levelFromJSON(JSON.parse(JSON.stringify(levelToJSON(level))));
    expect(back.name).toBe('Testrom');
    expect(back.theme).toBe('hotel');
    expect(back.height).toBe(3.1);
    expect(back.fog).toBe(1.4);
    expect(back.spawn).toEqual(level.spawn);
    expect(Array.from(back.tiles)).toEqual(Array.from(level.tiles));
    expect(Array.from(back.lights)).toEqual(Array.from(level.lights));
  });

  it('frøet rommet ble generert fra følger med i lenker og filer', async () => {
    const level = generateLevel({ theme: 'office', w: 40, h: 32, seed: 4471 });
    expect(level.seed).toBe(4471);
    expect((await decodeLevel(await encodeLevel(level))).seed).toBe(4471);
    const drawn = createLevel({ w: 10, h: 10 });
    expect((await decodeLevel(await encodeLevel(drawn))).seed).toBeUndefined();
  });

  it('lager lesbare rader', () => {
    const json = levelToJSON(sample());
    expect(json.rows).toHaveLength(9);
    expect(json.rows[3].slice(2, 6)).toBe(String.fromCharCode(48 + 1 + (2 << 3)) + '4' + String.fromCharCode(48 + 2 + (3 << 3)) + '3');
  });

  it('avviser ugyldige data med forståelige feilmeldinger', () => {
    expect(() => levelFromJSON(null)).toThrow('does not contain');
    expect(() => levelFromJSON({ format: 'annet' })).toThrow('Unknown file format');
    const json = levelToJSON(sample());
    json.rows[0] = json.rows[0].slice(1);
    expect(() => levelFromJSON(json)).toThrow('wrong length');
    const bad = levelToJSON(sample());
    bad.rows[0] = '~'.repeat(10);
    expect(() => levelFromJSON(bad)).toThrow('Invalid cell');
  });

  it('leser fortsatt filer med det gamle formatnavnet', () => {
    const json = levelToJSON(sample());
    expect(json.format).toBe('liminal-room');
    json.format = 'liminal-rom';
    expect(levelFromJSON(json).name).toBe('Testrom');
  });

  it('base64url tåler alle byteverdier', () => {
    const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
    const code = bytesToBase64Url(bytes);
    expect(code).not.toMatch(/[+/=]/);
    expect(Array.from(base64UrlToBytes(code))).toEqual(Array.from(bytes));
  });

  it('koder og dekoder delingslenker', async () => {
    const level = generateLevel({ theme: 'backrooms', w: 48, h: 48, seed: 4 });
    const code = await encodeLevel(level);
    expect(code.length).toBeLessThan(2500);
    const back = await decodeLevel(code);
    expect(Array.from(back.tiles)).toEqual(Array.from(level.tiles));
    expect(Array.from(back.lights)).toEqual(Array.from(level.lights));
  });

  it('gir forståelig feil for ødelagte lenker', async () => {
    await expect(decodeLevel('ikke-en-gyldig-kode')).rejects.toThrow('broken');
  });
});

describe('serialisering av soner', () => {
  function zoned() {
    const level = sample();
    level.waterDepth = 1.4;
    level.ceilings[3 * 10 + 2] = 22; // laveste lovlige takhøyde
    level.ceilings[3 * 10 + 5] = 80; // høyeste
    level.depths[3 * 10 + 4] = 30;
    return level;
  }

  it('tar med vanndybde og sonelag fram og tilbake', () => {
    const level = zoned();
    const json = levelToJSON(level);
    expect(json.ceilings[3]).toBe('001' + '00' + DIGIT(59) + '0000');
    const back = levelFromJSON(JSON.parse(JSON.stringify(json)));
    expect(back.waterDepth).toBe(1.4);
    expect(Array.from(back.ceilings)).toEqual(Array.from(level.ceilings));
    expect(Array.from(back.depths)).toEqual(Array.from(level.depths));
  });

  it('utelater tomme sonelag', () => {
    const json = JSON.parse(JSON.stringify(levelToJSON(sample())));
    expect(json).not.toHaveProperty('ceilings');
    expect(json).not.toHaveProperty('depths');
  });

  it('leser eldre filer uten soner og vanndybde', () => {
    const json = levelToJSON(sample());
    delete json.waterDepth;
    json.v = 1;
    const back = levelFromJSON(json);
    expect(back.waterDepth).toBe(0.7);
    expect(back.ceilings.every((v) => v === 0)).toBe(true);
  });

  it('avviser ødelagte sonelag', () => {
    const json = levelToJSON(zoned());
    json.ceilings[0] = '!'.repeat(10);
    expect(() => levelFromJSON(json)).toThrow('Invalid zone');
    const short = levelToJSON(zoned());
    short.depths[1] = '0';
    expect(() => levelFromJSON(short)).toThrow('wrong length');
    const rows = levelToJSON(zoned());
    rows.depths = rows.depths.slice(1);
    expect(() => levelFromJSON(rows)).toThrow('wrong number of rows');
  });

  it('delingslenker tar med sonene', async () => {
    const level = zoned();
    const back = await decodeLevel(await encodeLevel(level));
    expect(back.waterDepth).toBe(1.4);
    expect(Array.from(back.ceilings)).toEqual(Array.from(level.ceilings));
    expect(Array.from(back.depths)).toEqual(Array.from(level.depths));
  });
});

function DIGIT(n) {
  return '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'[n];
}
