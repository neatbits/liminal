import { describe, expect, it } from 'vitest';
import { EERIE_SOUNDS, eerieBuffer } from '../src/audio/eerie.js';
import { THEMES } from '../src/core/themes.js';

// Minimal AudioContext: bare det lydbyggerne bruker.
const ctx = {
  sampleRate: 8000,
  createBuffer(channels, length) {
    const data = new Float32Array(length);
    return { length, getChannelData: () => data };
  },
};

describe('skumle lyder', () => {
  it('alle lydene lages, er hørbare og holder seg innenfor ±1', () => {
    for (const name of EERIE_SOUNDS) {
      const d = eerieBuffer(ctx, name).getChannelData(0);
      let peak = 0;
      for (const v of d) {
        expect(Number.isFinite(v)).toBe(true);
        peak = Math.max(peak, Math.abs(v));
      }
      expect(peak, name).toBeGreaterThan(0.1);
      expect(peak, name).toBeLessThanOrEqual(1);
    }
  });

  it('hvert tema har sine egne lyder, og alle finnes', () => {
    for (const theme of Object.values(THEMES)) {
      expect(theme.sound.eerie.length, theme.id).toBeGreaterThan(2);
      for (const name of theme.sound.eerie) expect(EERIE_SOUNDS).toContain(name);
    }
  });
});
