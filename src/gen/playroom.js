// Lekerommet: store lekesaler med ballbinger, hoppeslott og lekeutstyr.
// Tre varianter: stor ballbinge (A, 40 %), hjørnebinger (B, 35 %), åpen lekesal (C, 25 %).
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
  // v bestemmer variant én gang og brukes to steder (divisjon og bingeplassering).
  const v = rand();
  const openPlay = v >= 0.75; // variant C: åpen sal
  const leaves = recursiveDivision(level, rand, {
    minRoom: 6,
    wideChance: openPlay ? 0.75 : 0.60,
    wideWidth: openPlay ? 4 : 3,
    stopChance: openPlay ? 0.55 : 0.40,
    maxStopArea: 300,
  });

  const big = []; // rom som kan få en sklie (bare variant A)
  for (const r of leaves) {
    const a = area(r);
    const rw = r.x1 - r.x0, rh = r.z1 - r.z0;

    if (v < 0.40) {
      // A: klassisk – stor sentral ballbinge, sklie i det største rommet.
      if (a < 30 || rand() > (a > 100 ? 1 : 0.5)) continue;
      const inset = a > 100 ? 2 : 1;
      const sx = a > 160 ? Math.floor(rw * 0.30 * rand()) : 0;
      const sz = a > 160 ? Math.floor(rh * 0.30 * rand()) : 0;
      fillRect(level, r.x0 + inset + sx, r.z0 + inset + sz, r.x1 - inset - sx, r.z1 - inset - sz, TILE.WATER);
      if (inset === 2) big.push(r);
    } else if (v < 0.75) {
      // B: hjørnebinger – 2–3 kompakte binger i romhjørnene, åpent midtparti.
      if (a < 40) continue;
      const pw = Math.max(3, Math.floor(rw * (0.25 + rand() * 0.15)));
      const ph = Math.max(3, Math.floor(rh * (0.25 + rand() * 0.15)));
      const corners = [
        [r.x0 + 1, r.z0 + 1, r.x0 + pw,     r.z0 + ph],
        [r.x1 - pw, r.z0 + 1, r.x1 - 1,      r.z0 + ph],
        [r.x0 + 1, r.z1 - ph, r.x0 + pw,     r.z1 - 1],
        [r.x1 - pw, r.z1 - ph, r.x1 - 1,     r.z1 - 1],
      ].sort(() => rand() - 0.5);
      const n = 2 + (rand() < 0.4 ? 1 : 0);
      for (let i = 0; i < n; i++) fillRect(level, ...corners[i], TILE.WATER);
    } else {
      // C: åpen lekesal – bare noen av de minste rommene får en liten binge.
      if (a < 25 || a > 70 || rand() > 0.55) continue;
      fillRect(level, r.x0 + 1, r.z0 + 1, r.x1 - 1, r.z1 - 1, TILE.WATER);
    }
  }

  autoLights(level, { spacing: getTheme(level.theme).lightSpacing, rand, flicker: 0.04, broken: 0.05 });
  big.sort((a, b) => area(b) - area(a));
  for (const r of big) if (addPoolSlide(level, r, rand)) break;
  hangDoors(level, rand, { closed: 0.1, ajar: 0.3, open: 0.5 });
}
