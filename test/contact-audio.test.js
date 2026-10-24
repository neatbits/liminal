import { afterEach, describe, expect, it, vi } from 'vitest';
import { footstepBuffers, createStepBuses } from '../src/audio/footsteps.js';
import { rubberBuffer, playImpact } from '../src/audio/contact-impact.js';
import { AudioEngine } from '../src/audio/engine.js';
import { mulberry32 } from '../src/core/rng.js';
import { createLevel, TILE } from '../src/core/level.js';
import { SoftPhysics } from '../src/world/softphysics.js';

function context(sampleRate = 48000) {
  return { sampleRate, currentTime: 0, createBuffer: (channels, length) => {
    const d = new Float32Array(length);
    return { length, duration: length / sampleRate, getChannelData: () => d };
  } };
}

function metrics(data, rate) {
  let energy = 0, early = 0, difference = 0;
  for (let i = 0; i < data.length; i++) {
    energy += data[i] ** 2;
    if (i < rate * 0.012) early += data[i] ** 2;
    if (i) difference += (data[i] - data[i - 1]) ** 2;
  }
  return { rms: Math.sqrt(energy / data.length), early: early / energy, brightness: difference / energy };
}

afterEach(() => vi.restoreAllMocks());

describe.each([22050, 44100, 48000, 96000])('myke kontaktlyder ved %s Hz', (rate) => {
  it.each(['carpet', 'foam', 'rubber', 'water'])('%s har gradvis anslag og ingen klikk ved start/slutt', (surface) => {
    vi.spyOn(Math, 'random').mockImplementation(mulberry32(18));
    const ctx = context(rate);
    const buffers = surface === 'rubber' ? [rubberBuffer(ctx)] : footstepBuffers(ctx, surface);
    for (const b of buffers) {
      const d = b.getChannelData(0), m = metrics(d, rate);
      expect(Math.abs(d[0])).toBe(0); expect(Math.abs(d.at(-1))).toBe(0);
      expect(d.every(Number.isFinite)).toBe(true);
      expect(m.rms).toBeGreaterThan(0.025);
      expect(m.early).toBeLessThan(0.12); // ingen tidlig energikonsentrasjon som ved et hardt slag
      expect(m.brightness).toBeLessThan((surface === 'water' ? 0.08 : 0.025) * (22050 / rate) ** 2);
      expect(Math.max(...d.map(Math.abs))).toBeLessThanOrEqual(surface === 'water' ? 0.51 : 0.43);
    }
  });
});

describe('miks og støtlyder', () => {
  function engine() {
    const audio = new AudioEngine();
    audio.ctx = context(); audio.playing = true;
    audio.steps = Object.fromEntries(['carpet', 'foam', 'tile'].map((key) => [key, [key]]));
    audio.graph = { stepBus: 'solid', stepBuses: { carpet: 'carpet', foam: 'foam' } };
    audio._oneShot = vi.fn(); audio.thump = 'building thump';
    return audio;
  }

  it('teppe og matter er dempet og bruker hver sin buss med mindre romklang', () => {
    const audio = engine();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    audio.step('tile'); const tile = audio._oneShot.mock.lastCall;
    for (const name of ['carpet', 'foam']) {
      audio.step(name); const soft = audio._oneShot.mock.lastCall;
      expect(soft[1]).toBeLessThan(tile[1]); expect(soft[3]).toBe(name);
      audio.step(name, 0.4); expect(audio._oneShot.mock.lastCall[1]).toBeCloseTo(soft[1] * 0.4);
    }
    audio.step('unknown'); expect(audio._oneShot.mock.lastCall[0]).toBe('carpet');
    const send = vi.fn();
    createStepBuses({ createGain: () => ({ gain: {} }) }, (n) => n, send);
    expect(send.mock.calls.slice(0, 2).every(([, wet]) => wet <= 0.16)).toBe(true);
    expect(send.mock.calls.every(([, wet]) => wet < 0.35)).toBe(true);
  });

  it('gummi får egen lyd og begrenser tette støt, plast beholder sin lyd', () => {
    const audio = engine();
    playImpact(audio, 1, 'rubber');
    const [buffer, loud, , bus] = audio._oneShot.mock.lastCall;
    expect(buffer).not.toBe(audio.thump); expect(loud).toBeLessThanOrEqual(0.32); expect(bus).toBe('foam');
    for (let i = 0; i < 20; i++) playImpact(audio, 1, 'rubber');
    expect(audio._oneShot).toHaveBeenCalledTimes(1);
    audio.ctx.currentTime = 0.121;
    playImpact(audio, 0.25, 'rubber');
    expect(audio._oneShot.mock.lastCall[0]).toBe(buffer); expect(audio._oneShot.mock.lastCall[1]).toBeLessThan(loud);
    playImpact(audio, 1, 'plastic'); expect(audio._oneShot.mock.lastCall[0]).toBe(audio.thump);
  });

  it('mute og pause lager ikke nye støt eller lydnoder; ferdige én-skudd kobles fra', () => {
    const audio = new AudioEngine();
    const source = { playbackRate: {}, connect: vi.fn((n) => n), disconnect: vi.fn(), start: vi.fn() };
    const gain = { gain: {}, connect: vi.fn(), disconnect: vi.fn() };
    audio.ctx = { createBufferSource: vi.fn(() => source), createGain: () => gain };
    audio.graph = { stepBus: 'default' };
    audio._oneShot('test', 1); expect(audio.ctx.createBufferSource).not.toHaveBeenCalled();
    audio.enabled = false; audio.playing = true;
    audio._oneShot('test', 1); expect(audio.ctx.createBufferSource).not.toHaveBeenCalled();
    playImpact(audio, 1); expect(audio.rubberSound).toBeUndefined();
    audio.enabled = true;
    audio._oneShot('test', 0.5, 1, 'soft'); expect(gain.connect).toHaveBeenCalledWith('soft');
    source.onended(); expect(source.disconnect).toHaveBeenCalled(); expect(gain.disconnect).toHaveBeenCalled();
  });

  it.each([['softcube', 'rubber'], ['playball', 'ball'], ['plasticchair', 'plastic']])(
    'ekte fall av %s sender materialet %s fra fysikken', (id, material) => {
      const level = createLevel({ theme: 'playroom', w: 8, h: 8 });
      level.tiles.fill(TILE.FLOOR);
      level.objects = [{ id, x: 4, z: 4, rot: 0 }];
      const phys = new SoftPhysics(level); phys.onImpact = vi.fn();
      phys.blocks[0].body.position.y = 3;
      for (let i = 0; i < 120; i++) phys.step(1 / 60);
      expect(phys.onImpact).toHaveBeenCalled();
      expect(phys.onImpact.mock.calls.every((call) => call[3] === material)).toBe(true);
    },
  );
});
