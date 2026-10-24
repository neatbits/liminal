import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { createLevel, TILE } from '../src/core/level.js';
import { OBJECTS, objectFits, objectBox, objectPose } from '../src/core/objects.js';
import { levelToJSON, levelFromJSON, encodeLevel, decodeLevel } from '../src/core/serialize.js';
import { generateLevel, presetById } from '../src/gen/index.js';
import { PLANS } from '../src/gen/furnish.js';
import { furnishShops } from '../src/gen/mall-shops.js';

const retail = ['cosmeticsshelf', 'pharmacyshelf'];

describe('retail displays and retired plastic palm', () => {
  it('removes the plastic palm from the catalog, automatic furnishing and model inputs', () => {
    expect(OBJECTS.plasticpalm).toBeUndefined();
    expect(existsSync('models/plastic_palm.glb')).toBe(false);
    expect(JSON.parse(readFileSync('3dmodels/plastic_palm/model.json')).disabled).toBeTruthy();
    expect(Object.values(PLANS).flat().some(p => p.id === 'plasticpalm')).toBe(false);
    expect(OBJECTS.pottedpalm).toBeTruthy();
  });

  it('bakes all repeated shelf parts into geometry supported by the object renderer', () => {
    for (const id of retail) {
      const data = readFileSync(`models/${OBJECTS[id].file}.glb`);
      const gltf = JSON.parse(data.subarray(20, 20 + data.readUInt32LE(12)).toString());
      expect(gltf.extensionsUsed ?? []).not.toContain('EXT_mesh_gpu_instancing');
    }
  });

  it('uses both imported displays inside shops without obstructing their front or overlapping', () => {
    const seen = new Set();
    for (const l of [presetById('mall').make({seed:7,layout:'gallery'}), ...[1, 3, 7, 11].map(seed => generateLevel({ theme: 'mall', w: 56, h: 40, seed }))]) {
      for (const o of l.objects.filter(o => retail.includes(o.id))) {
        seen.add(o.id);
        expect(objectFits(l, o), `${l.name}: ${o.id}`).toBe(true);
        const b = objectBox(objectPose(l, o));
        for (let z = Math.floor(b[1] + .02); z <= Math.floor(b[3] - .02); z++) {
          for (let x = Math.floor(b[0] + .02); x <= Math.floor(b[2] - .02); x++) {
            expect(l.finish[z * l.w + x], `${o.id} footprint stays in the shop`).toBeGreaterThan(0);
          }
        }
      }
    }
    expect([...seen].sort()).toEqual([...retail].sort());
  });

  it('keeps tiny and closed shops valid without forcing a wide display into them', () => {
    const l = createLevel({ theme: 'mall', w: 10, h: 10 });
    for (let z = 1; z < 9; z++) for (let x = 1; x < 9; x++) l.tiles[z * l.w + x] = TILE.FLOOR;
    const shop = { x0: 3, x1: 5, z0: 3, z1: 4, front: 5, style: 0 };
    furnishShops(l, () => .4, [shop]);
    expect(l.objects.some(o => o.id === 'cosmeticsshelf')).toBe(false);
    for (const o of l.objects) expect(objectFits(l, o)).toBe(true);
    l.objects = [];
    furnishShops(l, () => .8, [{ ...shop, closed: true }]);
    expect(l.objects.some(o => retail.includes(o.id))).toBe(false);
  });

  it('preserves display objects through room files and share links', async () => {
    const l = presetById('mall').make({seed:7,layout:'gallery'});
    expect(l.objects.filter(o => retail.includes(o.id)).length).toBeGreaterThan(0);
    expect(levelFromJSON(levelToJSON(l)).objects).toEqual(l.objects);
    expect((await decodeLevel(await encodeLevel(l))).objects).toEqual(l.objects);
  });
});
