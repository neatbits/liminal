import { describe, expect, it } from 'vitest';
import { createLevel, TILE, setTile, cloneLevel } from '../src/core/level.js';
import { groundAt, STAIR_DIRS } from '../src/core/heights.js';
import { placeStairs } from '../src/core/stairs.js';
import { ESCALATOR_SPEED, escalatorRuns, escalatorVelocity, isEscalator, placeEscalator } from '../src/core/escalators.js';
import { levelToJSON, levelFromJSON, encodeLevel, decodeLevel } from '../src/core/serialize.js';
import { presetById, generateLevel } from '../src/gen/index.js';
import { Walker } from '../src/view3d/walker.js';
import { getTheme } from '../src/core/themes.js';
import { buildEscalators, escalatorSteps } from '../src/world/escalators.js';
import { buildSurfaces } from '../src/world/surfaces.js';

const idle = { forward: 0, strafe: 0, running: false, consumeLook: () => [0, 0] };

describe('rulletrapper', () => {
  it('Mall får to brede løp, ett opp og ett ned, uten å endre andre temaer', () => {
    for (let seed = 1; seed <= 6; seed++) {
      const level = generateLevel({ theme: 'mall', w: 56, h: 40, seed });
      const runs = escalatorRuns(level);
      expect(runs).toHaveLength(2);
      expect(runs.map((r) => r.down).sort()).toEqual([false, true]);
      for (const r of runs) {
        expect(r.width).toBe(2);
        expect(r.low).toBe(0);
        expect(r.rise).toBe(4.4);
      }
    }
    expect(escalatorRuns(generateLevel({ theme: 'mall', w: 12, h: 12, seed: 1 }))).toEqual([]);
    expect(escalatorRuns(presetById('pools').make())).toEqual([]);
  });

  it.each(STAIR_DIRS)('motor og geometri følger oppoverretningen %s, %s', (dx, dz) => {
    const level = createLevel({ w: 18, h: 18 });
    level.tiles.fill(TILE.FLOOR);
    const a = [8, 8], b = [8 + dx * 4, 8 + dz * 4];
    placeEscalator(level, a, b, 2);
    const runs = escalatorRuns(level);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ dir: [dx, dz], length: 5, width: 2 });
    const x = 8.5, z = 8.5, y = groundAt(level, x, z);
    const [vx, vz] = escalatorVelocity(level, x, z, y);
    expect(vx).toBeCloseTo(dx * ESCALATOR_SPEED);
    expect(vz).toBeCloseTo(dz * ESCALATOR_SPEED);
    placeEscalator(level, a, b, 2, true);
    const down = escalatorVelocity(level, x, z, y);
    expect(down[0]).toBeCloseTo(-dx * ESCALATOR_SPEED);
    expect(down[1]).toBeCloseTo(-dz * ESCALATOR_SPEED);
    const steps = escalatorSteps(runs[0]);
    expect(steps.travel.length).toBe(steps.vertexCount * 3);
    expect(steps.pos.every(Number.isFinite)).toBe(true);
  });

  it('klassiske trapper, luft, andre høyder og endret rutetype gir ingen motorfart', () => {
    const level = createLevel({ w: 18, h: 12 });
    level.tiles.fill(TILE.FLOOR);
    placeStairs(level, [3, 4], [9, 4]);
    expect(escalatorRuns(level)).toEqual([]);
    expect(escalatorVelocity(level, 3.5, 4.5, 0.3)).toEqual([0, 0]);
    placeEscalator(level, [3, 4], [9, 4]);
    expect(escalatorVelocity(level, 3.5, 4.5, 0.3, 1)).toEqual([0, 0]);
    expect(escalatorVelocity(level, 3.5, 4.5, 3)).toEqual([0, 0]);
    setTile(level, 3, 4, TILE.FLOOR);
    expect(isEscalator(level, 3, 4)).toBe(false);
    expect(level.meta[4 * level.w + 3]).toBe(0);
  });

  it('beholder motorretning og ganghøyder ved kopiering, JSON og delingslenke', async () => {
    const level = presetById('mall').make({seed:7,layout:'gallery'});
    for (const back of [cloneLevel(level), levelFromJSON(levelToJSON(level)), await decodeLevel(await encodeLevel(level))]) {
      expect(back.meta).toEqual(level.meta);
      expect(escalatorRuns(back)).toEqual(escalatorRuns(level));
    }
  });

  it.each([false, true])('frakter en stillestående spiller helt til reposet (ned=%s), uten fottrinn', (down) => {
    const level = presetById('mall').make({seed:7,layout:'gallery'});
    const r = escalatorRuns(level).find((run) => run.down === down);
    const t = down ? r.length - 0.15 : 0.15;
    const w = new Walker();
    w.reset(level, { x: r.origin[0] + r.dir[0] * t, z: r.origin[1] + r.width / 2, a: 0 });
    const expected = down ? r.low : r.low + r.rise;
    for (let k = 0; k < 1600; k++) expect(w.update(1 / 60, idle, level, getTheme('mall'))).toBeNull();
    expect(w.floorY).toBeCloseTo(expected, 2);
    const endX = w.x;
    for (let k = 0; k < 60; k++) w.update(1 / 60, idle, level, getTheme('mall'));
    expect(w.x).toBe(endX); // ingen motor på reposet
    expect(w.distance).toBe(0);
    expect(w.stepPhase).toBe(0);
  });

  it('dt=0 fryser transport, mens spilleren fortsatt kan gå mot kjøreretningen', () => {
    const level = presetById('mall').make({seed:7,layout:'gallery'});
    const r = escalatorRuns(level).find((run) => !run.down);
    const w = new Walker();
    w.reset(level, { x: r.origin[0] - 3.5, z: r.origin[1] + 1, a: -Math.PI / 2 });
    const x = w.x;
    w.update(0, idle, level, getTheme('mall'));
    expect(w.x).toBe(x);
    for (let k = 0; k < 60; k++) w.update(1 / 60, { ...idle, forward: 1 }, level, getTheme('mall'));
    expect(w.x).toBeGreaterThan(x + 0.6);
  });

  it('bygger paneler, håndløpere og gulv under løpet, og erstatter flistrinnene', () => {
    const level = presetById('mall').make({seed:7,layout:'gallery'});
    const meshes = buildEscalators(level);
    const runs = escalatorRuns(level);
    expect(meshes.escalatorFloor.quadCount).toBe(runs.reduce((sum, r) => sum + r.length * r.width, 0));
    for (let i = 1; i < meshes.escalatorFloor.pos.length; i += 3) expect(meshes.escalatorFloor.pos[i]).toBe(0);
    for (const data of Object.values(meshes)) {
      expect(data.vertexCount).toBeGreaterThan(0);
      expect(data.pos.every(Number.isFinite)).toBe(true);
    }
    const escalatorFloor = buildSurfaces(level).floor.vertexCount;
    for (let i = 0; i < level.meta.length; i++) if (level.tiles[i] === TILE.STAIRS) level.meta[i] &= 3;
    expect(buildSurfaces(level).floor.vertexCount).toBeGreaterThan(escalatorFloor);
    expect(Object.values(buildEscalators(level)).every((m) => m.vertexCount === 0)).toBe(true);
  });
});
