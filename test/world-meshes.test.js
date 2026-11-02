import { describe, expect, it } from 'vitest';
import { THEME_IDS } from '../src/core/themes.js';
import { generateLevel } from '../src/gen/index.js';
import { makeZone } from '../src/gen/zones.js';
import { buildWorldMeshes, packMeshes, presplit } from '../src/world/world-meshes.js';
import { inBudget } from '../src/world/frame-budget.js';
import { textureKeys } from '../src/world/texture-warm.js';
import { textureKeys as allTextures } from '../src/textures/index.js';

const count = (meshes) => Object.values(meshes).reduce((n, m) => n + (m?.vertexCount ?? 0), 0);

describe('flatene til et område, laget i en bakgrunnstråd (Noclip)', () => {
  it('pakkes som typede arrayer uten å miste noe, og bufferne flyttes', () => {
    const { level } = makeZone({ index: 1, seed: 5, prevTheme: 'backrooms', mood: 'liminal' });
    const made = buildWorldMeshes(level);
    const transfer = [];
    const packed = packMeshes(presplit(made), transfer);
    expect(transfer.length).toBeGreaterThan(10);
    for (const [key, m] of Object.entries(made.meshes)) {
      if (!m?.vertexCount) continue;
      const p = packed.meshes[key];
      expect(p.vertexCount, key).toBe(m.vertexCount);
      const chunks = p.chunks ?? [p];
      expect(chunks.reduce((n, c) => n + c.vertexCount, 0), key).toBe(m.vertexCount);
      for (const c of chunks) {
        expect(c.pos).toBeInstanceOf(Float32Array);
        expect(c.index).toBeInstanceOf(Uint32Array);
        expect(c.pos.length).toBe(c.vertexCount * 3);
        expect(Math.max(...c.index)).toBeLessThan(c.vertexCount);
      }
    }
    expect(count(packed.meshes)).toBe(count(made.meshes));
    expect(JSON.stringify(packed)).not.toContain('"field"');
  }, 60000);

  it('vannet følger med, og ballbinger har ikke noe vann', () => {
    const pool = generateLevel({ theme: 'pool', w: 32, h: 28, seed: 3 });
    expect(buildWorldMeshes(pool).waterData.vertexCount).toBeGreaterThan(0);
    expect(buildWorldMeshes(generateLevel({ theme: 'playroom', w: 32, h: 28, seed: 3 })).waterData).toBeNull();
  }, 60000);
});

describe('arbeid i små biter', () => {
  it('tidsbudsjettet kjører jobbene ferdig, i rekkefølge', async () => {
    const log = [];
    const job = (name, steps) => { let n = 0; return inBudget(() => { log.push(name); return ++n >= steps; }); };
    await Promise.all([job('a', 3), job('b', 2)]);
    expect(log.filter((x) => x === 'a')).toHaveLength(3);
    expect(log.filter((x) => x === 'b')).toHaveLength(2);
    expect(log.indexOf('b')).toBeGreaterThan(log.lastIndexOf('a'));
  });

  it('teksturene som males på forhånd, finnes for alle temaer', () => {
    const known = new Set(allTextures());
    for (const theme of THEME_IDS) {
      const keys = textureKeys(generateLevel({ theme, w: 24, h: 20, seed: 1, vary: false }));
      expect(keys.length, theme).toBeGreaterThan(3);
      for (const k of keys) expect(known.has(k), `${theme}: ${k}`).toBe(true);
    }
  }, 60000);
});
