// Skrå og avrundede hjørner i genererte rom (core/corners.js), etter temaet: litt skrått i Level 0,
// på kontoret og i garasjen, avrundet i Poolrooms, lekerommet og kjøpesenteret. Bare med variasjon
// (vary) og eget frø, så romoppsettet ellers er det samme. Ingen hjørner der det står gjenstander,
// lys, startpunktet eller ved dører og trapper. Ren logikk.
import { TILE, getTile } from '../core/level.js';
import { CORNER, cornerCandidates, cornerShape, setCornerAt } from '../core/corners.js';
import { objectBox, poser } from '../core/objects.js';
import { isShopfront } from '../core/shopfronts.js';

// Per tema: [sjanse for skrått, sjanse for avrundet] per hjørne som kan formes.
const STYLE = {
  backrooms: [0.18, 0.04],
  office: [0.1, 0.02],
  garage: [0.15, 0],
  hotel: [0.08, 0.04],
  basement: [0.04, 0.04],
  pool: [0.05, 0.35],
  playroom: [0.05, 0.35],
  mall: [0.05, 0.25],
  school: [0.06, 0.03],
  ward: [0.08, 0.06],
};
const NONE = 0.35; // så ofte et nivå ikke får noen

/** Er ruten nær noe hjørnet ikke skal røre (dør, trapp, startpunkt)? */
function busy(level, x, z) {
  const sx = Math.floor(level.spawn?.x ?? -9);
  const sz = Math.floor(level.spawn?.z ?? -9);
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const t = getTile(level, x + dx, z + dz);
      if (t === TILE.DOOR || t === TILE.STAIRS || isShopfront(level, x + dx, z + dz) || (x + dx === sx && z + dz === sz)) return true;
    }
  }
  return false;
}

/** Former noen av hjørnene i rommet. Returnerer antall. */
export function shapeCorners(level, rand) {
  const [angled, round] = STYLE[level.theme] ?? [0.06, 0.03];
  if (rand() < NONE) return 0;
  // Protect the entire footprint, including thin wall boards spanning neighbouring cells.
  const occupied = new Set();
  const pose = poser(level);
  for (const o of level.objects) {
    const b = objectBox(pose(o));
    // Keep the end piers joined to structural partitions.
    if (o.id === 'halfwall') { b[0] -= .1; b[1] -= .1; b[2] += .1; b[3] += .1; }
    for (let z = Math.floor(b[1] + 0.02); z <= Math.floor(b[3] - 0.02); z++) {
      for (let x = Math.floor(b[0] + 0.02); x <= Math.floor(b[2] - 0.02); x++) occupied.add(z * level.w + x);
    }
  }
  let n = 0;
  for (const { x, z, k } of cornerCandidates(level)) {
    const i = z * level.w + x;
    const r = rand();
    if (r >= angled + round) continue;
    if (busy(level, x, z) || occupied.has(i)) continue;
    // Ikke ved siden av et annet formet hjørne (de ville gjort hverandre ugyldige).
    if ([i - 1, i + 1, i - level.w, i + level.w].some((j) => level.corners[j])) continue;
    if (level.tiles[i] === TILE.FLOOR && level.lights[i]) continue;
    setCornerAt(level, x, z, r < round ? CORNER.ROUND : CORNER.ANGLED, k);
    n++;
  }
  // Det som likevel ikke er gyldig, fjernes.
  for (let i = 0; i < level.corners.length; i++) {
    if (level.corners[i] && !cornerShape(level, i % level.w, Math.floor(i / level.w))) {
      level.corners[i] = 0;
      n--;
    }
  }
  return n;
}
