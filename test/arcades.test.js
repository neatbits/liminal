import { describe, expect, it } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ARCADE_VARIANTS, arcadeVariant } from '../src/core/arcades.js';
import { createLevel, TILE } from '../src/core/level.js';
import { OBJECTS, objectPose, objectFits } from '../src/core/objects.js';
import { levelToJSON, levelFromJSON, encodeLevel, decodeLevel } from '../src/core/serialize.js';

describe('arcade artwork and placement', () => {
  it('distributes all ten games along either axis and keeps the game when rotating', () => {
    for (const axis of ['x','z']) {
      const variants=Array.from({length:10},(_,k)=>arcadeVariant({x:3,z:7,[axis]:k}));
      expect(new Set(variants).size).toBe(10);
    }
    const o={x:9,z:15};
    for(let rot=0;rot<4;rot++) expect(arcadeVariant({...o,rot})).toBe(arcadeVariant(o));
    for(const v of [-1,0,9,10,255]) expect(arcadeVariant({...o,v})).toBe((v%10+10)%10);
  });

  it('loads twenty distinct compact UV textures, with ten game identities', () => {
    const hashes=new Set();
    expect(new Set(ARCADE_VARIANTS.map(v=>v.name)).size).toBe(10);
    expect(new Set(ARCADE_VARIANTS.map(v=>v.motif)).size).toBe(10);
    let total=0;
    for(let v=0;v<10;v++) for(const region of ['front','panel']) {
      const file=`src/assets/arcade/${String(v).padStart(2,'0')}-${region}.webp`;
      const data=readFileSync(file);total+=statSync(file).size;
      expect(data.toString('ascii',8,12)).toBe('WEBP');
      hashes.add(createHash('sha256').update(data).digest('hex'));
    }
    expect(hashes.size).toBe(20);
    expect(total).toBeLessThan(1024*1024);
  });

  it('preserves explicit and automatic designs through room files and links', async () => {
    const l=createLevel({w:18,h:12});
    l.objects=Array.from({length:10},(_,v)=>({id:'arcade2',x:v+3,z:4,rot:v%4,v}));
    l.objects.push({id:'arcade2',x:3,z:7,rot:0});
    for(const copy of [levelFromJSON(levelToJSON(l)),await decodeLevel(await encodeLevel(l))]) {
      expect(copy.objects.map(arcadeVariant)).toEqual(l.objects.map(arcadeVariant));
    }
  });

  it('puts the cabinet body on the floor, including raised floors and rotations', () => {
    const l=createLevel({w:12,h:12,height:4});
    for(let z=1;z<11;z++) for(let x=1;x<11;x++) l.tiles[z*12+x]=TILE.FLOOR;
    const bodyBottom=0.29961;
    for(const floor of [0,1.2]) for(let rot=0;rot<4;rot++) {
      l.floors.fill(floor*10);
      const o={id:'arcade2',x:5,z:5,rot};l.objects=[o];
      const p=objectPose(l,o);
      expect(p.y+bodyBottom).toBeLessThanOrEqual(floor);
      expect(p.y+bodyBottom).toBeGreaterThan(floor-0.01);
      expect(p.y+p.h-floor).toBeCloseTo(1.84,2);
      expect(objectFits(l,o)).toBe(true);
    }
    expect(OBJECTS.arcade2.attribution.changes).toContain('ten original');
  });
});
