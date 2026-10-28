// Uendelige nivåer: når man går gjennom en dør til ingensteds i gåmodus, havner man i et
// nytt, generert rom med et annet tema – «Level 1», «Level 2» … Av og til er det en lang korridor
// som er lengre innenfra enn utenfra. Aldri det samme rommet igjen, og ingen vei tilbake. Ren logikk.
import { THEME_IDS, getTheme } from '../core/themes.js';
import { generateLevel } from './index.js';
import { corridorLevel, CORRIDOR_THEMES } from './corridors.js';
import { babbdiLevel, BABBDI_THEME } from './babbdi.js';
import { levelDims } from './sizes.js';
import { pickTint } from '../core/tints.js';
import { FLOOR_THEMES, stackFloors } from './floors.js';

const FLOORS_CHANCE = 0.2; // så ofte et nytt rom i FLOOR_THEMES får flere etasjer (gen/floors.js)
const TINT_CHANCE = 0.25; // så ofte et nytt rom får en egen lysfarge (core/tints.js)
const HALLS_CHANCE = 0.05; // betongsalene (gen/babbdi.js): sjeldne, fra Level 2, aldri to ganger på rad

/** Neste tema: et annet enn det forrige, tilfeldig blant resten. */
export function nextTheme(prev, rand) {
  const options = THEME_IDS.filter((id) => id !== prev);
  return options[Math.floor(rand() * options.length)];
}

/**
 * Nivå nummer `depth` (1, 2, …) etter et rom med temaet `prevTheme`. Har alltid utganger videre, og
 * er alltid et nytt rom med et annet tema enn det forrige. corridor: en lang gang med fast mønster
 * (uendelig i gåmodus); odds.corridor = sjansen (fra stemningen, gen/moods.js). scale = størrelsen
 * på nye rom og korridorer (gen/sizes.js, 1 = Medium).
 * Sjelden (HALLS_CHANCE, øverst i samme trekning, så de andre sjansene er uendret): betongsalene.
 * @returns {{ level, label, kind: 'room' | 'corridor' | 'halls' }}
 */
export function nextLevel(depth, prevTheme, rand, odds = { corridor: 0.2 }, scale = 1) {
  const r = rand();
  if (r < odds.corridor) {
    const options = CORRIDOR_THEMES.filter((id) => id !== prevTheme);
    const theme = options[Math.floor(rand() * options.length)];
    return { level: corridorLevel(theme, rand, `Level ${depth}`, scale), label: getTheme(theme).label, kind: 'corridor' };
  }
  if (depth >= 2 && prevTheme !== BABBDI_THEME && r >= 1 - HALLS_CHANCE) {
    return { level: babbdiLevel(rand, `Level ${depth}`, scale), label: getTheme(BABBDI_THEME).label, kind: 'halls' };
  }
  const theme = nextTheme(prevTheme, rand);
  const [w, h] = levelDims(theme, scale);
  const seed = 1 + Math.floor(rand() * 1e9);
  const level = generateLevel({ theme, w, h, seed, name: `Level ${depth}` });
  if (rand() < TINT_CHANCE) level.tint = pickTint(rand);
  // Av og til et bygg med flere nesten like etasjer og trapper mellom dem (gen/floors.js).
  if (FLOOR_THEMES.includes(theme) && rand() < FLOORS_CHANCE) stackFloors(level, rand, 1 + Math.floor(rand() * 2));
  return { level, label: getTheme(theme).label, kind: 'room' };
}
