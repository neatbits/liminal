// Vannsklier i Poolrooms: en plattform i et hjørne av bassengrommet, trapp opp langs
// veggen, en sklie som svinger ut i bassenget og høyt tak i hele rommet. Prøver hjørnene
// og banene etter tur og bruker den første som virker.
import { TILE, getTile } from '../core/level.js';
import { fillZone } from '../core/zones.js';
import { rectIndices } from '../core/ops.js';
import { placeStairs } from '../core/stairs.js';
import { addSlide, slideProblem, SLIDE_COLORS } from '../core/slides.js';

const STEP = 0.6; // stigning per trapperute
const ROOM_HEADROOM = 2.5; // takhøyde over plattformen i rommet med sklien

/**
 * @param room { x0, z0, x1, z1 } et rom med basseng og (minst) to ruter gulv rundt
 * @returns true hvis sklien ble lagt inn
 */
export function addPoolSlide(level, room, rand) {
  const corners = [
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ];
  // Plattformen er 1,2, 1,8 eller 2,4 m høy (to til fire trapperuter).
  const steps = 2 + Math.floor(rand() * 3);
  const height = steps * STEP;
  const start = Math.floor(rand() * 4);
  for (let k = 0; k < 4; k++) {
    const [fx, fz] = corners[(start + k) % 4];
    // Romlokale koordinater (i langs x, j langs z) speilet mot hjørnet.
    const at = (i, j) => [fx ? room.x1 - i : room.x0 + i, fz ? room.z1 - j : room.z0 + j];
    const deck = [at(0, 0), at(1, 0), at(0, 1), at(1, 1)];
    const stairs = Array.from({ length: steps }, (_, n) => at(0, 2 + n));
    const isFloor = ([x, z]) => getTile(level, x, z) === TILE.FLOOR;
    const isWall = ([x, z]) => getTile(level, x, z) === TILE.WALL;
    if (![...deck, ...stairs].every(isFloor)) continue;
    // Ingen åpning i veggen ved siden av plattformen og trappen.
    const outside = [at(0, -1), at(1, -1), ...Array.from({ length: steps + 2 }, (_, n) => at(-1, n))];
    if (!outside.every(isWall) || !isFloor(at(1, 1 + steps)) || !isFloor(at(0, 2 + steps))) continue;
    for (const straight of [2, 3, 4]) {
      for (const diagonal of [3, 4, 2]) {
        const points = [at(1, 1)];
        for (let s = 1; s <= straight; s++) points.push(at(1 + s, 1));
        for (let d = 1; d <= diagonal; d++) points.push(at(1 + straight + d, 1 + d));
        points.push(at(1 + straight + diagonal, 2 + diagonal));
        const water = getTile(level, ...points[points.length - 1]) === TILE.WATER;
        if (!water || !points.slice(1).every(([x, z]) => getTile(level, x, z) !== TILE.PILLAR)) continue;
        fillZone(level, 'floor', deck.map(([x, z]) => z * level.w + x), height);
        if (slideProblem(level, points)) {
          fillZone(level, 'floor', deck.map(([x, z]) => z * level.w + x), 0);
          continue;
        }
        placeStairs(level, stairs[steps - 1], stairs[0]);
        // Hele bassengrommet får høyt tak, ikke bare en kasse over sklien og plattformen.
        const ceiling = Math.max(level.height, height + ROOM_HEADROOM);
        fillZone(level, 'ceiling', rectIndices(level, room), ceiling);
        const colors = Object.keys(SLIDE_COLORS);
        addSlide(level, points, rand() < 0.5, colors[Math.floor(rand() * colors.length)]);
        return true;
      }
    }
  }
  return false;
}
