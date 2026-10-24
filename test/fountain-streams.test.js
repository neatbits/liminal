import { describe, expect, it, vi } from 'vitest';
import { fountainJets } from '../src/core/fountain-jets.js';
import { fountainRimAt } from '../src/core/fountains.js';
import { getTile, TILE, WATER_SURFACE } from '../src/core/level.js';
import { presetById } from '../src/gen/index.js';
import { fountainStreams } from '../src/world/fountain-streams.js';
import { createFountainSpray } from '../src/world/fountain-spray.js';

const field = { sample: () => [.7, .7, .7, 0, 0, 0, 0] };

describe('stronger continuous fountain streams', () => {
  it('keeps the whole water volume inside the pool and merges all streams into one draw', () => {
    const l = presetById('mall').make({seed:7,layout:'gallery'}), jets = fountainJets(l), mesh = fountainStreams(jets, field, {});
    const a = mesh.geometry.attributes.position;
    expect(a.count).toBeLessThan(6000);
    expect(mesh.geometry.groups).toHaveLength(0);
    expect(mesh.geometry.attributes.aLight.count).toBe(a.count);
    for (let i = 0; i < a.count; i++) {
      const x = a.getX(i), y = a.getY(i), z = a.getZ(i);
      expect(getTile(l, Math.floor(x), Math.floor(z))).toBe(TILE.WATER);
      expect(fountainRimAt(l, x, z)).toBeNull();
      expect(y).toBeGreaterThan(WATER_SURFACE - .02);
      expect(y).toBeLessThan(WATER_SURFACE + 2);
    }
    mesh.geometry.dispose(); mesh.material.dispose();
  });

  it('shares pausable time and releases the new geometry/material on rebuild', () => {
    const l = presetById('mall').make({seed:7,layout:'gallery'}), shared = { uTime: { value: 3 } };
    const spray = createFountainSpray(l, field, shared), mesh = spray.group.getObjectByName('fountainStreams');
    expect(mesh.material.uniforms.uTime).toBe(shared.uTime);
    const geometry = vi.fn(), material = vi.fn();
    mesh.geometry.addEventListener('dispose', geometry); mesh.material.addEventListener('dispose', material);
    spray.dispose(); expect(geometry).toHaveBeenCalledOnce(); expect(material).toHaveBeenCalledOnce();
    expect(createFountainSpray({ ...l, theme: 'pool' }, field, shared).group.children).toHaveLength(0);
  });
});
