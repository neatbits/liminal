// Uendelige nivåer: når man går gjennom en dør til ingensteds i gåmodus, havner man i et
// nytt, generert rom med et annet tema – «Level 1», «Level 2» … Av og til er det en lang korridor
// som er lengre innenfra enn utenfra, eller det samme rommet en gang til – nesten. Ren logikk.
import { THEME_IDS, getTheme } from '../core/themes.js';
import { cloneLevel } from '../core/level.js';
import { generateLevel } from './index.js';
import { corridorLevel, CORRIDOR_THEMES } from './corridors.js';
import { makeWrong } from './wrong.js';

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
 * Nivå nummer `depth` (1, 2, …) etter et rom med temaet `prevTheme`. Har alltid utganger videre.
 * current = rommet man kom fra: av og til (again) er neste nivå det samme rommet, med noen små
 * endringer. corridor: en lang gang med fast mønster (uendelig i gåmodus).
 * @returns {{ level, label, kind: 'room' | 'corridor' | 'again' }}
 */
export function nextLevel(depth, prevTheme, rand, current = null) {
  const r = rand();
  if (current && depth >= 2 && r < 0.15) {
    const level = cloneLevel(current);
    level.objects = [...(current.objects ?? [])];
    level.name = `Level ${depth}`;
    makeWrong(level, 'subtle', rand);
    return { level, label: getTheme(level.theme).label, kind: 'again' };
  }
  if (r < 0.35) {
    const options = CORRIDOR_THEMES.filter((id) => id !== prevTheme);
    const theme = options[Math.floor(rand() * options.length)];
    return { level: corridorLevel(theme, rand, `Level ${depth}`), label: getTheme(theme).label, kind: 'corridor' };
  }
  const theme = nextTheme(prevTheme, rand);
  const [w, h] = SIZES[theme] ?? [40, 36];
  const seed = 1 + Math.floor(rand() * 1e9);
  const level = generateLevel({ theme, w, h, seed, name: `Level ${depth}` });
  return { level, label: getTheme(theme).label, kind: 'room' };
}
