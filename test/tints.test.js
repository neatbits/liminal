import { describe, expect, it } from 'vitest';
import { TINTS, TINT_IDS, HOLD, FADE, tintColor, tintFactor, activeTint, pickTint } from '../src/core/tints.js';
import { createLevel } from '../src/core/level.js';
import { levelToJSON, levelFromJSON } from '../src/core/serialize.js';
import { mulberry32 } from '../src/core/rng.js';
import { hexToLinear } from '../src/world/color.js';

const luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const warm = hexToLinear('#ffe6a8'); // en gulhvit lampe (som Level 0)

describe('lysfarger', () => {
  it('temaets egen endrer ingenting', () => {
    expect(tintColor('theme')).toBeNull();
    expect(tintFactor('theme', 0, warm)).toEqual([1, 1, 1]);
    expect(tintFactor('nonsense', 0, warm)).toEqual([1, 1, 1]);
  });

  it('lampene får fargen, med samme lysstyrke som før', () => {
    for (const id of TINT_IDS.filter((id) => TINTS[id].color)) {
      const f = tintFactor(id, 0, warm);
      const lamp = warm.map((v, i) => v * f[i]);
      expect(luma(lamp)).toBeCloseTo(luma(warm), 5);
      // Samme forhold mellom kanalene som målfargen.
      const target = hexToLinear(TINTS[id].color);
      expect(lamp[2] / lamp[1]).toBeCloseTo(target[2] / target[1], 5);
    }
  });

  it('Shifting holder hver farge en stund og glir uten hopp over i neste', () => {
    const [first, second] = TINTS.shifting.cycle.map((id) => hexToLinear(TINTS[id].color));
    expect(tintColor('shifting', 1)).toEqual(first);
    expect(tintColor('shifting', HOLD - 0.01)).toEqual(first);
    tintColor('shifting', HOLD + FADE).forEach((v, i) => expect(v).toBeCloseTo(second[i], 6));
    let prev = tintColor('shifting', 0);
    for (let t = 0.1; t < 3 * (HOLD + FADE); t += 0.1) {
      const c = tintColor('shifting', t);
      expect(Math.max(...c.map((v, i) => Math.abs(v - prev[i])))).toBeLessThan(0.02);
      prev = c;
    }
  });

  it('visningsinnstillingen overstyrer rommets, «room» bruker rommets', () => {
    const level = { tint: 'lilac' };
    expect(activeTint('room', level)).toBe('lilac');
    expect(activeTint('cold', level)).toBe('cold');
    expect(activeTint('theme', level)).toBe('theme');
    expect(activeTint('room', { tint: null })).toBe('theme');
    expect(activeTint(undefined, {})).toBe('theme');
  });

  it('lagres med rommet og leses inn igjen; ukjente farger blir temaets', () => {
    const level = createLevel({ w: 10, h: 10 });
    level.tint = 'shifting';
    expect(levelFromJSON(levelToJSON(level)).tint).toBe('shifting');
    expect(levelFromJSON({ ...levelToJSON(level), tint: 'plaid' }).tint).toBeNull();
    level.tint = null;
    expect(levelFromJSON(levelToJSON(level)).tint).toBeNull();
  });

  it('tilfeldig lysfarge er aldri temaets egen', () => {
    const rand = mulberry32(3);
    for (let i = 0; i < 50; i++) expect(TINTS[pickTint(rand)]).toBeDefined();
    for (let i = 0; i < 50; i++) expect(pickTint(rand)).not.toBe('theme');
  });
});
