import { describe, expect, it } from 'vitest';
import { createLevel, TILE, LIGHT } from '../src/core/level.js';
import { fillTiles, rectIndices } from '../src/core/ops.js';
import { collectLights } from '../src/world/lighting.js';
import { lampData, LAMP_STEP } from '../src/world/lamp-map.js';

function room() {
  const level = createLevel({ w: 8, h: 6, height: 3.4 });
  fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 6, z1: 4 }), TILE.FLOOR);
  level.lights[2 * 8 + 2] = LIGHT.ON;
  level.lights[2 * 8 + 4] = LIGHT.FLICKER;
  level.lights[3 * 8 + 5] = LIGHT.BROKEN;
  return level;
}
const px = (data, level, x, z) => Array.from(data.slice((z * level.w + x) * 4, (z * level.w + x) * 4 + 4));

describe('armaturkartet til glansen i flisene', () => {
  it('tente lys, blinkegruppe og armaturhøyde per rute', () => {
    const level = room();
    const lights = collectLights(level);
    const data = lampData(level, lights, 0.04);
    const h = Math.round((3.4 - 0.04) / LAMP_STEP);
    expect(px(data, level, 2, 2)).toEqual([255, 0, h, 255]);
    const flick = lights.find((l) => l.cx === 4);
    expect(px(data, level, 4, 2)).toEqual([255, flick.group + 1, h, 255]);
    expect(px(data, level, 5, 3)).toEqual([0, 0, h, 255]); // ødelagt: ingen speiling
    expect(px(data, level, 3, 3)).toEqual([0, 0, h, 255]); // uten lys: bare takhøyden
  });

  it('vegger stenger speilingen', () => {
    const level = room();
    const data = lampData(level, collectLights(level));
    expect(px(data, level, 0, 0)).toEqual([0, 0, 0, 0]);
    expect(px(data, level, 7, 3)[3]).toBe(0);
  });
});
