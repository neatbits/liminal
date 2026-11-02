import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fadeStep } from '../src/audio/playlist.js';
import { Music, TRACKS } from '../src/audio/music.js';

// Som <audio>: et volum utenfor 0–1 er en feil.
class FakeAudio {
  paused = true;
  src = '';
  _volume = 1;
  get volume() {
    return this._volume;
  }
  set volume(v) {
    if (v < 0 || v > 1) throw new RangeError(`volume ${v}`);
    this._volume = v;
  }
  addEventListener() {}
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}

describe('toningen', () => {
  it('går mot målet og aldri forbi', () => {
    expect(fadeStep(0, 1, 0.25)).toBe(0.25);
    expect(fadeStep(0.9, 1, 0.25)).toBe(1);
    expect(fadeStep(0.1, 0, 0.25)).toBe(0);
  });

  it('går aldri baklengs når klokken ligger bak (volumet ble negativt, og musikken stoppet aldri)', () => {
    expect(fadeStep(0, 1, -0.01)).toBe(0);
    expect(fadeStep(1, 0, -0.01)).toBe(1);
  });
});

describe('musikken av og på', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] });
    vi.stubGlobal('Audio', FakeAudio);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('har sanger å spille', () => {
    expect(TRACKS.length).toBeGreaterThan(0);
  });

  it('stopper når den slås av, også rett etter at den ble slått på', () => {
    const m = new Music();
    m.setOn(true);
    vi.advanceTimersByTime(90);
    m.setOn(false);
    vi.advanceTimersByTime(3000);
    expect(m.audio.paused).toBe(true);
    expect(m.level).toBe(0);
  });

  it('toner inn til full styrke og av igjen, gang etter gang', () => {
    const m = new Music();
    m.setVolume(0.8);
    for (let i = 0; i < 3; i++) {
      m.setOn(true);
      vi.advanceTimersByTime(3000);
      expect(m.level).toBe(1);
      expect(m.audio.paused).toBe(false);
      expect(m.audio.volume).toBeCloseTo(0.4);
      m.setOn(false);
      vi.advanceTimersByTime(3000);
      expect(m.audio.paused).toBe(true);
    }
  });

  it('samme valg to ganger gjør ingenting', () => {
    const m = new Music();
    m.setOn(true);
    const play = vi.spyOn(m.audio, 'play');
    m.setOn(true);
    expect(play).not.toHaveBeenCalled();
  });

  it('volumendring midt i toningen er trygg', () => {
    const m = new Music();
    m.setOn(true);
    vi.advanceTimersByTime(60);
    expect(() => m.setVolume(1)).not.toThrow();
  });
});
