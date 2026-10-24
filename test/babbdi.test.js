import { describe, expect, it } from 'vitest';
import { TILE } from '../src/core/level.js';
import { mulberry32 } from '../src/core/rng.js';
import { THEME_IDS, getTheme } from '../src/core/themes.js';
import { windows } from '../src/core/windows.js';
import { doorInfo } from '../src/core/doors.js';
import { groundAt, deckAt } from '../src/core/heights.js';
import { babbdiLevel, BABBDI_DECK } from '../src/gen/babbdi.js';
import { nextLevel } from '../src/gen/endless.js';
import { reachableCells, placeTapes } from '../src/gen/tapes.js';

describe('betongsalene (sjeldent nivå)', () => {
  it('er et skjult tema: ikke i lister eller blant de vanlige nivåene', () => {
    expect(THEME_IDS).not.toContain('babbdi');
    expect(getTheme('babbdi').id).toBe('babbdi');
    for (let s = 1; s <= 200; s++) {
      const { kind, level } = nextLevel(3, 'office', mulberry32(s));
      if (kind !== 'halls') expect(level.theme).not.toBe('babbdi');
    }
  });

  it('har vinduer i begge langveggene, gallerier som trappene når, og utganger bare i endeveggene', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const l = babbdiLevel(mulberry32(seed), 'Level 5');
      const wins = windows(l);
      expect(wins.some((w) => w.z === 0) && wins.some((w) => w.z === l.h - 1)).toBe(true);
      for (const w of wins) expect(w.head - w.sill).toBeGreaterThan(7); // fra gulvet nesten til taket
      const exits = [];
      for (let z = 0; z < l.h; z++) for (let x = 0; x < l.w; x++) if (doorInfo(l, x, z)?.oneSided) exits.push([x, z]);
      expect(exits.length).toBeGreaterThanOrEqual(2);
      for (const [x] of exits) expect(x === 0 || x === l.w - 1).toBe(true);
      // Øverste trinn i hvert løp er i galleriets høyde, og reposet etter det er et dekke.
      const tops = [];
      for (let i = 0; i < l.tiles.length; i++) if (l.tiles[i] === TILE.STAIRS && l.floors[i] === BABBDI_DECK * 10) tops.push(i);
      expect(tops).toHaveLength(2);
      for (const i of tops) {
        const [x, z] = [i % l.w, Math.floor(i / l.w)];
        const landing = deckAt(l, x + 1, z) ? x + 1 : x - 1;
        expect(deckAt(l, landing, z)).toBe(BABBDI_DECK);
        expect(groundAt(l, landing + 0.5, z + 0.5, BABBDI_DECK)).toBeCloseTo(BABBDI_DECK); // reposet
      }
      // Galleriet: står man oppe, står man på dekket; nede er det gulvet under.
      expect(groundAt(l, 10.5, 1.5, BABBDI_DECK + 0.2)).toBeCloseTo(BABBDI_DECK);
      expect(groundAt(l, 10.5, 1.5, 0)).toBeCloseTo(0);
      // Kassettene kan nås fra start.
      const reach = reachableCells(l, l.spawn.x, l.spawn.z);
      for (const t of placeTapes(l, l.spawn, mulberry32(seed))) expect(reach[Math.floor(t.z) * l.w + Math.floor(t.x)]).toBe(1);
    }
  });

  // Hvert kall genererer et helt nivå, så testen får bedre tid enn standarden.
  it('kommer sjelden, fra Level 2, og aldri to ganger på rad', { timeout: 30000 }, () => {
    let halls = 0;
    const N = 300;
    for (let s = 1; s <= N; s++) {
      // Samme frø gir samme trekning: der dette frøet ville gitt salene, gjør det ikke det her.
      const kind = nextLevel(4, 'office', mulberry32(s)).kind;
      if (kind !== 'halls') continue;
      halls++;
      expect(nextLevel(1, 'office', mulberry32(s)).kind).not.toBe('halls');
      expect(nextLevel(4, 'babbdi', mulberry32(s)).kind).not.toBe('halls');
    }
    expect(halls / N).toBeGreaterThan(0.015);
    expect(halls / N).toBeLessThan(0.1);
  });
});
