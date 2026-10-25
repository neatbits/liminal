// Inngang til generatorene: tilfeldige rom, maler for «Nytt rom» og ferdige eksempler.
import { createLevel, TILE } from '../core/level.js';
import { autoLights } from '../core/ops.js';
import { mulberry32, randomSeed } from '../core/rng.js';
import { autoSpawn, yawFromDir } from '../core/spawn.js';
import { getTheme } from '../core/themes.js';
import { fillInterior } from './util.js';
import { addExits } from './exits.js';
import { furnish, furnishStructure } from './furnish.js';
import { addWindows } from './windows.js';
import * as styles from './styles.js';
import { basement } from './basement.js';
import { playroom } from './playroom.js';
import { mall, mallLayout } from './mall.js';
import { school, ward } from './building.js';
import { levelHeight, poolDepths, tallHalls } from './variety.js';
import { untangleDoors, clearDoorways } from './door-space.js';
import { shapeCorners } from './corners.js';
import { archways } from './arches.js';

const BY_THEME = {
  backrooms: styles.backrooms,
  pool: styles.pool,
  office: styles.office,
  garage: styles.garage,
  hotel: styles.hotel,
  basement,
  playroom,
  mall,
  school,
  ward,
};

/**
 * Tilfeldig rom i stilen til temaet. Samme frø gir samme rom. Rommet får noen utganger
 * (dører til ingensteds i ytterveggen) – i gåmodus fører de videre til et nytt nivå – og
 * gjenstander som passer til temaet (gen/furnish.js). Med vary varierer takhøyden og
 * bassengdybdene (gen/variety.js) – eksemplene bruker det ikke, så de er som de alltid har vært.
 */
export function generateLevel({ theme = 'backrooms', w = 48, h = 48, seed = 1, name, vary = true, layout } = {}) {
  const rand = mulberry32(seed ^ 0x4e16); // eget frø: romoppsettet er det samme som uten variasjon
  const height = vary ? levelHeight(theme, rand) : undefined;
  const level = createLevel({ theme, w, h, height, name: name ?? getTheme(theme).label });
  level.seed = seed; // vises i sidepanelet, så rommet kan lages igjen
  (BY_THEME[level.theme] ?? styles.backrooms)(level, mulberry32(seed),{layout:layout??(vary?undefined:'gallery')});
  furnishStructure(level, mulberry32(seed ^ 0x1a1f));
  if (vary && !getTheme(level.theme).pit) {
    poolDepths(level, rand);
    if (level.theme === 'pool') tallHalls(level, rand);
  }
  level.spawn = autoSpawn(level);
  // Eget frø, så rommene ellers blir som før.
  addExits(level, mulberry32(seed ^ 0x5eed), 3, level.spawn);
  untangleDoors(level); // dørblad som slår inn i hverandre
  if (vary) archways(level, mulberry32(seed ^ 0xa4c4)); // buede åpninger i Level 0 (ikke i eksemplene)
  furnish(level, mulberry32(seed ^ 0xf00d), level.spawn, { deepEnds: vary });
  clearDoorways(level); // ingen gjenstander foran døråpningene
  addWindows(level, mulberry32(seed ^ 0x51de));
  if (vary) shapeCorners(level, mulberry32(seed ^ 0xc0e2)); // skrå og avrundede hjørner (ikke i eksemplene)
  return level;
}

export const TEMPLATES = [
  { id: 'hall', label: 'One big room', hint: 'A single open hall with ceiling lights' },
  { id: 'random', label: 'Randomly generated', hint: "A room in the theme's style" },
  { id: 'empty', label: 'Empty', hint: 'Only walls – draw everything yourself' },
];

export function levelFromTemplate(template, { theme, w, h, seed, name }) {
  if (template === 'random') return generateLevel({ theme, w, h, seed, name });
  const level = createLevel({ theme, w, h, name });
  if (template === 'hall') {
    fillInterior(level, TILE.FLOOR);
    autoLights(level, { spacing: getTheme(level.theme).lightSpacing, state: 1 });
  }
  level.spawn = autoSpawn(level);
  return level;
}

/** Kjøpesenteret starter nede i atriet, med blikket langs atriet mot broen. */
function makeMall({ seed = randomSeed(), layout = 'auto' } = {}) {
  const level = generateLevel({ theme: 'mall', w: 56, h: 40, seed, layout, name: 'The Mall', vary: false });
  const { atrium } = mallLayout(level.w, level.h);
  level.spawn = { x: atrium.x0 + 10.5, z: (atrium.z0 + atrium.z1) / 2 + 3, a: yawFromDir(1, 0) };
  return level;
}

function makeCorridor() {
  const level = createLevel({ name: 'The Endless Corridor', theme: 'hotel', w: 128, h: 8 });
  styles.corridor(level);
  level.spawn = { x: 3.5, z: 4, a: yawFromDir(1, 0) };
  return level;
}

export const PRESETS = [
  {
    id: 'level0',
    name: 'Level 0',
    hint: 'The classic yellow rooms. Soft carpet and endless humming.',
    make: () => generateLevel({ theme: 'backrooms', w: 56, h: 56, seed: 1007, name: 'Level 0', vary: false }),
  },
  {
    id: 'pools',
    name: 'The Poolrooms',
    hint: 'White tiles and still water. Sound carries a long way.',
    make: () => generateLevel({ theme: 'pool', w: 48, h: 48, seed: 21, name: 'The Poolrooms', vary: false }),
  },
  {
    id: 'office',
    name: 'The Office at 3 AM',
    hint: 'Meeting rooms, corridors and doors left ajar.',
    // Klokka er tre om natta: mørke vinduer.
    make: () => Object.assign(generateLevel({ theme: 'office', w: 48, h: 40, seed: 5, name: 'The Office at 3 AM', vary: false }), { sky: 'night' }),
  },
  {
    id: 'hotel',
    name: 'The Hotel Corridor',
    hint: 'Long corridors that keep turning. Every door looks the same.',
    make: () => generateLevel({ theme: 'hotel', w: 46, h: 46, seed: 9, name: 'The Hotel Corridor', vary: false }),
  },
  {
    id: 'garage',
    name: 'Parking Level P3',
    hint: 'Pillars, concrete and not a single car.',
    make: () => generateLevel({ theme: 'garage', w: 60, h: 48, seed: 3, name: 'Parking Level P3', vary: false }),
  },
  {
    id: 'basement',
    name: 'The Basement',
    hint: 'Clean carpet, white doors and warm lights. Nobody is home.',
    make: () => generateLevel({ theme: 'basement', w: 40, h: 30, seed: 12, name: 'The Basement', vary: false }),
  },
  {
    id: 'playroom',
    name: 'The Playroom',
    hint: 'Ball pits in red, green, yellow and blue. The slide is still warm.',
    make: () => generateLevel({ theme: 'playroom', w: 48, h: 40, seed: 4, name: 'The Playroom', vary: false }),
  },
  {
    id: 'mall',
    name: 'The Mall',
    hint: 'Two floors of quiet shops. Explore changing galleries, cross courts and recessed storefronts.',
    make: makeMall,
  },
  {
    id: 'school',
    name: 'The School',
    hint: 'Lockers, linoleum and classrooms in the late afternoon sun. Nobody is coming back today.',
    make: () => Object.assign(generateLevel({ theme: 'school', w: 52, h: 40, seed: 6, name: 'The School', vary: false }), { sky: 'golden' }),
  },
  {
    id: 'ward',
    name: 'The Ward',
    hint: 'Closed doors, a pale green corridor and a monitor beeping somewhere.',
    make: () => Object.assign(generateLevel({ theme: 'ward', w: 48, h: 36, seed: 2, name: 'The Ward', vary: false }), { sky: 'dusk' }),
  },
  {
    id: 'corridor',
    name: 'The Endless Corridor',
    hint: '125 metres of hotel corridor. How long does it take to reach the end?',
    make: makeCorridor,
  },
];

export function presetById(id) {
  const preset = PRESETS.find((p) => p.id === id);
  if (preset) return preset;
  // Gamle direktelenker virker fortsatt, men variantene har ikke egne eksempelkort.
  const layout = id === 'mall-cross-court' ? 'cross-court' : id === 'mall-terraces' ? 'terraces' : null;
  return layout ? { id, make: () => generateLevel({ theme: 'mall', w: 64, h: 44, seed: 7,
    vary: false, layout, name: `The Mall – ${layout === 'terraces' ? 'Terraces' : 'Cross Court'}` }) } : null;
}
