// Uendelige nivåer: når man går gjennom en dør til ingensteds i gåmodus, havner man i et
// nytt, generert rom med et annet tema – «Level 1», «Level 2» … Ren logikk.
import { THEME_IDS, getTheme } from '../core/themes.js';
import { generateLevel } from './index.js';

// Størrelse per tema: store nok til å utforske, små nok til å bygges raskt.
const SIZES = {
  mall: [52, 38],
  hotel: [40, 40],
  garage: [48, 40],
  basement: [36, 28],
};

/** Neste tema: et annet enn det forrige, tilfeldig blant resten. */
export function nextTheme(prev, rand) {
  const options = THEME_IDS.filter((id) => id !== prev);
  return options[Math.floor(rand() * options.length)];
}

/**
 * Nivå nummer `depth` (1, 2, …) etter et rom med temaet `prevTheme`. Har alltid utganger
 * videre (generateLevel legger dem inn).
 */
export function nextLevel(depth, prevTheme, rand) {
  const theme = nextTheme(prevTheme, rand);
  const [w, h] = SIZES[theme] ?? [40, 36];
  const seed = 1 + Math.floor(rand() * 1e9);
  const level = generateLevel({ theme, w, h, seed, name: `Level ${depth}` });
  return { level, label: getTheme(theme).label };
}
