// Et sjeldent nivå i den uendelige utforskingen (gen/endless.js): en høy sal av rosa betong med
// gallerier langs begge vindusveggene, betongtrapper opp, en bro over midten og tunge søyler.
// Vinduene går fra gulvet nesten til taket og viser betongbyen langt nede (core/window-views.js).
// Ren logikk.
import { createLevel, TILE, LIGHT } from '../core/level.js';
import { autoLights, rectIndices } from '../core/ops.js';
import { fillZone } from '../core/zones.js';
import { placeStairs } from '../core/stairs.js';
import { paintWindows } from '../core/windows.js';
import { getTheme } from '../core/themes.js';
import { yawFromDir } from '../core/spawn.js';
import { fillInterior, fillRect } from './util.js';
import { exitCandidate } from './exits.js';
import { DOOR } from '../core/doors.js';
import { scaled } from './sizes.js';

export const BABBDI_THEME = 'babbdi';
export const BABBDI_DECK = 4.2; // galleriene
const GALLERY = 3; // ruter
const STAIRS = 8; // ruter i hvert trappeløp (ca. 0,5 m per rute)

/** Salen, med startpunkt i den ene enden og utganger i endeveggene. scale: gen/sizes.js. */
export function babbdiLevel(rand, name, scale = 1) {
  const w = scaled(40 + Math.floor(rand() * 3) * 8, scale, 30);
  const h = scaled(22 + Math.floor(rand() * 2) * 4, scale, 18);
  const level = createLevel({ theme: BABBDI_THEME, w, h, name });
  fillInterior(level);
  const g0 = GALLERY, g1 = h - 1 - GALLERY; // galleriradene inn mot salen
  const mid = Math.floor(w / 2);
  // Galleriene og broen over midten.
  fillZone(level, 'deck', rectIndices(level, { x0: 1, z0: 1, x1: w - 2, z1: g0 }), BABBDI_DECK);
  fillZone(level, 'deck', rectIndices(level, { x0: 1, z0: g1, x1: w - 2, z1: h - 2 }), BABBDI_DECK);
  fillZone(level, 'deck', rectIndices(level, { x0: mid - 1, z0: g0 + 1, x1: mid + 1, z1: g1 - 1 }), BABBDI_DECK);
  // Tunge søyler under galleriets kant, og frittstående midt i salen (ikke under broen).
  for (let x = 4; x < w - 3; x += 6) {
    fillRect(level, x, g0, x, g0, TILE.PILLAR);
    fillRect(level, x, g1, x, g1, TILE.PILLAR);
    const zc = Math.floor(h / 2);
    if (Math.abs(x - mid) > 3 && x > 6 && x < w - 7) fillRect(level, x, zc, x, zc, TILE.PILLAR);
  }
  // Trapper opp til galleriene: et repos foran toppen går over i galleriet.
  const north = { row: g0 + 1, from: 3, dir: 1 }, south = { row: g1 - 1, from: w - 4, dir: -1 };
  for (const { row, from, dir } of [north, south]) {
    const to = from + dir * (STAIRS - 1);
    fillZone(level, 'deck', [row * w + to + dir], BABBDI_DECK);
    placeStairs(level, [from, row], [to, row]);
  }
  // Vinduer langs begge langveggene, så byen synes på begge sider.
  const glazing = [];
  for (let x = 2; x < w - 2; x++) glazing.push([x, 0], [x, h - 1]);
  paintWindows(level, glazing, true);
  // Mest dagslys gjennom vinduene; noen taklamper, og noen av dem er døde.
  level.sky = rand() < 0.75 ? 'day' : 'golden';
  autoLights(level, { spacing: getTheme(BABBDI_THEME).lightSpacing, rand, broken: 0.35, flicker: 0.05 });
  for (let i = 0; i < level.tiles.length; i++) if (level.tiles[i] === TILE.STAIRS) level.lights[i] = LIGHT.NONE;
  level.spawn = { x: 1.5, z: h / 2, a: yawFromDir(1, 0) };
  // Utgangene i endeveggene, ikke i glassveggene: midt i den andre enden, og under galleriene her.
  for (const [x, z] of [[w - 1, Math.floor(h / 2)], [w - 1, 2], [0, 2], [0, h - 3]]) {
    if (!exitCandidate(level, x, z)) continue;
    const i = z * w + x;
    level.tiles[i] = TILE.DOOR;
    level.lights[i] = LIGHT.NONE;
    level.meta[i] = DOOR.CLOSED;
  }
  return level;
}
