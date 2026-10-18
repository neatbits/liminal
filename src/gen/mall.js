// Kjøpesenteret: butikker i to etasjer langs begge langsidene, gallerier (dekker) rundt et
// åpent atrium, en bro over atriet i andre etasje, fontener, trapper opp i hver ende og
// nødutganger i endeveggene.
import { TILE } from '../core/level.js';
import { autoLights, rectIndices } from '../core/ops.js';
import { fillZone } from '../core/zones.js';
import { placeStairs } from '../core/stairs.js';
import { DOOR, setDoor } from '../core/doors.js';
import { randInt } from '../core/rng.js';
import { getTheme } from '../core/themes.js';
import { fillInterior, fillRect } from './util.js';

export const MALL_DECK = 4.4; // gulvet i andre etasje

/**
 * Inndelingen for et rom på w × h: butikkdybde, galleribredde og atriet { x0, z0, x1, z1 },
 * eller atrium null når rommet er for lite til to etasjer.
 */
export function mallLayout(w, h) {
  const gallery = 4;
  const ends = w >= 24 ? 4 : 2;
  let shop = Math.max(4, Math.min(8, Math.floor(h * 0.2)));
  while (shop > 3 && h - 2 * (shop + gallery + 2) < 6) shop--;
  const z0 = 1 + shop + 1 + gallery;
  const z1 = h - 2 - shop - 1 - gallery;
  const x0 = 2 + ends;
  const x1 = w - 3 - ends;
  const atrium = z1 - z0 >= 3 && x1 - x0 >= 7 ? { x0, z0, x1, z1 } : null;
  return { shop, gallery, atrium };
}

/** Butikkrekke mellom x0 og x1 i båndet z0..z1, med front mot gangen i rad `front`. */
function shops(level, rand, x0, x1, z0, z1, front) {
  const doors = [];
  fillRect(level, x0, front, x1, front, TILE.WALL);
  let a = x0;
  while (a <= x1) {
    let b = a + randInt(rand, 4, 7) - 1;
    if (x1 - b < 5) b = x1; // ingen smal rest
    if (b < x1) fillRect(level, b + 1, z0, b + 1, z1, TILE.WALL);
    if (rand() < 0.2) {
      // Stengt butikk: hel front med én dør.
      const d = Math.floor((a + b) / 2);
      fillRect(level, d, front, d, front, TILE.DOOR);
      doors.push([d, front]);
    } else {
      fillRect(level, a + 1, front, b - 1, front, TILE.FLOOR); // åpen butikkfront
    }
    a = b + 2;
  }
  return doors;
}

export function mall(level, rand) {
  const { w, h } = level;
  fillInterior(level);
  const { shop, atrium } = mallLayout(w, h);
  if (!atrium) {
    autoLights(level, { spacing: getTheme(level.theme).lightSpacing, rand, flicker: 0.03, broken: 0.03 });
    return;
  }
  // Endeveggene er to ruter tykke, så det er plass til nødutganger (dører til ingensteds).
  fillRect(level, 1, 1, 1, h - 2, TILE.WALL);
  fillRect(level, w - 2, 1, w - 2, h - 2, TILE.WALL);
  const doors = [
    ...shops(level, rand, 2, w - 3, 1, shop, shop + 1),
    ...shops(level, rand, 2, w - 3, h - 1 - shop, h - 2, h - 2 - shop),
  ];
  // Andre etasje over alt unntatt atriet; en bro over midten av atriet.
  fillZone(level, 'deck', rectIndices(level, { x0: 2, z0: 1, x1: w - 3, z1: h - 2 }), MALL_DECK);
  const mid = Math.floor((atrium.x0 + atrium.x1) / 2);
  const bridge = atrium.x1 - atrium.x0 >= 16;
  for (const i of rectIndices(level, atrium)) {
    const x = i % w;
    if (!bridge || x < mid - 1 || x > mid + 1) level.decks[i] = 0;
  }
  // Søyler langs galleriets kant, under dekket.
  for (let x = atrium.x0; x <= atrium.x1; x += 6) {
    fillRect(level, x, atrium.z0 - 1, x, atrium.z0 - 1, TILE.PILLAR);
    fillRect(level, x, atrium.z1 + 1, x, atrium.z1 + 1, TILE.PILLAR);
  }
  // Fontener i hver halvdel av atriet, når det er plass.
  const ah = atrium.z1 - atrium.z0 + 1;
  const half = Math.floor((atrium.x1 - atrium.x0) / 4);
  if (ah >= 8 && half >= 4) {
    const fz0 = atrium.z0 + Math.floor(ah / 2) - 2;
    for (const cx of [atrium.x0 + half + 2, atrium.x1 - half - 2]) {
      fillRect(level, cx - 1, fz0, cx + 1, fz0 + 3, TILE.WATER);
      fillZone(level, 'depth', rectIndices(level, { x0: cx - 1, z0: fz0, x1: cx + 1, z1: fz0 + 3 }), 0.4);
    }
  }
  // Trapper fra atriegulvet opp til galleriet i hver ende (to ruter brede).
  const len = Math.max(4, Math.min(8, Math.floor((atrium.x1 - atrium.x0) / 3)));
  const sz = atrium.z0 + Math.floor(ah / 2) - 1;
  placeStairs(level, [atrium.x0 + len - 1, sz], [atrium.x0, sz], 2);
  placeStairs(level, [atrium.x1 - len + 1, sz], [atrium.x1, sz], 2);

  autoLights(level, { spacing: getTheme(level.theme).lightSpacing, rand, flicker: 0.03, broken: 0.04 });
  for (const z of [Math.floor(h / 2) - 1]) {
    setDoor(level, 1, z, DOOR.CLOSED);
    setDoor(level, w - 2, z, DOOR.CLOSED);
  }
  for (const [x, z] of doors) setDoor(level, x, z, rand() < 0.7 ? DOOR.CLOSED : DOOR.AJAR);
}
