// Hauger av trestoler i Level 0: to stoler på siden ved siden av hverandre, én på ryggen oppå beina
// deres (ligger på ryggstøet, egne bein i været), og av og til en som står og en som har veltet ved siden av. Stolene har fysikk (loose) og ligger i
// startstillingen fra o.tip/o.lift/o.off (core/object-tip.js) til man dytter borti dem. Ren logikk.
import { TILE, getTile } from '../core/level.js';
import { OBJECTS, objectsAt, MAX_OBJECTS } from '../core/objects.js';
import { TIP } from '../core/object-tip.js';

export const PILE_CHAIR = 'woodenchair';

/**
 * Stolene i haugen, sett fra midten av 2 × 2 ruter: [x, z, rot, tip, oppå, sjanse]. oppå: ligger på de
 * to stolene på siden (løftet like høyt som en stol er bred). Prøvd i fysikken (test/chair-piles.test.js):
 * øverst på en stol som ligger, er det bare beina (i den ene enden) – stolen oppå må ligge på dem i
 * begge, ellers vipper den av.
 */
const PILE = [
  [0, -0.25, 0, TIP.SIDE, false, 1],
  [0, 0.25, 0, TIP.SIDE, false, 1], // samme vei: beina til begge ligger øverst i samme ende
  [0.27, 0, 0, TIP.BACK, true, 1], // oppå beina til begge, på langs
  [0.8, -0.75, 3, TIP.UP, false, 0.6],
  [-0.75, 0.45, 0, TIP.BACK, false, 0.6],
];

/** Haugen i blokken (x, z) – (x + 1, z + 1). @returns antall stoler, 0 hvis blokken ikke er ledig. */
export function chairPile(level, rand, x, z) {
  const cells = [[x, z], [x + 1, z], [x, z + 1], [x + 1, z + 1]];
  if (cells.some(([cx, cz]) => getTile(level, cx, cz) !== TILE.FLOOR || objectsAt(level, cx, cz).length)) return 0;
  if (level.objects.length + PILE.length > MAX_OBJECTS) return 0;
  const [width] = OBJECTS[PILE_CHAIR].size; // stolen på siden er så høy som den er bred
  const turn = Math.floor(rand() * 4); // hele haugen dreies
  const a = (-turn * Math.PI) / 2;
  const chairs = [];
  for (const [lx, lz, rot, tip, onTop, chance] of PILE) {
    if (rand() >= chance) continue;
    const wx = x + 1 + lx * Math.cos(a) + lz * Math.sin(a);
    const wz = z + 1 - lx * Math.sin(a) + lz * Math.cos(a);
    const [cx, cz] = [Math.floor(wx), Math.floor(wz)];
    if (getTile(level, cx, cz) !== TILE.FLOOR) continue; // kanten av haugen havnet i en vegg
    const off = [Math.round((wx - cx - 0.5) * 1000) / 1000, Math.round((wz - cz - 0.5) * 1000) / 1000];
    chairs.push({ id: PILE_CHAIR, x: cx, z: cz, rot: (rot + turn) & 3, ...(tip ? { tip } : {}), ...(onTop ? { lift: width } : {}), off });
  }
  level.objects = [...level.objects, ...chairs];
  return chairs.length;
}
