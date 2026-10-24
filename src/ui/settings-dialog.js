// Innstillinger (View → Settings): grafikk – format i fullskjerm, oppløsning, vann, effekter og
// bildefrekvens – og kontroller/lyd. Endringer brukes med en gang og lagres.
import { h } from './dom.js';
import { openModal } from './modal.js';
import { range } from './fields.js';
import { waveStrength } from '../core/water.js';

const WATER = [
  ['simple', 'Simple – no reflections (fastest)'],
  ['normal', 'Normal'],
  ['detailed', 'Detailed – sharper, finer waves (heaviest)'],
];

const GRAPHICS = [
  { key: 'fullscreenAspect', label: 'Fullscreen format', hint: 'A narrower format draws the picture in the middle with black bars – far fewer pixels on wide screens.', options: [['screen', 'Screen (default)'], ['16:9', '16:9'], ['21:9', '21:9'], ['16:10', '16:10']] },
  { key: 'renderScale', label: 'Resolution', options: [[1, '100 %'], [0.75, '75 %'], [0.5, '50 % (fastest)']] },
  { key: 'effects', label: 'Effects', options: [['full', 'Full – glow and smoothing'], ['reduced', 'Reduced – no glow, no smoothing']] },
  { key: 'fpsCap', label: 'Frame rate', options: [[0, 'Unlimited'], [60, '60 per second'], [30, '30 per second']] },
];

const waterOf = (s) => (!s.waterReflections ? 'simple' : s.waterDetail ? 'detailed' : 'normal');

function select(options, value, onChange) {
  return h(
    'select',
    { class: 'field', onchange: (e) => onChange(options.find(([v]) => String(v) === e.target.value)[0]) },
    options.map(([v, text]) => h('option', { value: String(v), text, selected: String(v) === String(value) })),
  );
}

/** @param apply (patch) → lagrer og bruker endringene */
export function settingsDialog(settings, apply) {
  const rows = GRAPHICS.map((g) => [
    h('div', { class: 'row' }, h('label', { text: g.label }), select(g.options, settings[g.key], (v) => apply({ [g.key]: v }))),
    g.hint ? h('p', { class: 'side-hint', text: g.hint }) : null,
  ]);
  const water = select(WATER, waterOf(settings), (v) => apply({ waterReflections: v !== 'simple', waterDetail: v === 'detailed' }));
  const waveText = (v) => v === 0 ? 'Still' : `${Math.round(v * 100)} %${v === 1 ? ' (default)' : ''}`;
  const waves = range('Water waves', 0, 2, 0.05, (v) => {
    waves.out.textContent = waveText(v);
    waves.input.setAttribute('aria-valuetext', waveText(v));
    apply({ waterWaves: v });
  });
  waves.input.setAttribute('aria-label', 'Water waves');
  waves.input.setAttribute('aria-describedby', 'water-waves-hint');
  waves.input.value = waveStrength(settings.waterWaves);
  waves.out.textContent = waveText(+waves.input.value);
  waves.input.setAttribute('aria-valuetext', waves.out.textContent);
  const sens = range('Mouse sensitivity', 0.3, 3, 0.05, (v) => {
    sens.out.textContent = `${v.toFixed(2)}×`;
    apply({ sensitivity: v });
  });
  const fov = range('Field of view', 60, 100, 1, (v) => {
    fov.out.textContent = `${v}°`;
    apply({ fov: v });
  });
  const vol = range('Volume', 0, 1, 0.05, (v) => {
    vol.out.textContent = `${Math.round(v * 100)} %`;
    apply({ volume: v });
  });
  for (const [r, v, text] of [[sens, settings.sensitivity, `${settings.sensitivity.toFixed(2)}×`], [fov, settings.fov, `${settings.fov}°`], [vol, settings.volume, `${Math.round(settings.volume * 100)} %`]]) {
    r.input.value = v;
    r.out.textContent = text;
  }
  const body = h(
    'div',
    { class: 'settings' },
    h('div', { class: 'side-label', text: 'Graphics' }),
    ...rows.flat(),
    h('div', { class: 'row' }, h('label', { text: 'Water' }), water),
    waves.row,
    h('p', { id: 'water-waves-hint', class: 'side-hint', text: 'Controls background waves. Jumping and moving through water still create ripples, even at 0 %. 100 % keeps the room’s usual waves.' }),
    h('p', { class: 'side-hint', text: 'On a slow computer: try 75 % resolution, reduced effects and simple water first.' }),
    h('div', { class: 'side-label', text: 'Controls & sound' }),
    sens.row,
    fov.row,
    vol.row,
  );
  openModal({ title: 'Settings', body, actions: [{ label: 'Done', primary: true }] });
}
