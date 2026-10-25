import { describe, expect, it } from 'vitest';
import { EERIE_SOUNDS, eerieBuffer, pickEerie } from '../src/audio/eerie.js';
import { nightBuffer, warmNight } from '../src/audio/eerie-night.js';
import { SoundBank } from '../src/audio/bank.js';
import { MOODS } from '../src/gen/moods.js';
import { heardFrom } from '../src/world/monster-ai.js';
import { roarAt } from '../src/audio/scary.js';

const ctx = {
  sampleRate: 22050,
  createBuffer(channels, length) {
    const data = new Float32Array(length);
    return { length, getChannelData: () => data };
  },
};
const rms = (d, a, b) => {
  let s = 0;
  for (let i = a; i < b; i++) s += d[i] * d[i];
  return Math.sqrt(s / (b - a));
};

describe('Nightmare-lydene', () => {
  it('stemningens egne lyder finnes, og bare Nightmare har dem og brølet', () => {
    for (const name of MOODS.nightmare.sounds) expect(EERIE_SOUNDS).toContain(name);
    expect(MOODS.nightmare.chase.roar[0]).toBeGreaterThan(0);
    for (const id of ['normal', 'abandoned', 'liminal', 'uncanny']) expect(MOODS[id].sounds ?? []).toEqual([]);
  });

  it('temaets og stemningens lyder blandes omtrent halvparten hver', () => {
    const night = MOODS.nightmare.sounds;
    let fromMood = 0;
    for (let i = 0; i < 2000; i++) if (night.includes(pickEerie(['knocks', 'buzz'], night))) fromMood++;
    expect(fromMood).toBeGreaterThan(850);
    expect(fromMood).toBeLessThan(1150);
    expect(pickEerie(['knocks'])).toBe('knocks'); // uten stemningens lyder: bare temaets
  });

  it('brølet er dypt og langt, og skrittene kommer nærmere', () => {
    const d = nightBuffer(ctx, 'roar').getChannelData(0);
    expect(d.length / ctx.sampleRate).toBeGreaterThan(2.3);
    let crossings = 0;
    for (let i = 1; i < d.length; i++) if (d[i - 1] < 0 !== d[i] < 0) crossings++;
    expect(crossings / (d.length / ctx.sampleRate)).toBeLessThan(1500); // mest lave frekvenser
    const steps = eerieBuffer(ctx, 'stalk').getChannelData(0);
    const n = steps.length, q = Math.floor(n / 4);
    expect(rms(steps, n - 2 * q, n)).toBeGreaterThan(rms(steps, 0, q) * 2);
  });

  it('lyden fra monsteret kommer fra riktig side', () => {
    const player = { x: 5, z: 5, yaw: 0 }; // ser mot −z, høyre er +x
    expect(heardFrom(9, 5, player).pan).toBeCloseTo(1);
    expect(heardFrom(1, 5, player).pan).toBeCloseTo(-1);
    expect(heardFrom(5, 1, player)).toMatchObject({ dist: 4 });
    expect(heardFrom(5, 1, player).pan).toBeCloseTo(0);
    expect(heardFrom(5, 5, player).pan).toBe(0);
  });

  it('brølet sendes gjennom romklangen, dempet med avstanden og fra monsterets side', () => {
    const made = [];
    const node = (kind, extra = {}) => {
      const n = { kind, to: null, connect: (m) => ((n.to = m), m), ...extra };
      made.push(n);
      return n;
    };
    const audio = { graph: { stepBus: 'reverb' }, ctx: { ...ctx,
      createBufferSource: () => node('src', { playbackRate: {}, start: () => (audio.started = true) }),
      createBiquadFilter: () => node('lowpass', { frequency: {} }),
      createGain: () => node('gain', { gain: {} }),
      createStereoPanner: () => node('pan', { pan: {} }) } };
    roarAt(audio, 2, 0.8, 1);
    expect(made.map((n) => n.kind)).toEqual(['src', 'lowpass', 'gain', 'pan']);
    expect(made[1].frequency.value).toBe(1500);
    expect(made[3].pan.value).toBe(1);
    expect(made[3].to).toBe('reverb');
    expect(audio.started).toBe(true);
    expect(() => roarAt({ ctx: null }, 0, 1, 0)).not.toThrow(); // uten lyd: ingenting
  });
});
