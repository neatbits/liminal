// Båsene i det åpne kontorlandskapet: en rygg av halvvegger med korte vegger ut til begge sider, og en pult
// i hver bås. Halvveggene settes inn før startpunktet (gen/furnish.js: furnishStructure), pultene sammen med
// resten av møblene (gen/furnish-rooms.js). Ren logikk.
import { TILE, getTile } from '../core/level.js';
import { MAX_OBJECTS, objectFits } from '../core/objects.js';
import { deskItem } from './desk-items.js';

const SPINE = 2; // halvvegger i ryggen (3 m per stykk)
const PITCH = [11, 10]; // minste avstand mellom klyngene (x, z)
const CLUSTER = SPINE + 2 * (SPINE + 1); // halvvegger per klynge
const MAX_WALLS = 48; // halvvegger skygger for lyset: hver ekstra koster bakingen

const fits = (level, list) => list.every((o) => objectFits(level, o, [...level.objects, ...list]));
const clear = (level, r, x0, z0, x1, z1) => {
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (x < r.x0 || x > r.x1 || z < r.z0 || z > r.z1 || getTile(level, x, z) !== TILE.FLOOR) return false;
  return true;
};

/** Halvveggene i ett åpent landskap. Husker båsene (r.pods) til pultene. */
export function cubicleWalls(level, r) {
  r.pods = [];
  // Klyngene spres jevnt over hele flaten, så mange som grensen tillater.
  let [cols, rows] = [Math.floor((r.x1 - r.x0 + 1) / PITCH[0]), Math.floor((r.z1 - r.z0 + 1) / PITCH[1])];
  while (cols * rows * CLUSTER > MAX_WALLS) cols > rows ? cols-- : rows--;
  let walls = 0;
  for (let row = 0; row < rows; row++) {
    const z = r.z0 + Math.floor(((row + 0.5) * (r.z1 - r.z0 + 1)) / rows);
    for (let col = 0; col < cols; col++) {
      const x = r.x0 + Math.floor(((col + 0.5) * (r.x1 - r.x0 + 1)) / cols) - SPINE * 2 + 1;
      if (!clear(level, r, x - 1, z - 4, x + SPINE * 3, z + 4)) continue;
      const list = [];
      for (let k = 0; k < SPINE; k++) list.push({ id: 'halfwall', x: x + 1 + k * 3, z, rot: 0 });
      for (let k = 0; k <= SPINE; k++) for (const s of [-1, 1]) list.push({ id: 'halfwall', x: x + k * 3, z: z + s * 2, rot: 1 });
      if (walls + list.length > MAX_WALLS || level.objects.length + list.length >= MAX_OBJECTS || !fits(level, list)) continue;
      level.objects = [...level.objects, ...list];
      walls += list.length;
      for (let k = 0; k < SPINE; k++) for (const s of [-1, 1]) r.pods.push({ x: x + 1 + k * 3, z: z + s, s });
    }
  }
  return walls;
}

/** En pult med ryggen mot halvveggen, noe på den, og en stol. */
export function podDesk(level, rand, { x, z, s }) {
  const off = [0.5, 0];
  const rot = s > 0 ? 0 : 2; // forsiden bort fra ryggen
  const desk = { id: rand() < 0.5 ? 'desk' : 'moderndesk', x, z, rot, off };
  const next = [...level.objects, desk];
  if (!objectFits({ ...level, objects: next }, desk, next)) return;
  level.objects = next;
  if (rand() < 0.7) deskItem(level, desk, ['pc', 'laptop', 'mug', 'desklamp', 'desklamp'][Math.floor(rand() * 5)]);
  const chair = { id: 'officechair', x, z: z + s, rot: s > 0 ? 2 : 0, off };
  const seats = [...level.objects, chair];
  if (rand() < 0.8 && objectFits({ ...level, objects: seats }, chair, seats)) level.objects = seats;
}
