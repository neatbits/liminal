// Hurtigtaster i gåmodus: VHS, lyd, musikk, foto, stemning, drømmegange og Esc (pause/ut).
import { nextMood } from '../gen/moods.js';

export function walkKey(v, e) {
  if (v.mode !== 'walk' || e.target?.tagName === 'INPUT' || e.ctrlKey || e.metaKey) return;
  if (e.code === 'KeyV') v.toggle('vhs');
  else if (e.code === 'KeyM') v.toggle('sound');
  else if (e.code === 'KeyN') v.toggle('music');
  else if (e.code === 'KeyP') v.photo();
  else if (e.code === 'KeyX') v.setMood(nextMood(v.settings.mood));
  else if (e.code === 'KeyG') v.walk.drift.toggle();
  else if (e.code === 'Escape') v._escape();
}
