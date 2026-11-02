// Flyplassterminalen (core/themes-airport.js): planløsningene i gen/airport-layouts.js – den lange gangen med gater,
// innsjekkingshallen og bagasjehallen, alene eller to side om side. For små rom til dem blir én sal.
import { TILE } from '../core/level.js';
import { autoLights } from '../core/ops.js';
import { getTheme } from '../core/themes.js';
import { fillInterior } from './util.js';
import { buildLayout } from './layouts.js';

export function airport(level, rand, { layout } = {}) {
  const wanted = layout === 'gallery' ? 'concourse' : layout; // eksemplene (vary: false) får den lange gangen
  if (buildLayout(level, rand, { wanted, doors: { closed: 0.4, ajar: 0.3, open: 0.3 }, flicker: 0.03, broken: 0.04 })) return;
  fillInterior(level, TILE.FLOOR);
  autoLights(level, { spacing: getTheme(level.theme).lightSpacing, rand, flicker: 0.03, broken: 0.04 });
}
