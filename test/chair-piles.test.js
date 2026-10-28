import { describe, expect, it } from 'vitest';
import { createLevel, TILE } from '../src/core/level.js';
import { OBJECTS, objectPose, objectsFromJSON } from '../src/core/objects.js';
import { TIP, tipFrame, tipOrigin, tipQuaternion } from '../src/core/object-tip.js';
import { levelToJSON, levelFromJSON } from '../src/core/serialize.js';
import { chairPile, PILE_CHAIR } from '../src/gen/chair-piles.js';
import { generateLevel } from '../src/gen/index.js';
import { mulberry32 } from '../src/core/rng.js';
import { SoftPhysics } from '../src/world/softphysics.js';

function room() {
  const l = createLevel({ theme: 'backrooms', w: 12, h: 12, height: 2.8 });
  for (let z = 1; z < 11; z++) for (let x = 1; x < 11; x++) l.tiles[z * l.w + x] = TILE.FLOOR;
  return l;
}
const rotate = ([x, y, z, w], [vx, vy, vz]) => {
  // q · v · q⁻¹
  const ix = w * vx + y * vz - z * vy, iy = w * vy + z * vx - x * vz, iz = w * vz + x * vy - y * vx, iw = -x * vx - y * vy - z * vz;
  return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x];
};

describe('veltede gjenstander og stolhauger', () => {
  it('modellen havner nøyaktig i fotavtrykket, uansett velting og dreining', () => {
    const size = OBJECTS[PILE_CHAIR].size;
    const [w, h, d] = size;
    for (const tip of [TIP.UP, TIP.BACK, TIP.SIDE]) {
      for (let rot = 0; rot < 4; rot++) {
        const l = room();
        l.objects = [{ id: PILE_CHAIR, x: 5, z: 5, rot, ...(tip ? { tip } : {}), off: [0.1, -0.05] }];
        const p = objectPose(l, l.objects[0]);
        expect(p.h).toBeCloseTo(tipFrame(tip, size).size[1]);
        const origin = tipOrigin(p, size), q = tipQuaternion(p, size);
        const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
        for (const x of [-w / 2, w / 2]) for (const y of [0, h]) for (const z of [-d / 2, d / 2]) {
          const v = rotate(q, [x, y, z]).map((c, i) => c + origin[i]);
          v.forEach((c, i) => ((lo[i] = Math.min(lo[i], c)), (hi[i] = Math.max(hi[i], c))));
        }
        const at = `tip ${tip} rot ${rot}`;
        expect(lo[1], at).toBeCloseTo(p.y);
        expect(hi[1], at).toBeCloseTo(p.y + p.h);
        expect(lo[0], at).toBeCloseTo(p.x - p.w / 2);
        expect(hi[0], at).toBeCloseTo(p.x + p.w / 2);
        expect(lo[2], at).toBeCloseTo(p.z - p.d / 2);
        expect(hi[2], at).toBeCloseTo(p.z + p.d / 2);
        expect(p.x).toBeCloseTo(5.6); // off flytter innenfor ruten, og haugen skyves ikke mot veggen
      }
    }
  });

  it('velting, løft og forskyvning lagres, og ugyldige verdier forkastes', () => {
    const l = room();
    l.objects = [{ id: PILE_CHAIR, x: 4, z: 4, rot: 1, tip: TIP.SIDE, lift: 0.457, off: [0.2, -0.3] }, { id: PILE_CHAIR, x: 6, z: 6, rot: 0 }];
    const back = levelFromJSON(JSON.parse(JSON.stringify(levelToJSON(l))));
    expect(back.objects).toEqual(l.objects);
    expect(objectsFromJSON(l, [{ id: PILE_CHAIR, x: 4, z: 4, rot: 0, tip: 7, lift: -1, off: [9, 'x'] }])[0]).toEqual({ id: PILE_CHAIR, x: 4, z: 4, rot: 0 });
    expect(objectsFromJSON(l, [{ id: PILE_CHAIR, x: 4, z: 4, rot: 0, off: [0.9, -0.9] }])[0].off).toEqual([0.5, -0.5]);
  });

  it('en haug: to på siden, én på ryggen på tvers oppå dem, uten at stolene på gulvet går inn i hverandre', () => {
    const l = room();
    expect(chairPile(l, mulberry32(3), 4, 4)).toBeGreaterThanOrEqual(3);
    const poses = l.objects.map((o) => objectPose(l, o));
    const floor = poses.filter((p) => p.y < 0.01), top = poses.filter((p) => p.y > 0.01);
    expect(top.length).toBe(1);
    expect(top[0].y).toBeCloseTo(OBJECTS[PILE_CHAIR].size[0]); // like høyt som en stol på siden
    expect(top[0].tip).toBe(TIP.BACK);
    const box = (p) => [p.x - p.w / 2, p.z - p.d / 2, p.x + p.w / 2, p.z + p.d / 2];
    const overlap = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
    for (let i = 0; i < floor.length; i++) for (let j = i + 1; j < floor.length; j++) expect(overlap(box(floor[i]), box(floor[j]))).toBeLessThan(0.01);
    expect(floor.filter((p) => p.tip === TIP.SIDE && overlap(box(p), box(top[0])) > 0.05).length).toBe(2); // ligger på begge
    expect(chairPile(l, mulberry32(4), 4, 4)).toBe(0); // opptatt
  });

  it('haugen blir liggende i fysikken (ingen eksplosjon), og stolene faller ikke gjennom gulvet', () => {
    for (let seed = 1; seed <= 8; seed++) settles(seed); // haugen dreies tilfeldig: alle fire retninger
  });
});

/** Haugen fra frøet blir liggende i fysikken i tre sekunder. */
function settles(seed) {
  const l = room();
  chairPile(l, mulberry32(seed), 4, 4);
  const phys = new SoftPhysics(l);
  const start = phys.poses();
  for (let i = 0; i < 180; i++) phys.step(1 / 60, null);
  const end = phys.poses();
  for (let i = 0; i < start.length; i++) {
    expect(Math.hypot(end[i].x - start[i].x, end[i].z - start[i].z), `stol ${i}`).toBeLessThan(0.45);
    expect(end[i].low, `stol ${i}`).toBeGreaterThan(-0.05);
  }
  const top = l.objects.findIndex((o) => o.lift);
  expect(end.find((p) => p.i === top).low, `frø ${seed}`).toBeGreaterThan(0.3); // fortsatt oppå de to andre
}

describe('stolhauger i genererte rom', () => {
  it('Level 0 får trestoler og hauger', () => {
    const count = (theme, id, pred = () => true) => {
      let n = 0;
      for (let seed = 1; seed <= 8; seed++) n += generateLevel({ theme, w: 48, h: 48, seed }).objects.filter((o) => o.id === id && pred(o)).length;
      return n;
    };
    expect(count('backrooms', PILE_CHAIR)).toBeGreaterThan(8);
    expect(count('backrooms', PILE_CHAIR, (o) => o.lift)).toBeGreaterThan(0); // minst én haug
  }, 30000);
});
