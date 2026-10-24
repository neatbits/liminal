import { describe, expect, it } from 'vitest';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { INTERIOR_OBJECTS } from '../src/core/object-catalog-interiors.js';
import { createLevel, TILE } from '../src/core/level.js';
import { objectFits, objectPose, placeObject } from '../src/core/objects.js';
import { levelFromJSON, levelToJSON, encodeLevel, decodeLevel } from '../src/core/serialize.js';
import { generateLevel } from '../src/gen/index.js';

const fixture = (theme = 'office') => {
  const level = createLevel({ theme, w: 14, h: 14, height: 3 });
  for (let z = 1; z < 13; z++) for (let x = 1; x < 13; x++) level.tiles[z * 14 + x] = TILE.FLOOR;
  return level;
};

describe('nye interiørmodeller', () => {
  it('bevarer korrekt CC BY-kreditering fra kildefilene, med endringsmerknad', () => {
    for (const def of Object.values(INTERIOR_OBJECTS)) {
      const license = readFileSync(`3dmodels/${def.file}/license.txt`, 'utf8');
      const a = def.attribution;
      for (const value of [a.title, a.author, a.source, a.authorUrl]) expect(license).toContain(value);
      expect(license).toContain('CC-BY-4.0');
      expect(a.license).toBe('CC BY 4.0');
      expect(a.changes).toContain('optimized');
    }
  });

  it('leverer kompakte GLB-er med avgrenset geometri for gjentatt møblering', () => {
    let bytes = 0;
    for (const def of Object.values(INTERIOR_OBJECTS)) {
      const file = `models/${def.file}.glb`;
      bytes += statSync(file).size;
      expect(statSync(file).size, file).toBeLessThan(1024 * 1024);
      const data = readFileSync(file);
      const gltf = JSON.parse(data.subarray(20, 20 + data.readUInt32LE(12)).toString());
      const triangles = gltf.meshes.flatMap(m => m.primitives).reduce((sum, p) => sum + gltf.accessors[p.indices ?? p.attributes.POSITION].count / 3, 0);
      expect(triangles, file).toBeLessThan(22000);
    }
    expect(bytes).toBeLessThan(3 * 1024 * 1024);
  });

  it('holder de to utsatte lisensene utenfor katalog og bygg', () => {
    for (const file of ['book_shelf', 'school_desk']) {
      expect(Object.values(INTERIOR_OBJECTS).some(d => d.file === file)).toBe(false);
      expect(JSON.parse(readFileSync(`3dmodels/${file}/model.json`)).disabled).toBeTruthy();
      expect(existsSync(`models/${file}.glb`)).toBe(false);
    }
  });

  it('plasserer småting på moderne pulter og avviser overlapp', () => {
    for (const id of ['mug', 'desklamp']) {
      const l = fixture();
      expect(placeObject(l, 7, 7, 'moderndesk')).toBe(1);
      expect(placeObject(l, 7, 7, id)).toBe(1);
      expect(l.objects[1].id).toBe(id);
      expect(objectPose(l, l.objects[1]).y).toBeCloseTo(INTERIOR_OBJECTS.moderndesk.surface);
      const conflict = { id, x: 7, z: 7, rot: 0 };
      expect(objectFits(l, conflict, [...l.objects, conflict])).toBe(false);
    }
  });

  it('veggtavler krever vegg, henger over gulvet og følger veggen i alle retninger', () => {
    const spots = [[7, 1], [12, 7], [7, 12], [1, 7]];
    for (let rot = 0; rot < 4; rot++) {
      const l = fixture(), [x, z] = spots[rot];
      const o = { id: 'wallboard', x, z, rot };
      expect(objectFits(l, o, [o])).toBe(true);
      expect(objectPose(l, o).y).toBeCloseTo(1.05);
      expect(objectFits(l, { ...o, x: 7, z: 7 })).toBe(false);
      l.objects = [o, { id: 'moderndesk', x, z, rot }];
      expect(objectPose(l, o).y).toBeCloseTo(1.05);
    }
  });

  it('bevarer alle nye objekter via romfil og delingslenke', async () => {
    const l = fixture();
    l.objects = Object.keys(INTERIOR_OBJECTS).map((id, i) => ({ id, x: 2 + i % 4 * 3, z: 2 + Math.floor(i / 4) * 3, rot: i % 4 }));
    expect(levelFromJSON(levelToJSON(l)).objects).toEqual(l.objects);
    expect((await decodeLevel(await encodeLevel(l))).objects).toEqual(l.objects);
  });

  it('møblerer nye modeller i riktige temaer uten geometrisk overlapp', () => {
    const seen = new Set();
    const expected = {
      office: ['moderndesk', 'mug', 'desklamp', 'armchair', 'whiteboard', 'wallboard'],
      school: ['schoolcabinet', 'whiteboard', 'wallboard'],
      ward: ['hospitalbed', 'medicalscreen', 'medicalcabinet', 'medicaltrolley', 'waitingchairs'],
      hotel: ['armchair'], basement: ['armchair'],
    };
    for (const [theme, wanted] of Object.entries(expected)) {
      const themed = new Set();
      for (const seed of [1, 2, 3, 4]) {
        const l = generateLevel({ theme, w: 44, h: 38, seed });
        for (const o of l.objects.filter(o => INTERIOR_OBJECTS[o.id])) {
          seen.add(o.id); themed.add(o.id);
          expect(objectFits(l, o), `${theme} ${seed}: ${o.id}`).toBe(true);
          if (theme === 'school' && ['schoolcabinet', 'wallboard', 'whiteboard'].includes(o.id)) expect(l.finish[o.z * l.w + o.x]).toBe(0);
        }
      }
      for (const id of wanted) expect(themed.has(id), `${theme}: ${id} er aldri møblert inn`).toBe(true);
    }
    expect([...seen].sort()).toEqual(Object.keys(INTERIOR_OBJECTS).sort());
    for (const theme of ['pool', 'playroom', 'garage', 'backrooms']) {
      const l = generateLevel({ theme, w: 40, h: 32, seed: 1 });
      expect(l.objects.some(o => INTERIOR_OBJECTS[o.id])).toBe(false);
    }
  });
});
