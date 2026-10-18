import { describe, expect, it } from 'vitest';
import { vhsStamp, photoName } from '../src/view3d/photo.js';
import { shutterBuffer } from '../src/audio/effects.js';

const d = new Date(2026, 9, 18, 3, 14, 22);

describe('fotomodus', () => {
  it('VHS-stempelet har et falskt 90-tallsår og ekte klokkeslett', () => {
    expect(vhsStamp(d)).toBe('OCT. 18 1997  03:14:22');
  });

  it('filnavnet bygges av romnavnet og tidspunktet', () => {
    expect(photoName('The Mall', d)).toBe('liminal-the-mall-20261018-031422.png');
    expect(photoName('Kjøkken på Ål!', d)).toBe('liminal-kjokken-pa-al-20261018-031422.png');
    expect(photoName('', d, 'jpg')).toBe('liminal-room-20261018-031422.jpg');
  });

  it('lukkerlyden er kort og hørbar', () => {
    const ctx = { sampleRate: 22050, createBuffer: (c, n) => ({ length: n, getChannelData: (() => { const a = new Float32Array(n); return () => a; })() }) };
    const data = shutterBuffer(ctx).getChannelData(0);
    expect(data.length).toBeLessThan(22050 * 0.25);
    expect(Math.max(...data.map(Math.abs))).toBeGreaterThan(0.2);
  });
});
