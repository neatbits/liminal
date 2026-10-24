// Kjøpesenteret: butikker i to etasjer langs begge langsidene, gallerier (dekker) rundt et
// åpent atrium, en bro over atriet i andre etasje, fontener, rulletrapper i hver ende og
// nødutganger i endeveggene. Butikkene får teppe og ryddig innredning (mall-shops.js).
import { TILE } from '../core/level.js';
import { autoLights, rectIndices } from '../core/ops.js';
import { fillZone } from '../core/zones.js';
import { placeEscalator } from '../core/escalators.js';
import { DOOR, setDoor } from '../core/doors.js';
import { getTheme } from '../core/themes.js';
import { fillInterior, fillRect } from './util.js';
import { furnishShops } from './mall-shops.js';
import { arcadeLayout, prepareArcades } from './mall-arcades.js';
import { mallShopRows } from './mall-shop-layout.js';

export const MALL_DECK = 4.4; // gulvet i andre etasje

/**
 * Inndelingen for et rom på w × h: butikkdybde, galleribredde og atriet { x0, z0, x1, z1 },
 * eller atrium null når rommet er for lite til to etasjer.
 */
export function mallLayout(w, h) {
  const gallery = 4;
  const ends = w >= 24 ? 4 : 2;
  let shop = Math.max(4, Math.min(10, Math.floor(h * 0.24)));
  while (shop > 3 && h - 2 * (shop + gallery + 2) < 6) shop--;
  const z0 = 1 + shop + 1 + gallery;
  const z1 = h - 2 - shop - 1 - gallery;
  const x0 = 2 + ends;
  const x1 = w - 3 - ends;
  const atrium = z1 - z0 >= 3 && x1 - x0 >= 7 ? { x0, z0, x1, z1 } : null;
  return { shop, gallery, atrium };
}

export function mall(level, rand, {layout}={}) {
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
  const arcades = arcadeLayout(level, shop);
  prepareArcades(level, arcades);
  const rows = mallShopRows(level, rand, shop, arcades, layout);
  const doors = rows.flatMap((r) => r.doors);
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
  const ah = atrium.z1 - atrium.z0 + 1;
  const sz = atrium.z0 + Math.floor(ah / 2) - 1;
  // Fontenene ligger på siden av trafikkaksen, med to hele gulvrader mellom vann og
  // rulletrappene. Velg den romsligste siden; utelat fontener når det blir for trangt.
  const half = Math.floor((atrium.x1 - atrium.x0) / 4);
  const north = { z0: atrium.z0, z1: sz - 3 };
  const south = { z0: sz + 4, z1: atrium.z1 };
  const band = south.z1 - south.z0 > north.z1 - north.z0 ? south : north;
  const fountainDepth = Math.min(4, band.z1 - band.z0 + 1);
  if (fountainDepth >= 2 && half >= 4) {
    const fz0 = band.z0 + Math.floor((band.z1 - band.z0 + 1 - fountainDepth) / 2);
    const fz1 = fz0 + fountainDepth - 1;
    for (const cx of [atrium.x0 + half + 2, atrium.x1 - half - 2]) {
      fillRect(level, cx - 1, fz0, cx + 1, fz1, TILE.WATER);
      fillZone(level, 'depth', rectIndices(level, { x0: cx - 1, z0: fz0, x1: cx + 1, z1: fz1 }), 0.4);
    }
  }
  // Rulletrapper fra atriet til galleriet: vest opp, øst ned (to ruter brede).
  const len = Math.max(4, Math.min(8, Math.floor((atrium.x1 - atrium.x0) / 3)));
  placeEscalator(level, [atrium.x0 + len - 1, sz], [atrium.x0, sz], 2);
  placeEscalator(level, [atrium.x1 - len + 1, sz], [atrium.x1, sz], 2, true);

  autoLights(level, { spacing: getTheme(level.theme).lightSpacing, rand, flicker: 0.03, broken: 0.04 });
  for (const z of [Math.floor(h / 2) - 1]) {
    setDoor(level, 1, z, DOOR.CLOSED);
    setDoor(level, w - 2, z, DOOR.CLOSED);
  }
  for (const [x, z] of doors) setDoor(level, x, z, rand() < 0.7 ? DOOR.CLOSED : DOOR.AJAR);
  furnishShops(level, rand, rows.flatMap((r) => r.list));
}
