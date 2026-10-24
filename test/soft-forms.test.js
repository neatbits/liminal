import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OBJECTS, objectFits } from '../src/core/objects.js';
import { createLevel, TILE } from '../src/core/level.js';
import { softGeometry } from '../src/world/soft-geometry.js';
import { softFormGeometry } from '../src/world/soft-forms.js';
import { SoftPhysics } from '../src/world/softphysics.js';
import { generateLevel } from '../src/gen/index.js';
import { levelFromJSON, levelToJSON, encodeLevel, decodeLevel } from '../src/core/serialize.js';

const ids = Object.keys(OBJECTS).filter(id => OBJECTS[id].soft);
const forms = ['softramp', 'softcylinder', 'softsteps'];
const room = () => {
  const l = createLevel({ theme: 'playroom', w: 14, h: 14 });
  for (let z = 1; z < 13; z++) for (let x = 1; x < 13; x++) l.tiles[z * l.w + x] = TILE.FLOOR;
  return l;
};

describe('padded soft shapes', () => {
  it.each(ids)('%s has finite smooth geometry inside its catalog/physics bounds', id => {
    const def = OBJECTS[id];
    const g = def.softForm ? softFormGeometry(def.softForm, ...def.size) : softGeometry(...def.size);
    g.computeBoundingBox();
    const box = g.boundingBox, size = box.getSize(new THREE.Vector3()).toArray();
    for (let k = 0; k < 3; k++) expect(size[k]).toBeCloseTo(def.size[k], 5);
    expect(box.min.y).toBeCloseTo(0, 5);
    expect(g.attributes.position.count).toBeLessThan(400);
    for (const name of ['position', 'normal', 'uv']) expect([...g.attributes[name].array].every(Number.isFinite)).toBe(true);
    const normals = g.attributes.normal, v = new THREE.Vector3();
    for (let i = 0; i < normals.count; i++) expect(v.fromBufferAttribute(normals, i).length()).toBeCloseTo(1, 4);
    // The old box only had axis-aligned normals; curved edges must actually be rounded.
    expect(Array.from({ length: normals.count }, (_, i) => Math.abs(normals.getX(i))).some(x => x > .1 && x < .9)).toBe(true);
    expect([...g.attributes.uv.array].every(x => x >= 0 && x <= 1)).toBe(true);
    g.dispose();
  });

  it.each(forms)('%s settles on the floor and can be pushed without invalid physics', id => {
    const l = room(); l.objects = [{ id, x: 6, z: 6, rot: 0 }];
    const p = new SoftPhysics(l);
    for (let k = 0; k < 180; k++) p.step(1 / 60);
    expect(p.poses()[0].y).toBeCloseTo(0, 2);
    const body = p.blocks[0].body;
    for (let k = 0; k < 150; k++) p.step(1 / 60, { x: 4.5 + k / 60 * 1.5, y: 0, z: 6.5, vx: 1.5, vz: 0 });
    expect(body.position.x).toBeGreaterThan(6.7);
    expect([...body.position.toArray(), ...body.quaternion.toArray()].every(Number.isFinite)).toBe(true);
  });

  it.each([0, 1, 2, 3])('physics follows the sloped and stepped tops in rotation %s', rot => {
    const probe = (id, localX, localZ) => {
      const l = room(); l.objects = [{ id, x: 6, z: 6, rot }];
      const p = new SoftPhysics(l), angle = -rot * Math.PI / 2;
      const x = 6.5 + Math.cos(angle) * localX + Math.sin(angle) * localZ;
      const z = 6.5 - Math.sin(angle) * localX + Math.cos(angle) * localZ;
      const hit = new CANNON.RaycastResult();
      p.world.raycastClosest(new CANNON.Vec3(x, 2, z), new CANNON.Vec3(x, -.1, z), { skipBackfaces: true }, hit);
      return hit.hitPointWorld.y;
    };
    expect(probe('softramp', 0, -.4)).toBeGreaterThan(.32);
    expect(probe('softramp', 0, .4)).toBeLessThan(.12);
    expect(probe('softsteps', 0, -.3)).toBeCloseTo(.4, 4);
    expect(probe('softsteps', 0, .3)).toBeCloseTo(.2, 4);
    expect(probe('softcylinder', 0, 0)).toBeCloseTo(.4, 4);
    expect(probe('softcylinder', .32, .32)).toBeCloseTo(0, 4);
  });

  it('furnishes all new forms and preserves them through files and sharing', async () => {
    const seen = new Set();
    for (let seed = 1; seed <= 8; seed++) {
      const l = generateLevel({ theme: 'playroom', w: 48, h: 40, seed });
      for (const o of l.objects.filter(o => forms.includes(o.id))) {
        seen.add(o.id); expect(objectFits(l, o)).toBe(true);
      }
    }
    expect([...seen].sort()).toEqual([...forms].sort());
    const l = room(); l.objects = forms.map((id, i) => ({ id, x: 3 + i * 3, z: 5, rot: i, v: i + 2 }));
    expect(levelFromJSON(levelToJSON(l)).objects).toEqual(l.objects);
    expect((await decodeLevel(await encodeLevel(l))).objects).toEqual(l.objects);
  });
});
