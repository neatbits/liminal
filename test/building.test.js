import { describe, expect, it } from 'vitest';
import { TILE } from '../src/core/level.js';
import { DOOR, doorInfo } from '../src/core/doors.js';
import { windows } from '../src/core/windows.js';
import { getTheme } from '../src/core/themes.js';
import { EERIE_SOUNDS } from '../src/audio/eerie.js';
import { generateLevel, presetById } from '../src/gen/index.js';
import { labelRegions } from '../src/gen/util.js';

const doorsOf = (level) => {
  const out = [];
  for (let i = 0; i < level.tiles.length; i++) {
    const d = doorInfo(level, i % level.w, (i / level.w) | 0);
    if (d && !d.oneSided) out.push(d);
  }
  return out;
};

describe('skolen', () => {
  it('har korridorer med skap (belegg) og mange klasserom med dører', () => {
    const level = generateLevel({ theme: 'school', w: 52, h: 40, seed: 6 });
    const lockers = level.tiles.filter((t, i) => t === TILE.FLOOR && level.finish[i]).length;
    expect(lockers).toBeGreaterThan(150);
    expect(doorsOf(level).length).toBeGreaterThan(12);
    expect(labelRegions(level).sizes).toHaveLength(1);
    expect(getTheme('school').tiles.wall.tex).toBe('lockers');
  });

  it('gjenstandene står i klasserommene, ikke i korridorene', () => {
    const level = generateLevel({ theme: 'school', w: 52, h: 40, seed: 6 });
    expect(level.objects.length).toBeGreaterThan(3);
    for (const o of level.objects) expect(level.finish[o.z * level.w + o.x]).toBe(0);
  });

  it('eksempelet er i gyllen time, med vinduer', () => {
    const level = presetById('school').make();
    expect(level.sky).toBe('golden');
    expect(windows(level).length).toBeGreaterThan(10);
  });
});

describe('sykehuset', () => {
  it('har pasientrom med for det meste lukkede dører, og noen små bad med fliser', () => {
    const level = generateLevel({ theme: 'ward', w: 48, h: 36, seed: 2 });
    const doors = doorsOf(level);
    expect(doors.length).toBeGreaterThan(15);
    expect(doors.filter((d) => d.state === DOOR.CLOSED).length).toBeGreaterThan(doors.length * 0.3);
    expect(level.finish.some((f) => f)).toBe(true);
    expect(labelRegions(level).sizes).toHaveLength(1);
  });

  it('de nye skumle lydene finnes: skoleklokke og pasientmonitor', () => {
    expect(EERIE_SOUNDS).toContain('bell');
    expect(EERIE_SOUNDS).toContain('monitor');
    expect(getTheme('ward').sound.eerie).toContain('monitor');
  });
});
