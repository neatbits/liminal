// Sparsomme veggskilt som gir romtypene særpreg. Alle skilt deler én tekstur og én mesh.
// Bare rette, vindusfrie vegger ved vanlig gulv; ingen endring i romdata eller kollisjon.
import { TILE, getTile } from '../core/level.js';
import { floorAt, ceilingAt, deckAt, SLAB } from '../core/heights.js';
import { cornerShape } from '../core/corners.js';
import { windowInfo } from '../core/windows.js';
import { MeshData, faceQuad } from './mesher.js';
import { SIDES } from './caps.js';

export const SIGN_TEXTURES = { mall: 'mallSigns', playroom: 'playSigns', school: 'schoolSigns' };

export function buildWayfinding(level, field) {
  const out = new MeshData(field);
  if (!SIGN_TEXTURES[level.theme]) return out;
  const placed = [];
  for (let z = 1; z < level.h - 1; z++) for (let x = 1; x < level.w - 1; x++) {
    if (getTile(level, x, z) !== TILE.FLOOR || cornerShape(level, x, z)) continue;
    const hash = ((x * 73856093) ^ (z * 19349663)) >>> 0;
    if (hash % 13 || placed.length >= 24 || placed.some(([px, pz]) => (x - px) ** 2 + (z - pz) ** 2 < 36)) continue;
    const side = SIDES.find(({ dx, dz }) => getTile(level, x + dx, z + dz) === TILE.WALL
      && !windowInfo(level, x + dx, z + dz) && !cornerShape(level, x + dx, z + dz));
    if (!side) continue;
    const floor = floorAt(level, x, z);
    const top = deckAt(level, x, z) ? deckAt(level, x, z) - SLAB : ceilingAt(level, x, z);
    const y = floor + 2.05; // over skolens skap og lekerommets polstrede brystning
    if (top < y + 0.2) continue;
    const cx = x + 0.5 + side.dx * 0.492;
    const cz = z + 0.5 + side.dz * 0.492;
    const p = (s, h) => [cx + side.ux * s, h, cz + side.uz * s];
    const row = (hash >>> 8) % 4;
    const v = 1 - row / 4;
    faceQuad(out, [p(-0.46, y - 0.115), p(0.46, y - 0.115), p(0.46, y + 0.115), p(-0.46, y + 0.115)],
      side.n, [[0, v - 0.25], [1, v - 0.25], [1, v], [0, v]]);
    placed.push([x, z]);
  }
  return out;
}
