import { describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import { mulberry32 } from '../src/core/rng.js';
import { tracksFrom, shuffled } from '../src/audio/playlist.js';

describe('spillelisten', () => {
  it('tittel fra filnavnet, sortert (tall i rekkefølge)', () => {
    const tracks = tracksFrom({ '../../music/Liminal 10.mp3': 'b', '../../music/Liminal 2.mp3': 'a', '../../music/Jazz.mp3': 'c' });
    expect(tracks).toEqual([
      { title: 'Jazz', url: 'c' },
      { title: 'Liminal 2', url: 'a' },
      { title: 'Liminal 10', url: 'b' },
    ]);
  });

  it('tilfeldig rekkefølge: alle sangene én gang per runde, aldri samme sang to ganger på rad', () => {
    const rand = mulberry32(7);
    const orders = new Set();
    let last = -1;
    for (let k = 0; k < 40; k++) {
      const order = shuffled(6, rand, last);
      expect([...order].sort()).toEqual([0, 1, 2, 3, 4, 5]);
      expect(order[0]).not.toBe(last);
      orders.add(order.join());
      last = order.at(-1);
    }
    expect(orders.size).toBeGreaterThan(30); // ulik rekkefølge fra runde til runde
    expect(shuffled(0)).toEqual([]);
    expect(shuffled(1, rand, 0)).toEqual([0]);
  });

  it('music/ har sanger', () => {
    expect(readdirSync('music').filter((f) => f.endsWith('.mp3')).length).toBeGreaterThan(0);
  });
});
