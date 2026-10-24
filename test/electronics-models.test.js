import { describe, expect, it } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { ELECTRONIC_OBJECTS, RETRO_PC_IDS } from '../src/core/object-catalog-electronics.js';
import { generateLevel, presetById } from '../src/gen/index.js';
import { createLevel, TILE } from '../src/core/level.js';
import { objectFits, objectPose } from '../src/core/objects.js';
import { levelFromJSON, levelToJSON, encodeLevel, decodeLevel } from '../src/core/serialize.js';
import { shopInteriorMap } from '../src/core/shop-interiors.js';

describe('retro electronics models', () => {
  it('keeps credits and compact compatible GLBs for the imported objects', () => {
    let total = 0;
    for (const def of Object.values(ELECTRONIC_OBJECTS)) {
      const source = def.file.startsWith('retro_pc_') ? 'retro_computer_pack_4_pcs' : def.file;
      const license = readFileSync(`3dmodels/${source}/license.txt`, 'utf8');
      for (const k of ['title', 'author', 'source', 'authorUrl']) expect(license).toContain(def.attribution[k]);
      expect(license).toContain('CC-BY-4.0');
      const file = `models/${def.file}.glb`, data = readFileSync(file);
      total += statSync(file).size;
      const gltf = JSON.parse(data.subarray(20, 20 + data.readUInt32LE(12)).toString());
      expect(gltf.extensionsUsed ?? []).not.toContain('EXT_mesh_gpu_instancing');
      const triangles = gltf.meshes.flatMap(m => m.primitives).reduce((n, p) => n + gltf.accessors[p.indices ?? p.attributes.POSITION].count / 3, 0);
      expect(triangles).toBeLessThan(22000);
      expect(data.length).toBeLessThan(600 * 1024);
    }
    expect(total).toBeLessThan(1600 * 1024);
    expect(new Set(RETRO_PC_IDS.map(id => ELECTRONIC_OBJECTS[id].file)).size).toBe(4);
  });

  it('supports each computer and the portable player on a desk in every rotation', () => {
    for (const id of [...RETRO_PC_IDS, 'walkman', 'vhsplayer']) for (let rot = 0; rot < 4; rot++) {
      const l = createLevel({ theme: 'office', w: 12, h: 12 });
      for (let z = 1; z < 11; z++) for (let x = 1; x < 11; x++) l.tiles[z * l.w + x] = TILE.FLOOR;
      l.objects = [{ id: 'moderndesk', x: 5, z: 5, rot }, { id, x: 5, z: 5, rot }];
      expect(objectFits(l, l.objects[1]), id).toBe(true);
      expect(objectPose(l, l.objects[1]).y, id).toBeCloseTo(.762);
    }
  });

  it('furnishes hi-fi and portable players in electronics shops, with computers on stands', () => {
    const l = presetById('mall').make({seed:7,layout:'gallery'}), map = shopInteriorMap(l);
    expect(l.objects.some(o => o.id === 'hifi')).toBe(true);
    expect(l.objects.some(o => o.id === 'walkman')).toBe(true);
    expect(l.objects.some(o => RETRO_PC_IDS.includes(o.id))).toBe(true);
    for (const o of l.objects.filter(o => ['hifi', 'walkman', 'vhsplayer', ...RETRO_PC_IDS].includes(o.id))) {
      expect(map[o.z * l.w + o.x]).toBe(2);
      expect(objectFits(l, o), o.id).toBe(true);
      if (RETRO_PC_IDS.includes(o.id)) expect(objectPose(l, o).y).toBeCloseTo(.769);
      if (o.id === 'walkman') expect(objectPose(l, o).y).toBeCloseTo(1);
    }
  });

  it('uses all four PCs in offices/schools and sparse personal audio in suitable rooms', () => {
    const computers = new Set(), portable = new Set();
    for (const theme of ['office', 'school', 'basement', 'hotel']) for (let seed = 1; seed <= 12; seed++) {
      const l = generateLevel({ theme, w: 48, h: 40, seed });
      for (const o of l.objects.filter(o => ELECTRONIC_OBJECTS[o.id])) {
        expect(objectFits(l, o), `${theme}: ${o.id}`).toBe(true);
        if (RETRO_PC_IDS.includes(o.id)) {
          expect(['office', 'school']).toContain(theme);
          expect(objectPose(l, o).y).toBeGreaterThan(.5); computers.add(o.id);
        }
        if (o.id === 'walkman') { expect(objectPose(l, o).y).toBeGreaterThan(.5); portable.add(theme); }
      }
    }
    expect([...computers].sort()).toEqual([...RETRO_PC_IDS].sort());
    expect(portable.has('office') || portable.has('school')).toBe(true);
    expect(portable.has('basement') || portable.has('hotel')).toBe(true);
  });

  it('preserves all new object IDs through room files and sharing', async () => {
    const l = presetById('mall').make({seed:7,layout:'gallery'});
    l.objects = Object.keys(ELECTRONIC_OBJECTS).map((id, i) => ({ id, x: 3 + i * 2, z: 6, rot: i % 4 }));
    expect(levelFromJSON(levelToJSON(l)).objects).toEqual(l.objects);
    expect((await decodeLevel(await encodeLevel(l))).objects).toEqual(l.objects);
  });
});
