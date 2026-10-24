// Sparsomt med ekte fysikkballer; antallet vokser ikke uten grense i store lekerom.
import { TILE, getTile } from '../core/level.js';
import { objectFits, objectBox, poser, MAX_OBJECTS } from '../core/objects.js';
import { PLAY_BALL_LIMIT } from '../core/play-balls.js';
import { doorFrontCells } from './door-space.js';

export function scatterPlayBalls(level, rand, spawn = level.spawn) {
  if (level.theme !== 'playroom') return 0;
  const initial = level.objects.filter((o) => o.id === 'playball').length;
  let budget = Math.max(0, PLAY_BALL_LIMIT - initial), added = 0;
  const fronts = new Set(doorFrontCells(level).map(([x, z]) => z * level.w + x));
  // Beregn møblenes fotavtrykk én gang, ikke alle positurer på nytt for hver gulvrute.
  const occupied = new Set(), poseOf = poser(level);
  for (const o of level.objects) {
    const box = objectBox(poseOf(o));
    for (let z = Math.floor(box[1]); z <= Math.floor(box[3]); z++) for (let x = Math.floor(box[0]); x <= Math.floor(box[2]); x++) occupied.add(z * level.w + x);
  }
  const floor = [], pit = [];
  for (let z = 1; z < level.h - 1; z++) for (let x = 1; x < level.w - 1; x++) {
    const tile = getTile(level, x, z);
    if (tile !== TILE.FLOOR && tile !== TILE.WATER) continue;
    if (fronts.has(z * level.w + x) || Math.hypot(x + 0.5 - spawn.x, z + 0.5 - spawn.z) < 3) continue;
    if (occupied.has(z * level.w + x)) continue;
    (tile === TILE.FLOOR ? floor : pit).push([x, z]);
  }
  const fill = (spots, target) => {
    for (let count = 0; count < target && spots.length && budget; ) {
      const [x, z] = spots.splice(Math.floor(rand() * spots.length), 1)[0];
      const o = { id: 'playball', x, z, rot: 0, v: Math.floor(rand() * 4) };
      const next = [...level.objects, o];
      if (next.length > MAX_OBJECTS || !objectFits(level, o, next)) continue;
      level.objects = next;
      count++; added++; budget--;
    }
  };
  fill(floor, Math.min(24, Math.max(4, Math.round(floor.length / 110))));
  fill(pit, Math.min(24, Math.max(2, Math.round(pit.length / 35))));
  return added;
}
