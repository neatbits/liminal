import { describe, expect, it } from 'vitest';
import { TILE } from '../src/core/level.js';
import { deckAt, stairSpan } from '../src/core/heights.js';
import { railSides } from '../src/core/railings.js';
import { generateLevel, presetById } from '../src/gen/index.js';
import { mallLayout, MALL_DECK } from '../src/gen/mall.js';
import { getTheme } from '../src/core/themes.js';

describe('kjøpesenteret', () => {
  it('har galleri i andre etasje rundt et åpent atrium, og en bro over det', () => {
    const level = presetById('mall').make();
    const { atrium } = mallLayout(level.w, level.h);
    expect(level.theme).toBe('mall');
    expect(deckAt(level, atrium.x0 + 2, atrium.z0 - 1)).toBe(MALL_DECK); // galleriet
    expect(deckAt(level, atrium.x0 + 2, atrium.z0 + 1)).toBe(0); // atriet
    const mid = Math.floor((atrium.x0 + atrium.x1) / 2);
    expect(deckAt(level, mid, atrium.z0 + 3)).toBe(MALL_DECK); // broen
    // Galleriet er høyt nok til å gå under og over.
    expect(level.height - MALL_DECK).toBeGreaterThanOrEqual(2.1);
  });

  it('trappene går fra atriegulvet helt opp til dekket', () => {
    for (let seed = 1; seed <= 6; seed++) {
      const level = generateLevel({ theme: 'mall', w: 56, h: 40, seed });
      let tops = 0;
      for (let i = 0; i < level.tiles.length; i++) {
        if (level.tiles[i] !== TILE.STAIRS) continue;
        const x = i % level.w;
        const z = (i / level.w) | 0;
        const { top, dir } = stairSpan(level, x, z);
        if (level.tiles[(z + dir[1]) * level.w + x + dir[0]] === TILE.STAIRS) continue;
        expect(top).toBeCloseTo(MALL_DECK);
        expect(deckAt(level, x + dir[0], z + dir[1])).toBe(MALL_DECK);
        tops++;
      }
      expect(tops).toBe(4); // to trapper, to ruter brede
    }
  });

  it('galleriets kant mot atriet har vern', () => {
    const level = presetById('mall').make();
    const { atrium } = mallLayout(level.w, level.h);
    const guard = railSides(level, atrium.x0 + 2, atrium.z0 - 1);
    expect(guard).toEqual([{ dx: 0, dz: 1, kind: 'guard', y: MALL_DECK }]);
  });

  it('små rom blir en vanlig hall uten dekke, og temaet har egne lyder', () => {
    const level = generateLevel({ theme: 'mall', w: 12, h: 12, seed: 1 });
    expect(level.decks.some((d) => d)).toBe(false);
    expect(getTheme('mall').sound.eerie).toContain('muzak');
  });
});

describe('kjøpesenteret – gange', () => {
  const input = (forward) => ({ forward, strafe: 0, running: false, consumeLook: () => [0, 0] });

  it('man går opp trappen og blir stående på galleriet, og faller ikke gjennom', async () => {
    const { Walker } = await import('../src/view3d/walker.js');
    const level = presetById('mall').make();
    const { atrium } = mallLayout(level.w, level.h);
    const sz = atrium.z0 + Math.floor((atrium.z1 - atrium.z0 + 1) / 2) - 1;
    const w = new Walker();
    // Ved foten av den vestre trappen, med ansiktet mot vest (opp trappen).
    w.reset(level, { x: atrium.x0 + 9.5, z: sz + 1, a: Math.PI / 2 });
    const theme = getTheme('mall');
    for (let t = 0; t < 12; t += 1 / 30) w.update(1 / 30, input(1), level, theme);
    expect(w.x).toBeLessThan(atrium.x0);
    expect(w.floorY).toBeCloseTo(MALL_DECK, 1);
    // Videre nordover langs galleriet: fortsatt i andre etasje.
    w.yaw = 0;
    for (let t = 0; t < 4; t += 1 / 30) w.update(1 / 30, input(1), level, theme);
    expect(w.floorY).toBeCloseTo(MALL_DECK, 1);
  });

  it('vernet holder en inne på galleriet; under galleriet går man rett ut i atriet', async () => {
    const { Walker } = await import('../src/view3d/walker.js');
    const level = presetById('mall').make();
    const { atrium } = mallLayout(level.w, level.h);
    const theme = getTheme('mall');
    const w = new Walker();
    w.reset(level, { x: atrium.x0 + 4.5, z: atrium.z0 - 2.5, a: Math.PI }); // mot sør, mot atriet
    w.floorY = MALL_DECK;
    for (let t = 0; t < 4; t += 1 / 30) w.update(1 / 30, input(1), level, theme);
    expect(w.z).toBeLessThan(atrium.z0);
    expect(w.floorY).toBeCloseTo(MALL_DECK, 1);
    const below = new Walker();
    below.reset(level, { x: atrium.x0 + 4.5, z: atrium.z0 - 2.5, a: Math.PI });
    for (let t = 0; t < 4; t += 1 / 30) below.update(1 / 30, input(1), level, theme);
    expect(below.z).toBeGreaterThan(atrium.z0 + 1);
    expect(below.floorY).toBeCloseTo(0, 2);
  });
});

describe('kjøpesenteret – butikkene', () => {
  it('butikkene er store, har teppe og ryddig innredning – og ingen kiosker inne i dem', async () => {
    const { objectPose, objectBox } = await import('../src/core/objects.js');
    const level = presetById('mall').make();
    const carpet = level.tiles.filter((t, i) => t === TILE.FLOOR && level.finish[i]).length;
    expect(carpet).toBeGreaterThan(400);
    const ids = level.objects.map((o) => o.id);
    expect(ids).toContain('counter');
    expect(ids.filter((id) => id === 'shelf' || id === 'wallshelf').length).toBeGreaterThan(4);
    for (const o of level.objects) {
      if (!['kiosk', 'cafe', 'boombox'].includes(o.id)) continue;
      expect(level.finish[o.z * level.w + o.x], o.id).toBe(0);
    }
    // Ingen to gjenstander står i hverandre (oppå hverandre er greit: kasseapparatet på skranken).
    const poses = level.objects.map((o) => objectPose(level, o));
    const boxes = poses.map(objectBox);
    for (let a = 0; a < boxes.length; a++) {
      for (let b = a + 1; b < boxes.length; b++) {
        const [p, q] = [boxes[a], boxes[b]];
        const overlap = p[0] < q[2] - 0.02 && q[0] < p[2] - 0.02 && p[1] < q[3] - 0.02 && q[1] < p[3] - 0.02;
        const stacked = poses[a].y >= poses[b].y + poses[b].h - 0.01 || poses[b].y >= poses[a].y + poses[a].h - 0.01;
        expect(overlap && !stacked).toBe(false);
      }
    }
  });
});
