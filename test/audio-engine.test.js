import { describe, expect, it, vi } from 'vitest';
import { AudioEngine } from '../src/audio/engine.js';

function engine() {
  const audio = new AudioEngine();
  audio.ctx = { currentTime: 10, resume: vi.fn() };
  audio.master = { gain: { setTargetAtTime: vi.fn() } };
  audio.graph = {};
  audio.themeId = 'pool';
  return audio;
}

const gain = (audio) => audio.master.gain.setTargetAtTime.mock.lastCall[0];

describe('lydmotorens volum og avspilling', () => {
  it('volum kan justeres før første brukerhandling uten å starte lyd', () => {
    const audio = new AudioEngine();
    expect(() => audio.setVolume(0.4)).not.toThrow();
    expect(audio.ctx).toBeNull();
    expect(audio.playing).toBe(false);
  });

  it('avslått lyd forblir avslått etter oppdatering av innstillinger', () => {
    const audio = engine();
    audio.start({ id: 'pool' });
    expect(gain(audio)).toBe(0.8);
    audio.setEnabled(false);
    audio.setVolume(0.6);
    expect(gain(audio)).toBe(0);
    audio.setEnabled(true);
    audio.setVolume(0.6);
    expect(gain(audio)).toBe(0);
    audio.start({ id: 'pool' });
    expect(gain(audio)).toBe(0.6);
  });

  it('ut av gåmodus eller på pause: innstillinger starter ikke lyden på nytt', () => {
    const audio = engine();
    audio.start({ id: 'pool' });
    audio.stop();
    audio.setVolume(1);
    expect(gain(audio)).toBe(0);
    expect(audio.playing).toBe(false);
    audio.start({ id: 'pool' });
    expect(gain(audio)).toBe(1);
  });

  it('volum under aktiv gange brukes med en gang', () => {
    const audio = engine();
    audio.start({ id: 'pool' });
    audio.setVolume(0.25);
    expect(gain(audio)).toBe(0.25);
  });
});
