import { describe, expect, it } from 'vitest';
import { LIGHT } from '../src/core/level.js';
import { mulberry32 } from '../src/core/rng.js';
import { MOODS, MOOD_IDS, DEFAULT_MOOD, getMood, nextMood, moodLevel, decayLights } from '../src/gen/moods.js';
import { nextLevel } from '../src/gen/endless.js';
import { generateLevel, presetById } from '../src/gen/index.js';

const lit = (level) => level.lights.filter((l) => l === LIGHT.ON).length;
const content = (l) => JSON.stringify([Array.from(l.tiles), Array.from(l.lights), Array.from(l.ceilings), Array.from(l.meta), l.objects, l.fog]);

describe('stemningsskalaen', () => {
  it('fem trinn i rekkefølge, Liminal som standard, og X går rundt', () => {
    expect(MOOD_IDS).toEqual(['normal', 'abandoned', 'liminal', 'uncanny', 'nightmare']);
    expect(DEFAULT_MOOD).toBe('liminal');
    expect(nextMood('nightmare')).toBe('normal');
    expect(getMood('ukjent').label).toBe('Liminal');
  });

  it('jo nærmere Nightmare, desto tettere tåke, mørkere bilde og oftere skumle lyder', () => {
    const list = MOOD_IDS.map(getMood);
    for (let k = 1; k < list.length; k++) {
      if (k !== 2) expect(list[k].fog).toBeGreaterThan(list[k - 1].fog); // Liminal er referansen (1)
      expect(list[k].eerie).toBeLessThanOrEqual(list[k - 1].eerie);
    }
    expect(MOODS.normal.monster).toBeNull();
    expect(MOODS.normal.blackout).toBeNull();
    expect(MOODS.uncanny.monster).toBe('lurk');
    expect(MOODS.nightmare.monster).toBe('hunt');
    expect(MOODS.normal.anomalies.loops).toBe(0);
    expect(MOODS.liminal.anomalies.loops).toBe(1);
  });

  it('ditt eget rom endres ikke i Normal og Liminal – men får ødelagte lys og feil i sterkere stemninger', () => {
    const room = presetById('office').make();
    expect(moodLevel(room, 'normal', mulberry32(1), { home: true })).toBeNull();
    expect(moodLevel(room, 'liminal', mulberry32(1), { home: true })).toBeNull();
    const abandoned = moodLevel(room, 'abandoned', mulberry32(1), { home: true });
    expect(lit(abandoned)).toBeLessThan(lit(room) * 0.9);
    const night = moodLevel(room, 'nightmare', mulberry32(1), { home: true });
    expect(content(night)).not.toBe(content(room));
    expect(lit(room)).toBe(lit(presetById('office').make())); // originalen er urørt
  });

  it('genererte nivåer gjøres feil allerede i Liminal', () => {
    const level = generateLevel({ theme: 'office', w: 40, h: 32, seed: 4 });
    const changed = moodLevel(level, 'liminal', mulberry32(2));
    expect(changed).not.toBeNull();
    expect(content(changed)).not.toBe(content(level));
  });

  it('ødelegger en andel av de tente lysene', () => {
    const level = generateLevel({ theme: 'backrooms', w: 40, h: 40, seed: 3 });
    const before = lit(level);
    const n = decayLights(level, 0.2, 0.1, mulberry32(5));
    expect(n / before).toBeGreaterThan(0.2);
    expect(n / before).toBeLessThan(0.4);
  });

  it('Abandoned: nesten halvparten av lysene er døde, samlet i mørke områder', () => {
    const level = generateLevel({ theme: 'backrooms', w: 48, h: 48, seed: 6 });
    const before = lit(level);
    const out = moodLevel(level, 'abandoned', mulberry32(3));
    expect(lit(out) / before).toBeLessThan(0.62);
    // Level 0 får i tillegg alltid et mørkt område (gen/darkness.js, temaets dark), så litt færre.
    expect(lit(out) / before).toBeGreaterThan(0.25);
    // Andelen døde lys per område på 12 × 12 m varierer mye: noen deler er nesten mørke.
    const shares = [];
    for (let z0 = 0; z0 < 48; z0 += 12) {
      for (let x0 = 0; x0 < 48; x0 += 12) {
        let on = 0;
        let dead = 0;
        for (let z = z0; z < z0 + 12; z++) {
          for (let x = x0; x < x0 + 12; x++) {
            if (level.lights[z * 48 + x] !== LIGHT.ON) continue;
            if (out.lights[z * 48 + x] === LIGHT.BROKEN) dead++;
            else on++;
          }
        }
        if (on + dead >= 6) shares.push(dead / (on + dead));
      }
    }
    expect(Math.max(...shares)).toBeGreaterThan(0.65);
    expect(Math.min(...shares)).toBeLessThan(0.25);
  });

  it('uten avvik er neste nivå alltid et vanlig rom', () => {
    const current = presetById('basement').make();
    for (let s = 1; s <= 30; s++) {
      expect(nextLevel(3, 'basement', mulberry32(s), current, MOODS.normal.anomalies).kind).toBe('room');
    }
  });
});
