import { describe, expect, it } from 'vitest';
import { SoundBank } from '../src/audio/bank.js';
import { NIGHT_RECIPES } from '../src/audio/eerie-night.js';

const ctx = {
  sampleRate: 22050,
  createBuffer(channels, length) {
    const data = new Float32Array(length);
    return { length, getChannelData: () => data };
  },
};

/** Kjører rundene for hånd: én om gangen, slik setTimeout ville gjort mellom bildene. */
function manual() {
  const jobs = [];
  const run = () => {
    let n = 0;
    while (jobs.length) (jobs.shift())(), n++;
    return n;
  };
  return { schedule: (fn) => jobs.push(fn), jobs, run };
}

describe('SoundBank', () => {
  it('lager lyden litt etter litt, og ingenting er klart før siste runde', () => {
    const q = manual();
    let calls = 0;
    const bank = new SoundBank(ctx, { tone: () => ({ seconds: 1, fn: (t, i) => (calls++, Math.sin(i)) }) }, q.schedule);
    bank.prepare('tone');
    expect(calls).toBe(0); // ingenting regnes ut i samme stund
    q.jobs.shift()();
    expect(calls).toBe(8192);
    expect(bank.take('tone')).toBeNull();
    expect(q.run()).toBe(2); // 22050 prøver = tre runder
    const buffer = bank.take('tone');
    expect(buffer.length).toBe(22050);
    expect(Math.max(...buffer.getChannelData(0).map(Math.abs))).toBeCloseTo(0.8); // normalisert
  });

  it('en brukt variant erstattes med en ny, og samme lyd står aldri i kø to ganger', () => {
    const q = manual();
    const bank = new SoundBank(ctx, NIGHT_RECIPES, q.schedule);
    bank.prepare('roar', 'growl', 'roar');
    bank.prepare('growl');
    expect(bank.queue).toEqual(['growl']); // roar lages nå
    q.run();
    const first = bank.take('roar');
    expect(first).not.toBeNull();
    expect(bank.current).toBe('roar'); // en ny variant er på vei
    q.run();
    const second = bank.take('roar');
    expect(second).not.toBe(first);
    for (const name of Object.keys(NIGHT_RECIPES)) {
      bank.prepare(name);
      q.run();
      const d = bank.take(name).getChannelData(0);
      expect(d.every(Number.isFinite), name).toBe(true);
    }
  });
});
