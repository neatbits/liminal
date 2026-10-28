// Sømmer mellom etasjer (core/stairwells.js, `level.seams`): flater som ikke skal bygges der to
// etasjer møtes i et trapperom. Reposet i etasjen over har ingen vegg mot løpet (man ser og går ned
// trappen); reposet i etasjen under har bare vegger under gulvet der oppe, unntatt mot løpet
// (overliggeren over trappen) – resten er etasjen overs vegger.
import { clipSpans } from './decks.js';

/** Veggspennene på side s av rute i, etter sømmene. */
export function seamSpans(level, i, s, spans) {
  const seams = level.seams;
  if (!seams) return spans;
  const open = seams.open.get(i);
  if (open && open[0] === s.dx && open[1] === s.dz) return [];
  const clip = seams.clip.get(i);
  if (clip && !(clip.keep[0] === s.dx && clip.keep[1] === s.dz)) return clipSpans(spans, -Infinity, clip.y);
  return spans;
}

/** Skal ruten ha gulvflate / takflate? (Den andre etasjen har den.) */
export const hasFloor = (level, i) => !level.seams?.noFloor.has(i);
export const hasCeiling = (level, i) => !level.seams?.noCeiling.has(i);
