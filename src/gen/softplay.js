// Lekeklosser i lekerommet: små «byggverk» av myke klosser på åpent gulv – en portal (to søyler
// og en bjelke over), en plattform med en kube oppå, et tårn av kuber, en vegg med kuber rundt,
// eller trapp av klosser. Fysikken i gåmodus gjør at de kan dyttes og veltes. Ren logikk.
import { TILE, getTile } from '../core/level.js';
import { OBJECTS, objectBox, objectFits, poser, MAX_OBJECTS } from '../core/objects.js';

// Hvert byggverk: [id, dx, dz, rot] relativt til ruten (x, z); klossene stables i rekkefølgen.
const BUILDS = [
  // Portal: to søyler med en bjelke over.
  [['softpillar', 0, 1, 0], ['softpillar', 2, 1, 0], ['softbeam', 1, 1, 0], ['softcube', 1, 2, 0]],
  // Plattform med en kube oppå og en søyle ved siden av.
  [['softblock', 0, 0, 0], ['softcube', 0, 0, 0], ['softpillar', 2, 1, 0]],
  // Tårn av tre kuber og en løs kube.
  [['softcube', 1, 1, 0], ['softcube', 1, 1, 0], ['softcube', 1, 1, 0], ['softcube', 2, 0, 0]],
  // Vegg med kuber foran.
  [['softslab', 1, 0, 0], ['softcube', 0, 1, 0], ['softcube', 2, 1, 0]],
  // Trapp: kube, plattform, søyle.
  [['softcube', 0, 1, 0], ['softblock', 1, 0, 0], ['softcube', 1, 0, 0], ['softpillar', 3, 0, 0]],
  // Bjelke lagt på tvers over to kuber.
  [['softcube', 0, 1, 0], ['softcube', 2, 1, 0], ['softbeam', 1, 1, 0]],
  // Low ramp/steps and loose round cushions alongside the older block structures.
  [['softramp', 0, 1, 0], ['softsteps', 2, 1, 0], ['softcylinder', 3, 0, 0]],
  [['softsteps', 0, 1, 0], ['softcylinder', 2, 1, 0], ['softramp', 3, 1, 2]],
];

/**
 * Er rektangelet (x, z)–(x + w − 1, z + h − 1), med en rute rundt, åpent gulv uten gjenstander
 * (ingen står i en av rutene eller dekker midten av den)?
 */
function clear(level, x, z, w, h) {
  for (let dz = -1; dz <= h; dz++) {
    for (let dx = -1; dx <= w; dx++) if (getTile(level, x + dx, z + dz) !== TILE.FLOOR) return false;
  }
  const pose = poser(level);
  for (const o of level.objects ?? []) {
    if (!OBJECTS[o.id]) continue;
    if (o.x >= x - 1 && o.x <= x + w && o.z >= z - 1 && o.z <= z + h) return false;
    // Rutene med midten inne i fotavtrykket: fra første til siste midtpunkt mellom kantene.
    const [x0, z0, x1, z1] = objectBox(pose(o));
    const [cx0, cx1] = [Math.floor(x0 - 0.5) + 1, Math.ceil(x1 - 0.5) - 1];
    const [cz0, cz1] = [Math.floor(z0 - 0.5) + 1, Math.ceil(z1 - 0.5) - 1];
    if (cx0 <= cx1 && cz0 <= cz1 && cx0 <= x + w && cx1 >= x - 1 && cz0 <= z + h && cz1 >= z - 1) return false;
  }
  return true;
}

/** Bygger et tilfeldig byggverk med hjørnet i (x, z). Returnerer antall klosser. */
export function softBuild(level, rand, x, z) {
  if (!clear(level, x, z, 4, 3)) return 0;
  const plan = BUILDS[Math.floor(rand() * BUILDS.length)];
  const flip = rand() < 0.5; // speilet, så de ikke ser like ut
  let n = 0;
  for (const [id, dx, dz, rot] of plan) {
    if (level.objects.length >= MAX_OBJECTS) break;
    const o = { id, x: x + (flip ? 3 - dx : dx), z: z + dz, rot, v: Math.floor(rand() * 8) };
    const next = [...(level.objects ?? []), o];
    if (!objectFits({ ...level, objects: next }, o, next)) continue;
    level.objects = next;
    n++;
  }
  return n;
}
