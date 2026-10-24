import { describe, it, expect } from 'vitest';
import { createLevel, TILE } from '../src/core/level.js';
import { DOOR, setDoor } from '../src/core/doors.js';
import { presetById } from '../src/gen/index.js';
import { placedSources, sourceMix, PlacedSourceMap } from '../src/audio/placed-sources.js';
import { placedBuffer } from '../src/audio/placed-buffers.js';

function room() {
  const l = createLevel({ theme: 'mall', w: 16, h: 12, height: 7.8 });
  for (let z = 1; z < 11; z++) for (let x = 1; x < 15; x++) l.tiles[z * l.w + x] = TILE.FLOOR;
  l.objects = [{ id: 'arcade2', x: 10, z: 5, rot: 0 }];
  return l;
}
const listener = { x: 6.5, z: 5.5, y: 0, yaw: 0, power: 1 };
describe('placed sound sources', () => {
  it('uses one emitter per actual fountain/escalator and per cabinet', () => {
    const l = presetById('mall').make({ seed: 7, layout: 'gallery' }),
      sources = placedSources(l);
    expect(sources.filter(s => s.kind === 'fountain')).toHaveLength(2);
    expect(sources.filter(s => s.kind === 'escalator')).toHaveLength(2);
    expect(sources.filter(s => s.kind === 'arcade')).toHaveLength(
      l.objects.filter(o => o.id === 'arcade2').length,
    );
    expect(sources.every(s => [s.x, s.y, s.z].every(Number.isFinite))).toBe(true);
  });
  it('attenuates distance, walls, quiet periods and power; pans with head direction', () => {
    const s = { kind: 'fountain', x: 8, y: 1.4, z: 5.5 },
      near = sourceMix(s, listener);
    expect(near.pan).toBeGreaterThan(0);
    expect(sourceMix(s, { ...listener, yaw: Math.PI }).pan).toBeLessThan(0);
    expect(sourceMix(s, { ...listener, x: -20 }).gain).toBe(0);
    expect(sourceMix(s, listener, true).gain).toBeLessThan(near.gain * 0.2);
    expect(sourceMix(s, listener, false, 0.12).gain).toBeCloseTo(near.gain * 0.12);
    expect(sourceMix(s, { ...listener, power: 0 }).gain).toBe(0);
  });
  it('responds to a door opening without changing levels, and muffles through slabs', () => {
    const l = room();
    for (let z = 1; z < 11; z++) l.tiles[z * l.w + 8] = TILE.WALL;
    l.tiles[5 * l.w + 8] = TILE.DOOR;
    setDoor(l, 8, 5, DOOR.CLOSED);
    const map = new PlacedSourceMap(l),
      mix = () => map.mix(listener, 1).find(m => m.kind === 'arcade');
    const blocked = mix();
    setDoor(l, 8, 5, DOOR.OPEN);
    const clear = mix();
    expect(clear.gain).toBeGreaterThan(blocked.gain * 4);
    expect(clear.cutoff).toBeGreaterThan(blocked.cutoff);
    const upper = room();
    upper.decks.fill(44);
    const m = new PlacedSourceMap(upper);
    const same = m.mix(listener, 1).find(s => s.kind === 'arcade'),
      other = m.mix({ ...listener, y: 4.4 }, 1).find(s => s.kind === 'arcade');
    expect(other.gain).toBeLessThan(same.gain * 0.2);
  });
  it('limits the mix to three voices even for a large arcade', () => {
    const l = room();
    l.objects = Array.from({ length: 300 }, (_, i) => ({
      id: 'arcade2',
      x: 2 + (i % 12),
      z: 2 + (Math.floor(i / 12) % 8),
      rot: 0,
    }));
    expect(new PlacedSourceMap(l).mix(listener, 1)).toHaveLength(3);
  });
  it.each([22050, 48000])('generates finite original loops with gentle seams at %s Hz', sampleRate => {
    const ctx = {
      sampleRate,
      createBuffer: (_, n) => {
        const data = new Float32Array(n);
        return { getChannelData: () => data };
      },
    };
    for (const kind of ['fountain', 'escalator', 'arcade']) {
      const d = placedBuffer(ctx, kind).getChannelData(0);
      let peak = 0,
        energy = 0;
      expect(d.every(Number.isFinite)).toBe(true);
      for (const v of d) {
        peak = Math.max(peak, Math.abs(v));
        energy += v * v;
      }
      expect(d[0]).toBe(0);
      expect(Math.abs(d.at(-1))).toBeLessThan(0.001);
      expect(peak).toBeGreaterThan(0.05);
      expect(peak).toBeLessThan(0.7);
      expect(energy / d.length).toBeGreaterThan(0.0001);
      if (kind === 'arcade') expect(d.slice(sampleRate * 2).every(v => v === 0)).toBe(true);
    }
  });
});
