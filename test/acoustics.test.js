import { describe, expect, it } from 'vitest';
import { createLevel, TILE } from '../src/core/level.js';
import { fillTiles, rectIndices } from '../src/core/ops.js';
import { fillZone } from '../src/core/zones.js';
import { mulberry32 } from '../src/core/rng.js';
import { measureRoom, reverbMix, rayLength } from '../src/audio/acoustics.js';
import { AmbienceDirector } from '../src/audio/director.js';

// En stor hall (x 1–30, z 1–24, tak 6 m) og en smal gang (z 27, 1 m bred, tak 2,5 m) langs sørveggen.
function building() {
  const level = createLevel({ w: 32, h: 30, height: 6 });
  fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 30, z1: 24 }), TILE.FLOOR);
  fillTiles(level, rectIndices(level, { x0: 1, z0: 27, x1: 30, z1: 27 }), TILE.FLOOR);
  fillZone(level, 'ceiling', rectIndices(level, { x0: 1, z0: 27, x1: 30, z1: 27 }), 2.5);
  return level;
}

describe('romklang etter rommet', () => {
  it('stor hall gir stor romklang, smal gang nesten ingen', () => {
    const level = building();
    const hall = measureRoom(level, 15.5, 12.5);
    const corridor = measureRoom(level, 15.5, 27.5);
    expect(hall.size).toBeGreaterThan(0.7);
    expect(corridor.size).toBeLessThan(0.15);
    expect(corridor.tight).toBeGreaterThan(0.4);
    expect(reverbMix(hall.size).large).toBeGreaterThan(reverbMix(corridor.size).large * 5);
  });

  it('lavt tak gjør rommet mindre', () => {
    const level = building();
    const high = measureRoom(level, 15.5, 12.5).size;
    level.height = 2.4;
    expect(measureRoom(level, 15.5, 12.5).size).toBeLessThan(high);
  });

  it('strålene stopper ved vegger', () => {
    expect(rayLength(building(), 1.5, 12.5, -1, 0)).toBeLessThanOrEqual(0.75);
  });
});

describe('bakgrunnslyder over tid', () => {
  it('ventilasjonen går av og på, og det blir stille innimellom', () => {
    const d = new AmbienceDirector(mulberry32(4));
    const seen = new Set();
    let quietAndMusic = false;
    for (let t = 0; t < 1800; t += 0.5) {
      for (const e of d.update(0.5)) seen.add(e);
      if (d.quiet.on && d.music.on) quietAndMusic = true;
    }
    expect(seen.has('vent:off')).toBe(true);
    expect(seen.has('vent:on')).toBe(true);
    expect(seen.has('quiet:on')).toBe(true);
    expect(seen.has('music:on')).toBe(true);
    expect(seen.has('rain:on')).toBe(true);
    expect(quietAndMusic).toBe(false);
  });

  it('uten regn der det ikke kan regne, og nesten stille i de stille periodene', () => {
    const d = new AmbienceDirector(mulberry32(2), { rainy: false });
    for (let t = 0; t < 1800; t += 0.5) {
      d.update(0.5);
      expect(d.rain.on).toBe(false);
    }
    d.quiet.on = true;
    expect(d.level).toBeLessThan(0.2);
  });
});
