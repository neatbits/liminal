import { describe, expect, it } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { createLevel, TILE, setTile, cloneLevel } from '../src/core/level.js';
import { SHOP_PROFILES, shopfronts, isShopfront } from '../src/core/shopfronts.js';
import { MALL_OBJECTS } from '../src/core/object-catalog-mall.js';
import { objectFits, objectPose, objectBox } from '../src/core/objects.js';
import { levelToJSON, levelFromJSON, encodeLevel, decodeLevel } from '../src/core/serialize.js';
import { generateLevel, presetById } from '../src/gen/index.js';
import { buildShopfronts } from '../src/world/shopfronts.js';
import { buildSurfaces } from '../src/world/surfaces.js';
import { buildRailings } from '../src/world/railings.js';
import { mallTraffic } from '../src/gen/mall-traffic.js';
import { Walker } from '../src/view3d/walker.js';
import { getTheme } from '../src/core/themes.js';

describe('mall display windows and identities', () => {
  it('generates different storefront identities, glazing and two-metre open entrances', () => {
    for (const seed of [1, 3, 7]) {
      const l = generateLevel({ theme: 'mall', w: 56, h: 40, seed });
      const fronts = shopfronts(l);
      expect(fronts.length).toBeGreaterThan(4);
      expect(new Set(fronts.map(s => s.style)).size).toBe(4);
      for (const s of fronts) {
        expect(SHOP_PROFILES[s.style]).toBeTruthy();
        const cells = Array.from({ length: s.x1 - s.x0 + 1 }, (_, i) => (s.z * l.w + s.x0 + i));
        const entrances = cells.filter(i => l.tiles[i] === TILE.FLOOR);
        if (entrances.length) expect(entrances.length).toBe(2);
        else expect(cells.some(i => l.tiles[i] === TILE.DOOR)).toBe(true);
        expect(cells.some(i => l.tiles[i] === TILE.WALL)).toBe(true);
        expect(cells.every(i => !l.corners[i])).toBe(true);
      }
      const data = buildShopfronts(l, null);
      for (const mesh of Object.values(data)) expect(mesh.vertexCount).toBeGreaterThan(0);
      expect(data.shopGlass.pos.some((v, i) => i % 3 === 1 && v > 4.5)).toBe(true);
      expect(buildRailings(l,null).railGlass.vertexCount).toBeGreaterThan(0);
    }
  });

  it('keeps glass solid for walking and entrances passable', () => {
    const l = presetById('mall').make({seed:7,layout:'gallery'}), theme = getTheme('mall');
    l.objects = [];
    const s = shopfronts(l).find(s => Array.from({length:s.x1-s.x0+1},(_,i)=>l.tiles[s.z*l.w+s.x0+i]).includes(TILE.FLOOR));
    const input = { forward: 1, strafe: 0, running: false, consumeLook: () => [0, 0] };
    for (const tile of [TILE.WALL, TILE.FLOOR]) {
      const x = Array.from({length:s.x1-s.x0+1},(_,i)=>s.x0+i).find(x => l.tiles[s.z*l.w+x] === tile);
      const walker = new Walker();
      walker.reset(l, { x:x+0.5, z:s.z+0.5+s.n*2, a:s.n>0?0:Math.PI });
      for (let k=0;k<75;k++) walker.update(1/30,input,l,theme);
      expect((walker.z-s.z-0.5)*s.n > 0).toBe(tile === TILE.WALL);
    }
  });

  it('preserves facades in copies, room files and shared links, and clears metadata on repaint', async () => {
    const l = presetById('mall').make({seed:7,layout:'gallery'}), expected = shopfronts(l);
    for (const copy of [cloneLevel(l), levelFromJSON(levelToJSON(l)), await decodeLevel(await encodeLevel(l))]) {
      expect(shopfronts(copy)).toEqual(expected);
    }
    const {x0:x,z} = expected[0];
    setTile(l,x,z,TILE.WATER);
    expect(isShopfront(l,x,z)).toBe(false);
    const empty = createLevel({theme:'mall',w:8,h:8});
    expect(buildShopfronts(empty,null).shopGlass.vertexCount).toBe(0);
  });

  it('replaces the opaque window face while retaining the ordinary walls', () => {
    const l = presetById('mall').make({seed:7,layout:'gallery'});
    const glass = buildSurfaces(l,null).wall.vertexCount;
    const solid = cloneLevel(l); solid.meta.fill(0);
    expect(buildSurfaces(solid,null).wall.vertexCount).toBeGreaterThan(glass);
    const {x0,x1,z} = shopfronts(l)[0];
    for(let x=x0+1;x<=x1;x++) l.meta[z*l.w+x]=0;
    expect(shopfronts(l).some(s=>s.x0===x0&&s.x1===x0&&s.z===z)).toBe(true);
    expect(buildShopfronts(l,null).shopGlass.vertexCount).toBeGreaterThan(0);
  });
});

describe('mall seating and greenery', () => {
  it('keeps attribution, optimized model files and bounded geometry', () => {
    for (const def of Object.values(MALL_OBJECTS)) {
      const license = readFileSync(`3dmodels/${def.file}/license.txt`,'utf8');
      for (const field of ['title','author','source','authorUrl']) expect(license).toContain(def.attribution[field]);
      expect(license).toContain('CC-BY-4.0');
      const data = readFileSync(`models/${def.file}.glb`);
      expect(statSync(`models/${def.file}.glb`).size).toBeLessThan(1024*1024);
      const gltf = JSON.parse(data.subarray(20,20+data.readUInt32LE(12)).toString());
      const tris = gltf.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+gltf.accessors[p.indices??p.attributes.POSITION].count/3,0);
      expect(tris).toBeLessThan(22000);
    }
    expect(JSON.parse(readFileSync('3dmodels/potted_plant_01/model.json')).disabled).toBeTruthy();
  });

  it('uses the models in suitable themes, with valid positions clear of approaches', () => {
    const expected = { mall:['mallbench','pottedpalm','pottedtree','pottedplant'], pool:['pottedpalm'], office:['pottedplant'], hotel:['pottedplant'], ward:['pottedplant'] };
    for (const [theme,ids] of Object.entries(expected)) {
      const seen = new Set();
      for (const seed of [1,3,7,11]) {
        const l = generateLevel({theme,w:56,h:40,seed}), traffic = mallTraffic(l);
        for (const o of l.objects.filter(o=>MALL_OBJECTS[o.id])) {
          seen.add(o.id);
          expect(objectFits(l,o),`${theme} ${seed}: ${o.id}`).toBe(true);
          if (theme==='mall' && !l.finish[o.z*l.w+o.x]) {
            expect(traffic([o.x,o.z]),o.id).toBe(false);
            const b=objectBox(objectPose(l,o));
            expect(b.every(Number.isFinite)).toBe(true);
          }
        }
      }
      for (const id of ids) expect(seen.has(id),`${theme}: ${id}`).toBe(true);
    }
  });
});
