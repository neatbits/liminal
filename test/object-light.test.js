import { describe, it, expect } from 'vitest';
import { BufferGeometry, Float32BufferAttribute, Matrix4 } from 'three';
import { bakeLight } from '../src/world/object-light.js';
import { createLevel, setLight, TILE, LIGHT } from '../src/core/level.js';
import { fillTiles, rectIndices } from '../src/core/ops.js';
import { getTheme } from '../src/core/themes.js';
import { createLightField } from '../src/world/lighting.js';

describe('lysprøver for gjenstander', () => {
  function room() {
    const level = createLevel({ w: 16, h: 8 });
    fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 14, z1: 6 }), TILE.FLOOR);
    fillTiles(level, rectIndices(level, { x0: 8, z0: 0, x1: 8, z1: 3 }), TILE.WALL);
    for (const [x, z] of [[3, 3], [11, 3], [6, 5]]) setLight(level, x, z, x === 6 ? LIGHT.FLICKER : LIGHT.ON);
    return createLightField(level, getTheme(level.theme));
  }
  const points = [[4.3, 0.8, 2.6, 0, 1, 0], [7.4, 1.2, 4.1, 0.75, 0.25, -0.5], [9.6, 0.4, 5.2, -1, 0, 0], [5.1, 1.9, 3.3, 0, -1, 0]];

  it('ligger tett på flateprøvene (startpunktet flyttes høyst 2 cm), også baksiden', () => {
    const field = room(), surfaces = room();
    for (const at of points) {
      const [front, back] = field.objectSample(...at, true);
      const flip = [at[0], at[1], at[2], -at[3], -at[4], -at[5]];
      front.forEach((v, k) => expect(v).toBeCloseTo(surfaces.sample(...at)[k], 2));
      back.forEach((v, k) => expect(v).toBeCloseTo(surfaces.sample(...flip)[k], 2));
    }
  });

  it('en flate på en halvvegg skygger ikke for seg selv, men stenger lys bak veggen', () => {
    const field = (lightZ) => {
      const level = createLevel({ w: 16, h: 9 });
      fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 14, z1: 7 }), TILE.FLOOR);
      level.objects = [{ id: 'halfwall', x: 6, z: 4, rot: 0 }];
      if (lightZ !== null) setLight(level, 6, lightZ, LIGHT.ON);
      return createLightField(level, getTheme(level.theme));
    };
    // Forsiden (z ≈ 4.61) avrundes til 4.60, inne i halvveggens skyggeboks (z 4.36–4.64).
    const at = [6.5, 0.6, 4.6, 0, 0, 1];
    const dark = field(null).objectSample(...at);
    expect(field(6).objectSample(...at)[0]).toBeGreaterThan(dark[0] + 0.05); // lys foran
    const behind = [6.5, 0.6, 4.6, 0, 0.5, 0.75]; // skrått oppover, mot et lys bak og over veggen
    expect(field(2).objectSample(...behind)).toEqual(field(null).objectSample(...behind));
  });

  it('gir samme svar uansett rekkefølge, med og uten bakside, og bufrer dem', () => {
    const a = room(), b = room();
    for (const at of points) {
      const single = a.objectSample(...at);
      const [front, back] = b.objectSample(...at, true);
      expect(front).toEqual(single);
      expect(a.objectSample(...at, true)[1]).toEqual(back);
      expect(a.objectSample(...at)).toBe(single);
    }
    // Samme punkt med en annen normal gjenbruker siktlinjene, men gir eget lys.
    expect(a.objectSample(4.3, 0.8, 2.6, 1, 0, 0)).not.toEqual(a.objectSample(4.3, 0.8, 2.6, 0, 1, 0));
  });
});

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
