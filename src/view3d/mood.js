// Bytte stemning i visningen (Normal … Nightmare, gen/moods.js): lagres med innstillingene, gir en
// kort forklaring i gåmodus og oppdaterer tåke, lys og lyd med en gang. Strømbrudd og monster følger
// med (view3d/explore.js); ødelagte lys og «Make it wrong» gjelder fra neste rom.
import { getMood, MOODS } from '../gen/moods.js';

export function setMood(viewer, id) {
  if (!MOODS[id]) return;
  const m = getMood(id);
  viewer.settings.mood = id;
  viewer.walk.mood = m;
  if (viewer.mode === 'walk') viewer.hud.flash(`${m.label}: ${m.hint}`, 4500);
  viewer.hud.setToggles(viewer.settings);
  viewer._applyLook();
  viewer.options.onSettingsChange?.(viewer.settings);
  viewer.options.onMoodChange?.(id);
}
