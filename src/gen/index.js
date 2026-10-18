// Inngang til generatorene: tilfeldige rom, maler for «Nytt rom» og ferdige eksempler.
import { createLevel, TILE } from '../core/level.js';
import { autoLights } from '../core/ops.js';
import { mulberry32 } from '../core/rng.js';
import { autoSpawn, yawFromDir } from '../core/spawn.js';
import { getTheme } from '../core/themes.js';
import { fillInterior } from './util.js';
import * as styles from './styles.js';
import { basement } from './basement.js';
import { playroom } from './playroom.js';
import { mall, mallLayout } from './mall.js';

const BY_THEME = {
  backrooms: styles.backrooms,
  pool: styles.pool,
  office: styles.office,
  garage: styles.garage,
  hotel: styles.hotel,
  basement,
  playroom,
  mall,
};

/** Tilfeldig rom i stilen til temaet. Samme frø gir samme rom. */
export function generateLevel({ theme = 'backrooms', w = 48, h = 48, seed = 1, name } = {}) {
  const level = createLevel({ theme, w, h, name: name ?? getTheme(theme).label });
  (BY_THEME[level.theme] ?? styles.backrooms)(level, mulberry32(seed));
  level.spawn = autoSpawn(level);
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
function makeMall() {
  const level = generateLevel({ theme: 'mall', w: 56, h: 40, seed: 7, name: 'The Mall' });
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
    hint: 'The classic yellow rooms. Damp carpet and endless humming.',
    make: () => generateLevel({ theme: 'backrooms', w: 56, h: 56, seed: 1007, name: 'Level 0' }),
  },
  {
    id: 'pools',
    name: 'The Poolrooms',
    hint: 'White tiles and still water. Sound carries a long way.',
    make: () => generateLevel({ theme: 'pool', w: 48, h: 48, seed: 21, name: 'The Poolrooms' }),
  },
  {
    id: 'office',
    name: 'The Office at 3 AM',
    hint: 'Meeting rooms, corridors and doors left ajar.',
    make: () => generateLevel({ theme: 'office', w: 48, h: 40, seed: 5, name: 'The Office at 3 AM' }),
  },
  {
    id: 'hotel',
    name: 'The Hotel Corridor',
    hint: 'Long corridors that keep turning. Every door looks the same.',
    make: () => generateLevel({ theme: 'hotel', w: 46, h: 46, seed: 9, name: 'The Hotel Corridor' }),
  },
  {
    id: 'garage',
    name: 'Parking Level P3',
    hint: 'Pillars, concrete and not a single car.',
    make: () => generateLevel({ theme: 'garage', w: 60, h: 48, seed: 3, name: 'Parking Level P3' }),
  },
  {
    id: 'basement',
    name: 'The Basement',
    hint: 'Clean carpet, white doors and warm lights. Nobody is home.',
    make: () => generateLevel({ theme: 'basement', w: 40, h: 30, seed: 12, name: 'The Basement' }),
  },
  {
    id: 'playroom',
    name: 'The Playroom',
    hint: 'Ball pits in red, green, yellow and blue. The slide is still warm.',
    make: () => generateLevel({ theme: 'playroom', w: 48, h: 40, seed: 4, name: 'The Playroom' }),
  },
  {
    id: 'mall',
    name: 'The Mall',
    hint: 'Two floors of shops around an empty atrium. Go upstairs and look down.',
    make: makeMall,
  },
  {
    id: 'corridor',
    name: 'The Endless Corridor',
    hint: '125 metres of hotel corridor. How long does it take to reach the end?',
    make: makeCorridor,
  },
];

export function presetById(id) {
  return PRESETS.find((p) => p.id === id) ?? null;
}
