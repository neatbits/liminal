import { describe, expect, it } from 'vitest';
import { createLevel, TILE } from '../src/core/level.js';
import { fillTiles, rectIndices } from '../src/core/ops.js';
import { DOOR, doorInfo, doorFronts, swingCell, setDoor } from '../src/core/doors.js';
import { OBJECTS, objectPose, objectBox } from '../src/core/objects.js';
import { untangleDoors, clearDoorways } from '../src/gen/door-space.js';
import { generateLevel } from '../src/gen/index.js';

const key = ([x, z]) => `${x},${z}`;
function allDoors(level) {
  const out = [];
  for (let i = 0; i < level.tiles.length; i++) {
    const info = level.tiles[i] === TILE.DOOR && doorInfo(level, i % level.w, Math.floor(i / level.w));
    if (info) out.push(info);
  }
  return out;
}
/** Dørblad som slår inn foran en annen åpning. */
function clashes(level) {
  const doors = allDoors(level);
  let n = 0;
  for (const a of doors) {
    const s = swingCell(a);
    if (s && doors.some((b) => b !== a && doorFronts(b).map(key).includes(key(s)))) n++;
  }
  return n;
}

// To rom (x 1–3 og x 5–7) og en gang under (z 5), med dører i et hjørne som slår inn i samme rute.
function corner() {
  const level = createLevel({ w: 10, h: 9 });
  fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 7, z1: 3 }), TILE.FLOOR);
  fillTiles(level, rectIndices(level, { x0: 4, z0: 1, x1: 4, z1: 3 }), TILE.WALL);
  fillTiles(level, rectIndices(level, { x0: 1, z0: 5, x1: 7, z1: 5 }), TILE.FLOOR);
  setDoor(level, 3, 4, DOOR.OPEN); // fra rommet ned til gangen
  setDoor(level, 4, 3, DOOR.OPEN); // mellom rommene, rett ved siden av
  return level;
}

describe('dører som er i veien for hverandre', () => {
  it('snus eller mister dørbladet, så ingen slår inn foran en annen åpning', () => {
    const level = corner();
    // Sørg for at de faktisk kolliderer først: begge slår inn i rute (3, 3).
    for (const d of allDoors(level)) if (key(swingCell(d)) !== '3,3') setDoor(level, d.x, d.z, DOOR.OPEN);
    expect(clashes(level)).toBeGreaterThan(0);
    expect(untangleDoors(level)).toBeGreaterThan(0);
    expect(clashes(level)).toBe(0);
    expect(allDoors(level).length).toBe(2); // åpningene står der fortsatt
  });

  it('i genererte rom slår ingen dørblad inn foran en annen åpning', () => {
    for (const theme of ['backrooms', 'office', 'hotel', 'school', 'ward', 'basement']) {
      for (const seed of [1, 2, 3]) expect(clashes(generateLevel({ theme, seed })), `${theme} ${seed}`).toBe(0);
    }
  });
});

describe('gjenstander foran døråpninger', () => {
  it('fjernes – og det som stod oppå følger med', () => {
    const level = corner();
    level.objects = [
      { id: 'desk2', x: 3, z: 3, rot: 2 }, // foran døren ned til gangen
      { id: 'laptop', x: 3, z: 3, rot: 2 }, // oppå pulten
      { id: 'plasticchair', x: 1, z: 1, rot: 2 }, // i hjørnet, ikke i veien
    ];
    expect(clearDoorways(level)).toBe(2);
    expect(level.objects.map((o) => o.id)).toEqual(['plasticchair']);
  });

  it('i genererte rom står ingenting på gulvet rett foran en døråpning', () => {
    for (const theme of ['backrooms', 'office', 'hotel', 'school', 'ward', 'basement', 'mall', 'playroom']) {
      for (const seed of [1, 2]) {
        const level = generateLevel({ theme, seed });
        const fronts = allDoors(level).flatMap(doorFronts);
        for (const o of level.objects) {
          const def = OBJECTS[o.id];
          if (def.mount || def.floats) continue;
          const [x0, z0, x1, z1] = objectBox(objectPose(level, o));
          const hit = fronts.find(([x, z]) => x0 < x + 0.95 && x1 > x + 0.05 && z0 < z + 0.95 && z1 > z + 0.05);
          expect(hit, `${theme} ${seed} ${o.id}`).toBeUndefined();
        }
      }
    }
  });
});
