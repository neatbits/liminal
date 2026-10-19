// Lekeklosser i lekerommet: små «byggverk» av myke klosser på åpent gulv – en portal (to søyler
// og en bjelke over), en plattform med en kube oppå, et tårn av kuber, en vegg med kuber rundt,
// eller trapp av klosser. Fysikken i gåmodus gjør at de kan dyttes og veltes. Ren logikk.
import { TILE, getTile } from '../core/level.js';
import { objectFits, objectsAt } from '../core/objects.js';

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
];

/** Er rektangelet (x, z)–(x + w − 1, z + h − 1), med en rute rundt, åpent gulv uten gjenstander? */
function clear(level, x, z, w, h) {
  for (let dz = -1; dz <= h; dz++) {
    for (let dx = -1; dx <= w; dx++) {
      if (getTile(level, x + dx, z + dz) !== TILE.FLOOR || objectsAt(level, x + dx, z + dz).length) return false;
    }
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
    const o = { id, x: x + (flip ? 3 - dx : dx), z: z + dz, rot, v: Math.floor(rand() * 8) };
    const next = [...(level.objects ?? []), o];
    if (!objectFits({ ...level, objects: next }, o, next)) continue;
    level.objects = next;
    n++;
  }
  return n;
}
