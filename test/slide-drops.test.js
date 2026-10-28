import { describe, expect, it } from 'vitest';
import { createLevel, TILE } from '../src/core/level.js';
import { fillRect } from '../src/gen/util.js';
import { SLAB, ceilingAt, groundAt } from '../src/core/heights.js';
import { addSlide, slidePath, SLIDE } from '../src/core/slides.js';
import { insertStorey, copyStorey, storeyLevel, storeyElevations } from '../src/core/storeys.js';
import { walkLevels } from '../src/core/stairwells.js';
import { dropTarget, removeDropsAt } from '../src/core/slide-drops.js';
import { levelFromJSON, levelToJSON } from '../src/core/serialize.js';
import { seamSpans } from '../src/world/seams.js';

const W = 16;
const at = (x, z) => z * W + x;
/** Etasje 1 med et basseng (x 9–14, z 2–7), etasje 2 med gulv over det hele; sklie fra (3, 4) mot +x. */
function building() {
  const room = createLevel({ theme: 'pool', w: W, h: 10, height: 3 });
  fillRect(room, 1, 1, 14, 8, TILE.FLOOR);
  fillRect(room, 9, 2, 14, 7, TILE.WATER);
  room.depths.fill(15);
  const upper = copyStorey(room, 0);
  fillRect(upper, 1, 1, 14, 8, TILE.FLOOR);
  insertStorey(room, 1, upper);
  return room;
}
const points = [[3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4]];

describe('sklier ned fra etasjen over', () => {
  it('kjenner igjen en sklie fra gulvet her til bassenget under, og lagrer den der nede', () => {
    const room = building();
    expect(dropTarget(room, 1, points)).toBe(room);
    expect(dropTarget(room, 0, points)).toBeNull();
    expect(dropTarget(room, 1, points.slice(0, 4))).toBeNull(); // ender ikke over vann der nede
    expect(addSlide(room, points, true, 'red', true)).toBe(1);
    expect(room.slides[0]).toMatchObject({ drop: true, tube: true, color: 'red' });
    expect(room.ceilings.every((c) => c === 0)).toBe(true); // ingen høyere tak i rommet selv
    const back = levelFromJSON(JSON.parse(JSON.stringify(levelToJSON(room))));
    expect(back.slides[0].drop).toBe(true);
    expect(removeDropsAt(room, 3, 4)).toBe(1);
    expect(room.slides).toEqual([]);
  });

  it('er en vanlig sklie når banen går over et basseng i etasjen her, også med basseng rett under', () => {
    const room = building();
    const upper = storeyLevel(room, 1);
    fillRect(room.storeys[0], 11, 3, 13, 5, TILE.WATER); // et basseng her over bassenget under
    expect(dropTarget(room, 1, points)).toBeNull();
    expect(dropTarget(room, 1, points.slice(0, 9))).toBeNull(); // går over vannet her og ender før det
    // En sklie ned som er lagret før bassenget der oppe ble malt, lager ingen sjakt gjennom det.
    addSlide(room, points, false, 'blue', true);
    const { levels: [, top] } = walkLevels(room);
    expect(top.tiles[at(11, 4)]).toBe(TILE.WATER);
    expect(top.seams?.shaft.size ?? 0).toBe(0);
    expect(upper.tiles[at(3, 4)]).toBe(TILE.FLOOR);
  });

  it('starter i høyde med gulvet over, og går gjennom en sjakt i etasjeskillet', () => {
    const room = building();
    addSlide(room, points, false, 'blue', true);
    const gap = storeyElevations(room)[1];
    const { levels: [lower, upper] } = walkLevels(room);
    const path = slidePath(lower, lower.slides[0]);
    expect(path.problem).toBeNull();
    expect(path.h0).toBeCloseTo(gap);
    expect(groundAt(lower, 3.5, 4.5)).toBeCloseTo(gap);
    expect(groundAt(upper, 3.5, 4.5)).toBe(0);
    // Sjakten: vegg der oppe, åpent opp til taket der oppe her nede, og rennen får takhøyde overalt.
    const shaft = points.slice(1).filter(([x, z]) => upper.tiles[at(x, z)] === TILE.WALL);
    expect(shaft.length).toBeGreaterThan(0);
    expect(shaft[0]).toEqual([4, 4]);
    for (const [x, z] of shaft) expect(ceilingAt(lower, x, z)).toBeCloseTo(gap + 3);
    for (const p of path.samples) expect(ceilingAt(lower, Math.floor(p.x), Math.floor(p.z))).toBeGreaterThanOrEqual(p.y + SLIDE.CLEARANCE - 1e-6);
    expect(shaft.every(([x, z]) => ceilingAt(lower, x, z) > gap - SLAB)).toBe(true);
    // Toppen der oppe: åpen mot sjakten, uten egen gulvflate.
    const spans = [{ lo: 0, hi: 3, base: 0 }];
    expect(seamSpans(upper, at(3, 4), { dx: 1, dz: 0 }, spans)).toEqual([]);
    expect(upper.seams.noFloor.has(at(3, 4))).toBe(true);
    expect(storeyLevel(room, 1).tiles[at(4, 4)]).toBe(TILE.FLOOR); // rommet selv er urørt
  });
});
