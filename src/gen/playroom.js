// Lekerommet: store lekesaler med ballbinger (bassengruter fylt med baller), noen mindre
// rom bak dører og en sklie ned i den største ballbingen.
import { TILE } from '../core/level.js';
import { autoLights } from '../core/ops.js';
import { getTheme } from '../core/themes.js';
import { fillInterior, fillRect } from './util.js';
import { recursiveDivision } from './division.js';
import { hangDoors } from './doors.js';
import { addPoolSlide } from './slides.js';

const area = (r) => (r.x1 - r.x0 + 1) * (r.z1 - r.z0 + 1);

export function playroom(level, rand) {
  fillInterior(level);
  const leaves = recursiveDivision(level, rand, {
    minRoom: 6,
    wideChance: 0.6,
    wideWidth: 3,
    stopChance: 0.4,
    maxStopArea: 300,
  });
  const big = [];
  for (const r of leaves) {
    const a = area(r);
    // Små rom står tomme (garderobe, bod); halvparten av de større og alle salene får en ballbinge.
    if (a < 30 || rand() > (a > 100 ? 1 : 0.5)) continue;
    const inset = a > 100 ? 2 : 1;
    // Bingen er ofte mindre enn rommet, så det blir gulv til å gå rundt på.
    const sx = a > 160 ? Math.floor((r.x1 - r.x0) * 0.25 * rand()) : 0;
    const sz = a > 160 ? Math.floor((r.z1 - r.z0) * 0.25 * rand()) : 0;
    fillRect(level, r.x0 + inset + sx, r.z0 + inset + sz, r.x1 - inset - sx, r.z1 - inset - sz, TILE.WATER);
    if (inset === 2) big.push(r);
  }
  autoLights(level, { spacing: getTheme(level.theme).lightSpacing, rand, flicker: 0.04, broken: 0.05 });
  big.sort((a, b) => area(b) - area(a));
  for (const r of big) if (addPoolSlide(level, r, rand)) break;
  hangDoors(level, rand, { closed: 0.1, ajar: 0.3, open: 0.5 });
}
