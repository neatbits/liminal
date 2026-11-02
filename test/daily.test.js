import { describe, expect, it } from 'vitest';
import { dailyKey, dailyLabel, dailyLevel, formatTime, recordRun, streak, shareText } from '../src/gen/daily.js';
import { placeTapes } from '../src/gen/tapes.js';
import { resolveSpawn } from '../src/core/spawn.js';
import { THEME_IDS } from '../src/core/themes.js';

describe('Daily level', () => {
  it('nøkkelen er den lokale datoen', () => {
    expect(dailyKey(new Date(2026, 9, 29, 23, 59))).toBe('2026-10-29');
    expect(dailyKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(dailyLabel('2026-10-29')).toBe('29 Oct 2026');
  });

  it('samme dato gir samme nivå og samme kassetter for alle; en annen dato et annet nivå', () => {
    const a = dailyLevel('2026-10-29');
    const b = dailyLevel('2026-10-29');
    expect(Array.from(a.level.tiles)).toEqual(Array.from(b.level.tiles));
    expect(Array.from(a.level.lights)).toEqual(Array.from(b.level.lights));
    expect(a.level.objects).toEqual(b.level.objects);
    expect(THEME_IDS).toContain(a.theme);
    const tapes = ({ level, rand }) => placeTapes(level, resolveSpawn(level), rand);
    expect(tapes(a)).toEqual(tapes(b));
    expect(tapes(a).length).toBeGreaterThan(0);
    const others = ['2026-10-30', '2026-10-31', '2026-11-01'].map((k) => dailyLevel(k).level.tiles.join(''));
    expect(new Set([a.level.tiles.join(''), ...others]).size).toBe(4);
  });

  it('tid, rekorder, dager på rad og teksten man deler', () => {
    expect(formatTime(247.9)).toBe('4:07');
    expect(formatTime(3727)).toBe('1:02:07');
    let r = recordRun({}, '2026-10-29', 300);
    r = recordRun(r, '2026-10-29', 250);
    r = recordRun(r, '2026-10-29', 400);
    expect(r['2026-10-29']).toEqual({ best: 250, plays: 3 });
    r = recordRun(recordRun(r, '2026-10-28', 99), '2026-10-27', 99);
    expect(streak(r, '2026-10-29')).toBe(3);
    expect(streak(r, '2026-10-30')).toBe(3); // ikke spilt i dag ennå: rekken teller til i går
    expect(streak(r, '2026-10-31')).toBe(0);
    expect(streak({ '2026-02-28': {}, '2026-03-01': {} }, '2026-03-01')).toBe(2); // over månedsskiftet
    expect(shareText('2026-10-29', 250, 3, 3)).toBe('Liminal Simulator · Daily 2026-10-29 · 📼 3/3 in 4:10 · 3 days in a row\nliminalsimulator.com');
    expect(shareText('2026-10-29', 250, 3, 1)).not.toMatch(/in a row/);
  });
});
