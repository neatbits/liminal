import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createLevel, TILE } from '../src/core/level.js';
import { ballLayout, BALL_RADIUS, WAKE_POINTS } from '../src/world/ball-layout.js';
import { createBalls } from '../src/world/balls.js';
import { getTheme } from '../src/core/themes.js';

function fixture() {
  const level = createLevel({ w: 32, h: 24, theme: 'playroom' });
  for (const [x, z] of [[7, 7], [8, 7], [8, 8], [25, 18]]) level.tiles[z * level.w + x] = TILE.WATER;
  return level;
}

describe('instansgrupper for baller', () => {
  it('beholder alle baller, farger og lys, med delt geometri/materiale og utvidede bounds', () => {
    const level = fixture();
    const expected = ballLayout(level);
    const boost = { value: 0.7 }, tint = { value: new THREE.Vector3(1, 1, 1) };
    const balls = createBalls(level, null, { uBoost: boost, uTint: tint }, getTheme('playroom').pitColors);
    try {
      const parts = balls.mesh.children;
      expect(parts).toHaveLength(4);
      expect(parts.reduce((n, part) => n + part.count, 0)).toBe(expected.length);
      expect(balls.vertices).toBe(expected.length * parts[0].geometry.attributes.position.count);
      const positions = [];
      const matrix = new THREE.Matrix4(), position = new THREE.Vector3();
      for (const part of parts) {
        expect(part.geometry).toBe(parts[0].geometry);
        expect(part.material).toBe(parts[0].material);
        expect(part.material.uniforms.uBoost).toBe(boost);
        expect(part.material.uniforms.uTint).toBe(tint);
        expect(part.instanceColor.count).toBe(part.count);
        for (let i = 0; i < part.count; i++) {
          part.getMatrixAt(i, matrix); position.setFromMatrixPosition(matrix);
          positions.push(position.toArray().map((v) => v.toFixed(5)).join(','));
          const maxShift = Math.hypot(WAKE_POINTS * 1.5 * 0.12, WAKE_POINTS * 1.5 * 0.06);
          expect(position.distanceTo(part.boundingSphere.center) + BALL_RADIUS + maxShift).toBeLessThanOrEqual(part.boundingSphere.radius + 0.001);
        }
      }
      expect(positions.sort()).toEqual(expected.map((p) => [p.x, p.y, p.z].map((v) => Math.fround(v).toFixed(5)).join(',')).sort());
      balls.touch(8, 7.5, 1);
      balls.update(0);
      const wake = parts[0].material.uniforms.uWake.value[0];
      expect(wake.toArray()).toEqual([8, 7.5, 1, 0]);
      balls.update(0);
      expect(wake.toArray()).toEqual([8, 7.5, 1, 0]); // pause
      balls.update(1);
      expect(wake.z).toBeLessThan(1);
    } finally { balls.dispose(); }
  });

  it('frigjør hver instansgruppe, men delt geometri og materiale bare én gang', () => {
    const balls = createBalls(fixture(), null, {}, getTheme('playroom').pitColors);
    const parts = balls.mesh.children;
    const geometry = vi.fn(), material = vi.fn();
    parts[0].geometry.addEventListener('dispose', geometry);
    parts[0].material.addEventListener('dispose', material);
    const instances = parts.map((part) => {
      const disposed = vi.fn(); part.addEventListener('dispose', disposed); return disposed;
    });
    balls.dispose();
    expect(geometry).toHaveBeenCalledTimes(1);
    expect(material).toHaveBeenCalledTimes(1);
    for (const disposed of instances) expect(disposed).toHaveBeenCalledTimes(1);
  });
});
