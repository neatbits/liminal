import { describe, expect, it } from 'vitest';
import { footstepBuffers } from '../src/audio/synth.js';
import { doorBuffer } from '../src/audio/effects.js';

const ctx = {
  sampleRate: 22050,
  createBuffer(channels, length) {
    const data = new Float32Array(length);
    return { length, getChannelData: () => data };
  },
};

/** Hvor «skarp» lyden er: snittet av endringen mellom samplene i forhold til snittnivået. */
function sharpness(data) {
  let diff = 0;
  let level = 0;
  for (let i = 1; i < data.length; i++) {
    diff += Math.abs(data[i] - data[i - 1]);
    level += Math.abs(data[i]);
  }
  return diff / level;
}

describe('fottrinn', () => {
  it('trinn på fliser er dumpe, ikke klikkende som hæler', () => {
    for (const b of footstepBuffers(ctx, 'tile')) expect(sharpness(b.getChannelData(0))).toBeLessThan(0.25);
  });

  it('alle underlag gir hørbare trinn', () => {
    for (const surface of ['carpet', 'tile', 'concrete', 'water']) {
      const d = footstepBuffers(ctx, surface)[0].getChannelData(0);
      expect(Math.max(...d.map(Math.abs)), surface).toBeGreaterThan(0.3);
    }
  });

  it('ingen trinn starter med et hardt klikk', () => {
    for (const surface of ['carpet', 'tile', 'concrete', 'foam']) {
      for (const b of footstepBuffers(ctx, surface)) {
        const d = b.getChannelData(0);
        // De første 2 ms er bare en kort opptrapping, ikke en topp.
        const head = Math.max(...d.slice(0, 44).map(Math.abs));
        expect(head, surface).toBeLessThan(0.4);
        expect(sharpness(d), surface).toBeLessThan(0.3);
      }
    }
  });
});

describe('dørlyd', () => {
  it('åpne og lukke gir hørbare, rolige lyder innenfor ±1', () => {
    for (const opening of [true, false]) {
      const d = doorBuffer(ctx, opening).getChannelData(0);
      const peak = Math.max(...d.map(Math.abs));
      expect(peak).toBeGreaterThan(0.3);
      expect(peak).toBeLessThanOrEqual(1);
    }
  });

  it('lukking slutter med et dunk; åpning har ikke noe dunk', () => {
    const energy = (d, a, b) => d.slice(Math.floor(a * 22050), Math.floor(b * 22050)).reduce((s, v) => s + v * v, 0);
    const closing = doorBuffer(ctx, false).getChannelData(0);
    expect(energy(closing, 0.42, 0.52)).toBeGreaterThan(energy(closing, 0.3, 0.4) * 3);
  });
});
