// Game mode (forsiden → app/#play): rett inn i den uendelige utforskingen på Level 1 i stemningen
// man valgte – genererte nivåer der dørene er låst til kassettene er funnet (view3d/tape-hunt.js).
// Rommet som ligger i editoren, er «hjem» når man går ut, og endres ikke. Kalles fra et klikk
// (Start-knappen), så fullskjerm og muselås er lov.
import { DAILY_MOOD } from '../gen/daily.js';
import { descentMood } from '../gen/descent.js';
import { quietMood } from './mood.js';

const SPOT_MOOD = 'normal'; // ingen hendelser eller strømbrudd: bare det man må legge merke til

/** Daily level (gen/daily.js): fast stemning, så dagens nivå på tid (view3d/daily.js). */
export function startDaily(viewer, enterWalk = () => viewer.walkFullscreen()) {
  viewer.setMood(DAILY_MOOD);
  viewer.hud.fade(true, true);
  if (!enterWalk()) {
    viewer.hud.fade(false);
    return false;
  }
  viewer.explorer.daily.start();
  return true;
}

/** Spot the wrong, The Descent og Noclip: rett inn. run: 'spot', 'descent' eller 'noclip' (view3d/spot.js, descent.js, noclip.js). */
export function startRun(viewer, run, enterWalk = () => viewer.walkFullscreen()) {
  const ex = viewer.explorer;
  const mood = viewer.settings.mood;
  quietMood(viewer, { spot: SPOT_MOOD, noclip: 'normal' }[run] ?? descentMood(1)); // før enterWalk: rommet bak skal ikke påvirkes
  viewer.hud.fade(true, true);
  if (!enterWalk()) {
    quietMood(viewer, mood);
    viewer.hud.fade(false);
    return false;
  }
  ex[run].mood = mood; // tilbake når modusen er over
  ex[run].start();
  return true;
}

/** mode: 'tapes' (finn kassettene) eller 'lights' (Lights out: slå på strømmen, view3d/lights-out.js). */
export function startGame(viewer, mood, enterWalk = () => viewer.walkFullscreen(), mode = 'tapes') {
  viewer.setMood(mood);
  viewer.hud.fade(true, true); // svart med en gang: rommet i editoren skal ikke vises først
  if (!enterWalk()) {
    viewer.hud.fade(false);
    return false;
  }
  if (mode === 'lights') viewer.explorer.lightsOut.start(); // etter enterWalk (den går ut av forrige modus)
  viewer.explorer.goDeeper({ wait: 450 });
  return true;
}
