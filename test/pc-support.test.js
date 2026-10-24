import { describe, it, expect } from 'vitest';
import { createLevel, TILE } from '../src/core/level.js';
import { OBJECTS, objectFits, objectPose, objectBox } from '../src/core/objects.js';
import { RETRO_PC_IDS } from '../src/core/object-catalog-electronics.js';
import { generateLevel, presetById } from '../src/gen/index.js';
import { displayStand } from '../src/gen/furnish-electronics.js';
import { deskItem } from '../src/gen/desk-items.js';

function room() {
  const l = createLevel({ theme: 'office', w: 16, h: 16 });
  for (let z = 1; z < 15; z++) for (let x = 1; x < 15; x++) l.tiles[z * 16 + x] = TILE.FLOOR;
  return l;
}

function supported(l, o) {
  const p = objectPose(l, o),
    box = objectBox(p);
  const support = l.objects.find(
    q =>
      OBJECTS[q.id]?.surface &&
      Math.abs(objectPose(l, q).y + OBJECTS[q.id].surface - p.y) < 0.01 &&
      q.x === o.x &&
      q.z === o.z,
  );
  expect(support, `${l.theme}: ${o.id} has a surface`).toBeDefined();
  const b = objectBox(objectPose(l, support));
  expect(box[0]).toBeGreaterThanOrEqual(b[0] - 0.01);
  expect(box[1]).toBeGreaterThanOrEqual(b[1] - 0.01);
  expect(box[2]).toBeLessThanOrEqual(b[2] + 0.01);
  expect(box[3]).toBeLessThanOrEqual(b[3] + 0.01);
}

describe('PC support footprints', () => {
  it.each(['pc', ...RETRO_PC_IDS])(
    '%s fits fully on the new table and is rejected on shallow furniture',
    id => {
      for (let rot = 0; rot < 4; rot++)
        for (const stand of ['table', 'tvbench', 'desk2']) {
          const l = room();
          l.objects = [
            { id: stand, x: 7, z: 7, rot },
            { id, x: 7, z: 7, rot },
          ];
          expect(objectFits(l, l.objects[1]), `${id} on ${stand}, ${rot}`).toBe(stand === 'table');
          if (stand === 'table') supported(l, l.objects[1]);
        }
    },
  );
  it('uses tables for PC shop displays and retains low benches for TV displays', () => {
    for (const id of [...RETRO_PC_IDS, 'tv']) {
      const l = room();
      expect(displayStand(l, id, 7, 7, 0)).toBe(true);
      expect(l.objects[0].id).toBe(id === 'tv' ? 'tvbench' : 'table');
      if (id !== 'tv') supported(l, l.objects[1]);
    }
  });
  it('upgrades a shallow desk only when the selected PC needs more space', () => {
    const l = room(),
      desk = { id: 'desk2', x: 7, z: 7, rot: 2 };
    l.objects = [desk];
    expect(deskItem(l, desk, 'retropccompact')).toBe(1);
    expect(l.objects[0].id).toBe('table');
    supported(l, l.objects[1]);
    const small = room(),
      d = { ...desk };
    small.objects = [d];
    deskItem(small, d, 'walkman');
    expect(small.objects[0].id).toBe('desk2');
  });
  it('keeps all generated computers inside their supporting surfaces across themes', () => {
    let found = 0;
    const levels = [presetById('mall').make({ seed: 7, layout: 'gallery' })];
    for (const theme of ['mall', 'office', 'school', 'basement', 'hotel', 'ward'])
      for (const seed of [1, 3, 7, 11]) levels.push(generateLevel({ theme, w: 56, h: 40, seed }));
    for (const l of levels)
      for (const o of l.objects.filter(o => OBJECTS[o.id].fullSupport)) {
        supported(l, o);
        expect(objectFits(l, o)).toBe(true);
        found++;
      }
    expect(found).toBeGreaterThan(10);
  });
});
