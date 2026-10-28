// Åpninger mellom to etasjer i etasjene slik de bygges og gås i (walkLevels i core/stairwells.js):
// trapperom og sklier ned fra etasjen over (core/slide-drops.js). En åpning er en rute der man går
// fra den ene etasjen til den andre (reposet, toppen av sklien), og en sjakt er rutene under den der
// etasjen under er åpen helt opp til taket i etasjen over, mens etasjen over har vegg. `level.seams`
// sier hvilke flater som ikke skal bygges der etasjene møtes (world/seams.js). Ren logikk.
import { TILE, LIGHT } from './level.js';
import { ceilingAt } from './heights.js';
import { clearObjects } from './object-pose.js';

export const dm = (m) => Math.max(0, Math.min(255, Math.round(m * 10)));
export const seamsOf = (level) => (level.seams ??= { noFloor: new Set(), noCeiling: new Set(), noRail: new Set(), open: new Map(), clip: new Map(), shaft: new Set() });

/** Gjør ruten til vanlig gulv i høyden `floor` (dm), uten noe av det den hadde. */
export function plainFloor(level, i, floor) {
  level.tiles[i] = TILE.FLOOR;
  for (const key of ['meta', 'corners', 'decks', 'leds']) level[key][i] = 0;
  level.floors[i] = floor;
}

/**
 * Åpningen i rute i: i etasjen under et gulv i høyden `gap` (etasjen over) med taket til etasjen over,
 * og i etasjen over et vanlig gulv uten egen gulvflate, åpent mot `toward` (sjakten).
 */
export function opening(lower, upper, i, gap, toward) {
  const w = lower.w;
  const head = ceilingAt(upper, i % w, Math.floor(i / w));
  clearObjects(lower, [i]);
  clearObjects(upper, [i]);
  plainFloor(lower, i, dm(gap));
  lower.lights[i] = LIGHT.NONE; // lyset der henger i etasjen over
  lower.ceilings[i] = dm(gap + head);
  const ls = seamsOf(lower);
  ls.noCeiling.add(i); // taket er etasjen overs tak
  ls.noRail.add(i); // vern for kollisjon, men ikke tegnet
  ls.clip.set(i, { y: gap, keep: toward }); // over gulvet der oppe: etasjen overs vegger
  // Lyset fra etasjen over faller ned i åpningen (en lyskilde uten armatur).
  (lower.borrowed ??= []).push({ x: (i % w) + 0.5, z: Math.floor(i / w) + 0.5, y: gap + head - 0.4, power: 0.8 });
  plainFloor(upper, i, 0);
  const us = seamsOf(upper);
  us.noFloor.add(i);
  us.open.set(i, toward);
  return head;
}

/**
 * Sjakten: åpen til taket i etasjen over (høyden `top` over gulvet under), vegg i etasjen over – merket
 * i `seams.shaft`, så veggen rundt sjakten der oppe får tykkelse (world/shaft-walls.js).
 */
export function shaft(lower, upper, cells, top) {
  for (const i of cells) {
    lower.ceilings[i] = dm(top);
    upper.tiles[i] = TILE.WALL;
    seamsOf(upper).shaft.add(i);
    for (const key of ['lights', 'meta', 'corners', 'decks', 'floors', 'panels', 'leds']) upper[key][i] = 0;
  }
  clearObjects(upper, cells);
}
