import { describe, it, expect } from 'vitest';
import { TILE } from '../src/core/level.js';
import { THEME_IDS, getTheme } from '../src/core/themes.js';
import { generateLevel } from '../src/gen/index.js';
import { LAYOUTS } from '../src/gen/layouts.js';
import { reachableCells } from '../src/gen/tapes.js';
import { ceilingAt } from '../src/core/heights.js';
import { objectFits, OBJECTS } from '../src/core/objects.js';
import { pillarContains } from '../src/core/pillars.js';
import { windowViewFor } from '../src/core/window-views.js';
import { OBJECT_GROUPS } from '../src/ui/object-info.js';
import { SIGN_TEXTURES } from '../src/world/wayfinding.js';
import { AIRPORT_OBJECTS } from '../src/core/object-catalog-airport.js';

const make = (layout, seed = 7, w = 56, h = 40) => {
  const rooms = [];
  const level = generateLevel({ theme: 'airport', w, h, seed, layout, onPlan: (p) => rooms.push(...p) });
  return { level, rooms };
};
const count = (l, id) => l.objects.filter((o) => o.id === id).length;
const windowCount = (l) => [...l.tiles.keys()].filter((i) => l.tiles[i] === TILE.WALL && l.meta[i] & 1).length;

describe('flyplassterminalen', () => {
  it('er et vanlig tema med eget utseende, skilt og utsikt', () => {
    expect(THEME_IDS).toContain('airport');
    const t = getTheme('airport');
    expect(t.label).toBe('The Terminal');
    expect(t.sound.eerie).toContain('chime');
    expect(SIGN_TEXTURES.airport).toBe('airportSigns');
    expect(windowViewFor('airport')).not.toBeNull();
  });

  it.each(Object.keys(LAYOUTS.airport))('%s: alt kan nås, og alt får plass', (layout) => {
    for (const [seed, w, h] of [[1, 56, 40], [7, 40, 56], [23, 64, 44]]) {
      const { level: l } = make(layout, seed, w, h);
      expect(l.layout).toBe(layout);
      const reach = reachableCells(l, l.spawn.x, l.spawn.z);
      const lost = [...l.tiles.keys()].filter((i) => l.tiles[i] === TILE.FLOOR && !reach[i] && !pillarContains(l, (i % l.w) + 0.5, Math.floor(i / l.w) + 0.5, 0.3));
      // Møbler (seterader, kø-sperrer) kan stenge en og annen krok.
      expect(lost.length / l.tiles.filter((t) => t === TILE.FLOOR).length, `seed ${seed} ${w}×${h}`).toBeLessThan(0.03);
      for (const o of l.objects) expect(objectFits(l, o), `${o.id} ${o.x},${o.z}`).toBe(true);
    }
  });

  it('gangen: høyt tak, gater med seter mot vinduene, avgangstavler, og ellers kafé, taxfree og toaletter', () => {
    const { level: l, rooms } = make('concourse', 5);
    const walk = rooms.find((r) => r.kind === 'concourse');
    expect(ceilingAt(l, walk.x0 + 2, walk.z0 + 2)).toBeGreaterThanOrEqual(4.8);
    expect(rooms.filter((r) => r.kind === 'gate').length).toBeGreaterThan(2);
    expect(count(l, 'waitingchairs')).toBeGreaterThan(20);
    expect(count(l, 'fids')).toBeGreaterThan(3);
    expect(windowCount(l)).toBeGreaterThan(30);
  });

  it('innsjekking: skranker med kø-sperrer foran; bagasjehallen: bånd og traller', () => {
    const { level: a } = make('checkin', 2);
    expect(count(a, 'checkin')).toBeGreaterThan(4);
    expect(count(a, 'stanchion')).toBeGreaterThan(20);
    const { level: b } = make('baggage', 3);
    expect(count(b, 'carousel')).toBeGreaterThan(1);
    expect(count(b, 'luggagecart')).toBeGreaterThan(1);
  });

  it('oftest natt ute, og planløsningene veksler', () => {
    const skies = {};
    const seen = new Set();
    for (let seed = 1; seed <= 30; seed++) {
      const l = generateLevel({ theme: 'airport', w: 56, h: 40, seed });
      skies[l.sky] = (skies[l.sky] ?? 0) + 1;
      for (const part of (l.layout ?? '').split('+')) seen.add(part);
    }
    expect(skies.night).toBeGreaterThan(10);
    for (const id of Object.keys(LAYOUTS.airport)) expect(seen.has(id), id).toBe(true);
  }, 60000);

  it('gjenstandene står i katalogen og i objektvelgeren', () => {
    for (const id of Object.keys(AIRPORT_OBJECTS)) {
      expect(OBJECTS[id].build).toBe(id);
      expect(OBJECT_GROUPS.some(([, list]) => list.includes(id)), id).toBe(true);
    }
  });
});
