import { describe, it, expect } from 'vitest';
import { BufferGeometry, Float32BufferAttribute, Matrix4 } from 'three';
import { bakeLight } from '../src/world/object-light.js';

describe('bakt lys på tosidige modeller', () => {
  it('bevarer separate sider, blinkekanaler og roterte normaler uten å endre kilden', () => {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute([0, 0, 0], 3));
    g.setAttribute('normal', new Float32BufferAttribute([0, 1, 0], 3));
    const field = { sample: (_x, _y, _z, _nx, ny) => ny > 0 ? [1, 0.9, 0.8, 1, 0, 0, 0] : [0.1, 0.2, 0.3, 0, 1, 0, 0] };
    const matrix = new Matrix4().makeRotationX(Math.PI);
    const baked = bakeLight(g, matrix, field, true);
    expect(Array.from(baked.attributes.aLight.array)).toEqual([expect.closeTo(0.1), expect.closeTo(0.2), expect.closeTo(0.3)]);
    expect(Array.from(baked.attributes.aBackLight.array)).toEqual([1, expect.closeTo(0.9), expect.closeTo(0.8)]);
    expect(Array.from(baked.attributes.aFlick.array)).toEqual([0, 1, 0, 0]);
    expect(Array.from(baked.attributes.aBackFlick.array)).toEqual([1, 0, 0, 0]);
    expect(Array.from(g.attributes.normal.array)).toEqual([0, 1, 0]);
    const single = bakeLight(g, matrix, field);
    expect(single.attributes.aBackLight).toBeUndefined();
    single.dispose(); baked.dispose(); g.dispose();
  });
});
