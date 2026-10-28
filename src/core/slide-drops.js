// Sklier ned fra etasjen over (core/slides.js, slide.drop): sklien lagres i etasjen med bassenget, men
// starter på gulvet i etasjen over. I etasjene slik de bygges og gås i (walkLevels) ligger startruten i
// høyde med gulvet der oppe (en åpning, core/storey-seams.js), og der rennen går gjennom etasjeskillet
// er det en sjakt: åpen opp til taket i etasjen under, vegg i etasjen over. Man setter seg i sklien i
// etasjen over og havner i bassenget under (view3d/storeys.js). Ren logikk.
import { TILE, getTile } from './level.js';
import { SLAB, ceilingAt } from './heights.js';
import { SLIDE, slidePath, slidesAt } from './slides.js';
import { storeyLevel } from './storeys.js';
import { dm, opening, shaft } from './storey-seams.js';

/** Retningen fra startruten mot neste rute i banen (langs den største aksen), eller null. */
function towards(points) {
  const [sx, sz] = points[0];
  const next = points.find(([x, z]) => x !== sx || z !== sz);
  if (!next) return null;
  const [dx, dz] = [next[0] - sx, next[1] - sz];
  return Math.abs(dx) >= Math.abs(dz) ? [Math.sign(dx), 0] : [0, Math.sign(dz)];
}

/** Lager åpningene og sjaktene for skliene ned fra etasjen over, i etasjene fra walkLevels. */
export function applyDrops(room, levels, at) {
  for (let k = 0; k < levels.length - 1; k++) {
    const [lower, upper] = [levels[k], levels[k + 1]];
    const gap = at[k + 1] - at[k];
    for (const slide of lower.slides) {
      const toward = slide.drop ? towards(slide.points) : null;
      if (!toward) continue;
      const [sx, sz] = slide.points[0];
      const start = sz * lower.w + sx;
      if (upper.tiles[start] !== TILE.FLOOR) continue; // man må kunne stå på starten der oppe
      if (overWater(upper, slide.points)) continue; // et basseng der oppe er i veien (malt etter sklien)
      const head = opening(lower, upper, start, gap, toward);
      const path = slidePath(lower, slide); // toppen er nå gulvet der oppe
      if (path.problem) continue;
      // Der rennen er så høy at den når opp i etasjeskillet: sjakt. Lenger ned: høyere tak der det trengs.
      const cells = new Set();
      for (const p of path.samples) {
        const [x, z] = [Math.floor(p.x), Math.floor(p.z)];
        const i = z * lower.w + x;
        if (i === start) continue;
        const need = p.y + SLIDE.CLEARANCE;
        if (need > gap - SLAB) cells.add(i);
        else if (ceilingAt(lower, x, z) < need) lower.ceilings[i] = Math.max(lower.ceilings[i], dm(need));
      }
      shaft(lower, upper, [...cells], gap + head);
    }
  }
}

const overWater = (level, points) => points.some(([x, z]) => getTile(level, x, z) === TILE.WATER);

/**
 * Går sklien man drar i etasje `storey` ned til et basseng i etasjen under (starten på gulvet her,
 * enden over vann bare der nede)? Returnerer etasjen under, eller null. Går banen over vann her, er
 * det en vanlig sklie i denne etasjen – også når det ligger et basseng rett under.
 */
export function dropTarget(room, storey, points) {
  if (storey < 1 || points.length < 2) return null;
  const upper = storeyLevel(room, storey);
  const lower = storeyLevel(room, storey - 1);
  const [sx, sz] = points[0];
  const [ex, ez] = points[points.length - 1];
  if (getTile(upper, sx, sz) !== TILE.FLOOR || overWater(upper, points) || getTile(lower, ex, ez) !== TILE.WATER) return null;
  return lower;
}

/** Fjerner skliene ned fra etasjen over som starter eller går over ruten (x, z) i `lower`. Returnerer antall. */
export function removeDropsAt(lower, x, z) {
  const hit = slidesAt(lower, x, z).filter((i) => lower.slides[i].drop);
  if (hit.length) lower.slides = lower.slides.filter((_, i) => !hit.includes(i));
  return hit.length;
}
