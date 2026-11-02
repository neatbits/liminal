// Noclip (view3d/noclip.js): en helt vanlig møbelbutikk med et lager bak, og en firkant tegnet på lagerveggen som man
// kan gå gjennom – inn i Level 0. Derfra går det bare innover, og det blir rarere jo lenger inn man kommer. Butikken er
// fast oppsatt, så den er lik hver gang. Ren logikk.
import { TILE, LIGHT, getTile, createLevel } from '../core/level.js';
import { autoLights, rectIndices } from '../core/ops.js';
import { DOOR, setDoor } from '../core/doors.js';
import { yawFromDir } from '../core/spawn.js';
import { paintWindows } from '../core/windows.js';
import { fillZone, FINISH } from '../core/zones.js';
import { objectsAt } from '../core/objects.js';
import { fillRect } from './util.js';

export const NOCLIP = {
  PUSH: 0.6, // s man må lene seg mot veggen før man glir gjennom
  REACH: 0.45, // m fra veggen (man står ca. 0,3 m unna når man går inn i den)
  MARK: 'noclipmark',
};

const [W, H] = [34, 26];
const BACK = 16; // veggen mellom butikken og lageret
const STAFF = 7; // veggen mellom lageret og personaltoalettet

/** Utstillingene: [id, x, z, rot]. Stuer, et soverom, en spisestue, et hjemmekontor, hyller og planter. */
const SHOWROOM = [
  ['sofa', 5, 13, 2], ['table', 5, 11, 0], ['tvbench', 5, 9, 0], ['armchair', 8, 11, 1], ['pottedplant', 2, 14, 1],
  ['double_bed', 13, 14, 2], ['nightstand', 11, 15, 2], ['nightstand', 15, 15, 2], ['desklamp', 11, 15, 2],
  ['table', 20, 12, 1], ['woodenchair', 19, 12, 3], ['woodenchair', 21, 12, 1], ['pottedplant', 23, 14, 3],
  ['desk2', 4, 4, 0], ['officechair', 4, 5, 2], ['bookshelf', 1, 7, 3], ['bookshelf', 1, 10, 3],
  ['pottedplant', 10, 2, 0], ['yucca', 16, 7, 0], ['armchair', 23, 8, 0], ['armchair', 27, 8, 0], ['pottedplant', 25, 8, 0],
  ['counter', 28, 5, 0], ['counter', 30, 5, 0], ['register', 28, 5, 2], ['cashier', 28, 4, 0], ['clock', 16, 15, 2],
];
const STOREROOM = [['toilet', 2, 24, 2], ['sink', 4, 24, 2], ['mirror', 4, 24, 2]];

/** Den vanlige butikken. level.noclip = { x, z, dx, dz }: ruten foran firkanten og retningen mot veggen. */
export function storeLevel() {
  const level = createLevel({ theme: 'store', w: W, h: H, height: 3.2, name: 'The Store' });
  fillRect(level, 1, 1, W - 2, BACK - 1, TILE.FLOOR);
  fillRect(level, 1, BACK + 1, W - 2, H - 2, TILE.FLOOR);
  fillRect(level, STAFF, BACK + 1, STAFF, H - 2, TILE.WALL);
  for (const [x, z] of [[26, BACK], [STAFF, 21]]) {
    fillRect(level, x, z, x, z, TILE.DOOR);
    setDoor(level, x, z, DOOR.CLOSED);
  }
  // Lageret har betonggulv og -vegger (temaets belegg).
  fillZone(level, 'finish', rectIndices(level, { x0: STAFF + 1, z0: BACK + 1, x1: W - 2, z1: H - 2 }), FINISH.TILES);
  paintWindows(level, Array.from({ length: W - 4 }, (_, k) => [k + 2, 0]), true);
  level.sky = 'day';
  autoLights(level, { spacing: 3, state: LIGHT.ON });
  level.objects = SHOWROOM.concat(STOREROOM).map(([id, x, z, rot]) => ({ id, x, z, rot }));
  for (let z = BACK + 2; z <= H - 4; z += 3) {
    for (let x = STAFF + 3; x <= W - 4; x += 3) level.objects.push({ id: 'shelf', x, z, rot: 0 });
  }
  const mark = { x: 20, z: H - 2, dx: 0, dz: 1 };
  level.objects.push({ id: NOCLIP.MARK, x: mark.x, z: mark.z, rot: 2 });
  level.noclip = mark;
  level.spawn = { x: W / 2 + 0.5, z: 3.5, a: yawFromDir(0, 1) };
  return level;
}

/** Der man kommer ut i butikken igjen: foran firkanten, med ryggen mot den. */
export const storeReturn = (level) => ({ x: level.noclip.x + 0.5, z: level.noclip.z + 0.5 - level.noclip.dz * 0.4, a: yawFromDir(-level.noclip.dx, -level.noclip.dz) });

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const ROT = { '0,1': 0, '-1,0': 1, '0,-1': 2, '1,0': 3 }; // forsiden (FACING) for en veggretning motsatt (dx, dz)

/**
 * Firkanten på veggen på det første nivået, så man kan gå tilbake: på en vegg nær startpunktet, og man står foran den
 * med ryggen mot. Returnerer false når det ikke finnes noen ledig vegg (da går man bare videre).
 */
export function markWall(level) {
  const start = [Math.floor(level.spawn.x), Math.floor(level.spawn.z)];
  const seen = new Set([start.join()]);
  const queue = [start];
  for (let k = 0; k < queue.length && k < 4000; k++) {
    const [x, z] = queue[k];
    if (getTile(level, x, z) !== TILE.FLOOR) continue;
    for (const [dx, dz] of DIRS) {
      const i = (z + dz) * level.w + x + dx;
      if (getTile(level, x + dx, z + dz) !== TILE.WALL || level.meta[i] || level.floors[z * level.w + x] || objectsAt(level, x, z).length) continue;
      if (getTile(level, x - dx, z - dz) !== TILE.FLOOR) continue; // plass til å stå foran
      level.objects = [...level.objects, { id: NOCLIP.MARK, x, z, rot: ROT[`${-dx},${-dz}`] }];
      level.noclip = { x, z, dx, dz };
      level.spawn = { x: x + 0.5 - dx * 0.1, z: z + 0.5 - dz * 0.1, a: yawFromDir(-dx, -dz) };
      return true;
    }
    for (const [dx, dz] of DIRS) {
      const key = `${x + dx},${z + dz}`;
      if (!seen.has(key)) { seen.add(key); queue.push([x + dx, z + dz]); }
    }
  }
  return false;
}

/** Står man helt inntil firkanten og lener seg mot den? walker: { x, z, yaw }. */
export function againstMark(mark, { x, z, yaw }) {
  if (!mark) return false;
  const { x: mx, z: mz, dx, dz } = mark;
  const face = dx ? mx + (dx > 0 ? 1 : 0) : mz + (dz > 0 ? 1 : 0); // veggflaten
  const gap = dx ? (face - x) * dx : (face - z) * dz;
  const side = dx ? Math.abs(z - (mz + 0.5)) : Math.abs(x - (mx + 0.5));
  const facing = -Math.sin(yaw) * dx - Math.cos(yaw) * dz; // blikket mot veggen (Walker: fremover = (−sin, −cos))
  return gap >= 0 && gap < NOCLIP.REACH && side < 0.45 && facing > 0.7;
}

/** Stemningen etter hvor langt inn man er: stille først, så forlatt, så feil. Skikkelsen viser seg, men tar deg aldri. */
export function noclipMood(depth) {
  return depth <= 2 ? 'liminal' : depth <= 5 ? 'abandoned' : 'uncanny';
}

/** Rekordene: { runs, bestDepth, bestDistance } (meter innover fra veggen i butikken). */
export function recordNoclip(records = {}, { depth, distance = 0 }) {
  return { runs: (records.runs ?? 0) + 1, bestDepth: Math.max(records.bestDepth ?? 0, depth), bestDistance: Math.max(records.bestDistance ?? 0, Math.round(distance)) };
}
