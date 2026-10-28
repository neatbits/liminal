import { describe, expect, it } from 'vitest';
import { createLevel, TILE } from '../src/core/level.js';
import { fillRect } from '../src/gen/util.js';
import { mulberry32 } from '../src/core/rng.js';
import { MonsterAI } from '../src/world/monster-ai.js';
import { Tapes } from '../src/view3d/tapes.js';
import { Scary } from '../src/view3d/scary.js';

const field = { sample: () => [1, 1, 1] };
function hall(w = 30, h = 20) {
  const level = createLevel({ theme: 'office', w, h, height: 3 });
  fillRect(level, 1, 1, w - 2, h - 2, TILE.FLOOR);
  return level;
}

describe('kassetter i flere etasjer', () => {
  it('ligger i etasjehøyden, og kan bare plukkes i sin etasje', () => {
    const tapes = new Tapes();
    const n = tapes.placeFloors([
      { level: hall(), field, spawn: { x: 2.5, z: 2.5 }, base: 0 },
      { level: hall(), field, spawn: { x: 2.5, z: 2.5 }, base: 3.3, count: 1 },
      { level: hall(), field, spawn: null, base: 6.6, count: 0 },
    ], mulberry32(3));
    expect(n).toBeGreaterThan(1);
    const upper = tapes.items.filter((t) => t.storey === 1);
    expect(upper).toHaveLength(1);
    expect(tapes.items.some((t) => t.storey === 2)).toBe(false);
    const [t] = upper;
    expect(t.mesh.position.y).toBeCloseTo(3.3 + t.y + 0.0125);
    expect(tapes.pickUp(t.x, t.y, t.z, 0)).toBe(0); // samme punkt, feil etasje
    expect(tapes.pickUp(t.x, t.y, t.z, 1)).toBe(1);
  });
});

describe('monsteret og trappene', () => {
  const scary = (current, ai) => ({ v: { storeys: { current }, walk: { level: hall() } }, ai, floor: 0 });

  it('kommer etter opp trappen når det jaktet, men ikke ellers', () => {
    const hunting = new MonsterAI(hall());
    hunting.state = 'hunt';
    const up = scary(1, hunting);
    Scary.prototype._newFloor.call(up, { x: 7.6, z: 4.5 });
    expect(up.follow).toEqual({ t: 2.5, x: 7.6, z: 4.5 });
    expect(up.ai).not.toBe(hunting);
    expect(up.floor).toBe(1);

    const calm = new MonsterAI(hall());
    const quiet = scary(1, calm);
    Scary.prototype._newFloor.call(quiet, { x: 7.6, z: 4.5 });
    expect(quiet.follow).toBeNull();

    // Ombygging i samme etasje (hendelser bak ryggen): det teleporterer ikke etter en.
    const rebuilt = scary(0, hunting);
    Scary.prototype._newFloor.call(rebuilt, { x: 7.6, z: 4.5 });
    expect(rebuilt.follow).toBeNull();
  });
});
