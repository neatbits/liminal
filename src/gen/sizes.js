// Størrelsen på de uendelige nivåene (settings.levelSize): Small → Medium → Large → Huge. Skalaen
// ganges med grunnstørrelsen per tema (og lengden på korridornivåene). Ren logikk.
import { clampSize } from '../core/level.js';

export const LEVEL_SIZES = {
  small: { label: 'Small', scale: 0.6 },
  medium: { label: 'Medium', scale: 1 },
  large: { label: 'Large', scale: 1.5 },
  huge: { label: 'Huge', scale: 2.2 },
};

export const LEVEL_SIZE_IDS = Object.keys(LEVEL_SIZES);
export const DEFAULT_LEVEL_SIZE = 'medium';

// Grunnstørrelse per tema: store nok til å utforske, små nok til å bygges raskt.
const BASE = {
  mall: [52, 38],
  hotel: [40, 40],
  garage: [48, 40],
  basement: [36, 28],
  airport: [56, 40], // lange ganger og store haller
};
const FALLBACK = [40, 36];
const MIN = 18; // mindre enn dette blir det knapt et rom igjen etter vegger og utganger

export function getLevelSize(id) {
  return LEVEL_SIZES[id] ?? LEVEL_SIZES[DEFAULT_LEVEL_SIZE];
}

/** Lengde (eller bredde) ganget med skalaen, innenfor kartets grenser. */
export function scaled(n, scale, min = MIN) {
  return clampSize(Math.max(min, Math.round(n * scale)));
}

/**
 * [w, h] for et nytt nivå i de uendelige nivåene: samme grunnstørrelse, men hvert nivå er litt større
 * eller mindre (0,75–1,3) og litt mer avlangt, innenfor det Small og Huge gir for temaet.
 */
export function variedDims(theme, scale, rand) {
  const [w, h] = BASE[theme] ?? FALLBACK;
  const size = scale * (0.75 + rand() * 0.55);
  const shape = 0.8 + rand() * 0.45;
  const fit = (s) => Math.max(LEVEL_SIZES.small.scale, Math.min(LEVEL_SIZES.huge.scale, s));
  return [scaled(w, fit(size * shape)), scaled(h, fit(size / shape))];
}

/** [w, h] for et generert nivå i temaet med skalaen (1 = Medium). */
export function levelDims(theme, scale = 1) {
  const [w, h] = BASE[theme] ?? FALLBACK;
  return [scaled(w, scale), scaled(h, scale)];
}
