import { describe, expect, it } from 'vitest';
import { createLevel, setTile, TILE } from '../src/core/level.js';
import { getTheme } from '../src/core/themes.js';
import { waveStrength } from '../src/core/water.js';
import { buildWaterData } from '../src/world/water/geometry.js';
import { createWater } from '../src/world/water/water.js';

describe('bølgestyrke', () => {
  it.each([[undefined, 1], [null, 1], [NaN, 1], [Infinity, 1], ['1.5', 1], [-1, 0], [3, 2], [0, 0], [1.5, 1.5]])(
    'validerer %s til %s', (value, expected) => expect(waveStrength(value)).toBe(expected),
  );

  it.each(['pool', 'office', 'mall'])('%s beholder temaets standard og endrer bølger uten ny geometri/shader', (theme) => {
    const level = createLevel({ theme, w: 8, h: 8 });
    setTile(level, 3, 3, TILE.WATER);
    const water = createWater(buildWaterData(level), getTheme(theme), {}, { waves: 0 });
    try {
      const { material, geometry } = water.mesh;
      const version = material.version;
      expect(material.uniforms.uWave.value).toBe(getTheme(theme).water.wave);
      expect(material.uniforms.uWaveStrength.value).toBe(0);
      water.setWaves(1.5);
      expect(material.uniforms.uWaveStrength.value).toBe(1.5);
      water.setDetail(true);
      water.setQuality(false);
      expect(material.uniforms.uWaveStrength.value).toBe(1.5);
      water.setWaves(1);
      expect(material.uniforms.uWave.value).toBe(getTheme(theme).water.wave);
      expect(water.mesh.geometry).toBe(geometry);
      // Bare kvalitetsendringene ovenfor har bedt om rekompilering.
      expect(material.version).toBe(version + 2);
    } finally {
      water.dispose();
    }
  });
});
