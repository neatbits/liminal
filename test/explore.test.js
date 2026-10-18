import { describe, expect, it } from 'vitest';
import { createLevel, TILE } from '../src/core/level.js';
import { fillTiles, rectIndices } from '../src/core/ops.js';
import { DOOR, doorInfo, doorInReach } from '../src/core/doors.js';
import { mulberry32 } from '../src/core/rng.js';
import { glowSources } from '../src/core/objects.js';
import { collectLights } from '../src/world/lighting.js';
import { addExits, exitCandidate } from '../src/gen/exits.js';
import { nextLevel, nextTheme } from '../src/gen/endless.js';
import { placeTapes, tapeCount } from '../src/gen/tapes.js';
import { Blackout, DARK } from '../src/view3d/events.js';

// Rom 20 × 14 med gulv i x 1–18, z 1–12.
function room() {
  const level = createLevel({ w: 20, h: 14 });
  fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 18, z1: 12 }), TILE.FLOOR);
  return level;
}

describe('utganger', () => {
  it('ytterveggen kan få utganger, men ikke hjørner eller vegg med gulv på to sider', () => {
    const level = room();
    expect(exitCandidate(level, 0, 5)).toBe(true);
    expect(exitCandidate(level, 0, 0)).toBe(false); // hjørne
    level.tiles[5 * 20 + 9] = TILE.WALL; // frittstående vegg: gulv rundt
    expect(exitCandidate(level, 9, 5)).toBe(false);
  });

  it('utgangene er lukkede dører til ingensteds, spredt og unna startpunktet', () => {
    const level = room();
    const spawn = { x: 1.5, z: 6.5 };
    const placed = addExits(level, mulberry32(4), 3, spawn);
    expect(placed.length).toBeGreaterThan(1);
    for (const [x, z] of placed) {
      const d = doorInfo(level, x, z);
      expect(d.oneSided).toBe(true);
      expect(d.state).toBe(DOOR.CLOSED);
      expect(Math.hypot(x + 0.5 - spawn.x, z + 0.5 - spawn.z)).toBeGreaterThanOrEqual(6);
    }
  });

  it('en dør til ingensteds kan nås i gåmodus (exits), men ikke åpnes som vanlig dør', () => {
    const level = room();
    level.tiles[6 * 20] = TILE.DOOR;
    level.meta[6 * 20] = DOOR.CLOSED;
    const yaw = Math.PI / 2; // mot −x
    expect(doorInReach(level, 1.2, 6.5, yaw)).toBeNull();
    expect(doorInReach(level, 1.2, 6.5, yaw, 1.8, { exits: true })?.info.oneSided).toBe(true);
  });
});

describe('uendelige nivåer', () => {
  it('neste nivå har et annet tema, et nummer og utganger videre', () => {
    const rand = mulberry32(9);
    let theme = 'backrooms';
    for (let depth = 1; depth <= 5; depth++) {
      const { level, label } = nextLevel(depth, theme, rand);
      expect(level.theme).not.toBe(theme);
      expect(level.name).toBe(`Level ${depth}`);
      expect(label.length).toBeGreaterThan(3);
      const exits = level.tiles.reduce((n, t, i) => n + (doorInfo(level, i % level.w, (i / level.w) | 0)?.oneSided ? 1 : 0), 0);
      expect(exits).toBeGreaterThan(0);
      theme = level.theme;
    }
    expect(nextTheme('pool', () => 0)).not.toBe('pool');
  });
});

describe('VHS-kassetter', () => {
  it('ligger på gulvet, spredt og et stykke unna startpunktet', () => {
    const level = room();
    const spawn = { x: 2.5, z: 2.5 };
    const tapes = placeTapes(level, spawn, mulberry32(2), 3);
    expect(tapes.length).toBeGreaterThan(0);
    for (const t of tapes) {
      expect(level.tiles[Math.floor(t.z) * level.w + Math.floor(t.x)]).toBe(TILE.FLOOR);
      expect(Math.hypot(t.x - spawn.x, t.z - spawn.z)).toBeGreaterThan(7);
      expect(t.y).toBe(0);
    }
  });

  it('antallet følger størrelsen på rommet', () => {
    expect(tapeCount(room())).toBe(1);
    expect(tapeCount(createLevel({ w: 8, h: 8 }))).toBe(0);
  });
});

describe('strømbrudd', () => {
  it('flimrer, blir mørkt, kommer tilbake – og venter så til neste gang', () => {
    const b = new Blackout(mulberry32(1), { first: [5, 5], every: [100, 100] });
    const events = [];
    let darkest = 1;
    for (let t = 0; t < 30; t += 0.05) {
      const e = b.update(0.05);
      if (e) events.push(e);
      darkest = Math.min(darkest, b.power);
    }
    expect(events).toEqual(['flicker', 'down', 'up', 'done']);
    expect(darkest).toBe(DARK);
    expect(b.power).toBe(1);
  });
});

describe('TV-er som lyser', () => {
  it('en TV gir en svak lyskilde foran skjermen, uten armatur', () => {
    const level = room();
    level.objects = [{ id: 'tv', x: 5, z: 1, rot: 0 }]; // ved nordveggen, skjermen mot sør
    const [g] = glowSources(level);
    expect(g.z).toBeGreaterThan(1.3);
    expect(g.power).toBeLessThan(0.5);
    const lights = collectLights(level);
    expect(lights.filter((l) => l.object)).toHaveLength(1);
  });
});
