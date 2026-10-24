import { describe, expect, it, vi } from 'vitest';
import { footstepBuffers } from '../src/audio/synth.js';
import { doorBuffer } from '../src/audio/effects.js';
import { surfaceFor } from '../src/view3d/walker.js';
import { getTheme } from '../src/core/themes.js';
import { TILE } from '../src/core/level.js';
import { mulberry32 } from '../src/core/rng.js';
import { playStep } from '../src/audio/footsteps.js';

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
  it('keeps footstep playback subdued, including louder randomized variants',()=>{
    const surfaces = ['carpet', 'foam', 'tile', 'concrete', 'water', 'balls'];
    const engine = { steps: Object.fromEntries(surfaces.map(s => [s, [s]])), _oneShot: vi.fn() };
    const random = vi.spyOn(Math, 'random').mockReturnValue(.999);
    try {
      for(const surface of surfaces) {
        playStep(engine, surface); const gain = engine._oneShot.mock.lastCall[1];
        expect(gain).toBeGreaterThan(.01); expect(gain).toBeLessThan(.055);
        playStep(engine, surface, .4); expect(engine._oneShot.mock.lastCall[1]).toBeCloseTo(gain * .4);
      }
    } finally {random.mockRestore();}
  });
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

describe('fottrinn på teppe', () => {
  it('er mykere enn på fliser og betong: lavere skarphet og langsommere anslag', () => {
    // Samme repeterbare støy for alle underlag. Få, helt tilfeldige trinn kan overlappe.
    const avg = (surface, f) => {
      const random = vi.spyOn(Math, 'random').mockImplementation(mulberry32(1));
      try {
        const all = Array.from({ length: 32 }, () => footstepBuffers(ctx, surface)).flat();
        return all.reduce((sum, b) => sum + f(b.getChannelData(0)), 0) / all.length;
      } finally { random.mockRestore(); }
    };
    // Hvor tidlig toppen kommer (ms): et mykt trinn bygger seg opp.
    const peakAt = (d) => {
      let k = 0;
      for (let i = 1; i < d.length; i++) if (Math.abs(d[i]) > Math.abs(d[k])) k = i;
      return (k / 22050) * 1000;
    };
    expect(avg('carpet', sharpness)).toBeLessThan(avg('tile', sharpness));
    expect(avg('carpet', sharpness)).toBeLessThan(avg('concrete', sharpness));
    expect(avg('carpet', peakAt)).toBeGreaterThan(avg('concrete', peakAt));
  });

  it('flislagte deler av teppetemaer høres ut som fliser; butikkene i kjøpesenteret som teppe', () => {
    const backrooms = getTheme('backrooms');
    expect(surfaceFor(backrooms, TILE.FLOOR)).toBe('carpet');
    expect(surfaceFor(backrooms, TILE.FLOOR, 1)).toBe('tile');
    expect(surfaceFor(getTheme('mall'), TILE.FLOOR, 1)).toBe('carpet');
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
