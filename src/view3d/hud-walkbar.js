// Gålinjen (hud.js): utenom pause én rad (berøring), på pause et panel midt på skjermen (styles/hud-pause.css) med
// tittel og status, Resume, stemningen med forklaring, av/på for lyd, musikk og VHS, Photo og Drift, tastene og til
// slutt Exit for seg selv. Gruppene er `display: contents` utenom pause, så raden er som før.
import { MOODS } from '../gen/moods.js';

// Tastene i gåmodus (desktop), slik de står i panelet.
const KEYS = [
  ['WASD', 'Walk'], ['Shift', 'Run'], ['Space', 'Jump'], ['C', 'Crawl'], ['F', 'Flashlight'], ['E', 'Use, open'],
  ['P', 'Photo'], ['X', 'Mood'], ['M', 'Sound (map in Noclip)'], ['N', 'Music'], ['V', 'VHS'], ['G', 'Drift'],
];

const moods = Object.entries(MOODS)
  .map(([id, m]) => `<button type="button" data-pick="${id}" aria-pressed="false" title="${m.hint}">${m.label}</button>`).join('');

export const WALKBAR_HTML = `
  <div class="hud-group hud-head"><b class="hud-paused-title">Paused</b><span class="hud-badge">Walking</span><span class="hud-stats"></span><span class="hud-extra"></span></div>
  <button type="button" data-act="resume" class="hud-resume" title="Keep walking (or click anywhere, or press Esc)">▶ Resume</button>
  <div class="hud-group hud-sec hud-sec-mood"><h3>Mood</h3>
    <button type="button" data-act="mood" class="hud-mood" title="Mood: Normal → Abandoned → Liminal → Uncanny → Nightmare (X)">Liminal</button>
    <div class="hud-moods" role="group" aria-label="Mood (X)">${moods}</div>
    <p class="hud-mood-hint"></p></div>
  <div class="hud-group hud-sec"><h3>Sound and look</h3>
    <button type="button" data-act="sound" class="hud-toggle" aria-pressed="true" title="Sound on/off (M)">Sound</button>
    <button type="button" data-act="music" class="hud-toggle" aria-pressed="false" title="Music on/off (N)">Music</button>
    <button type="button" data-act="vhs" class="hud-toggle" aria-pressed="false" title="VHS filter (V)">VHS</button></div>
  <div class="hud-group hud-sec"><h3>Extras</h3>
    <button type="button" data-act="photo" data-key="P" title="Take a photo (P)">📷 Photo</button>
    <button type="button" data-act="drift" data-key="G" title="Dream walk: drift slowly through the rooms on your own (G)">☾ Drift</button></div>
  <div class="hud-group hud-help"><h3>Controls</h3>
    <dl>${KEYS.map(([k, what]) => `<div><dt><kbd>${k}</kbd></dt><dd>${what}</dd></div>`).join('')}</dl></div>
  <button type="button" data-act="exit" class="hud-exit" title="Leave the game">✕ Exit</button>`;
