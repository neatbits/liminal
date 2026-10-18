// Felles byggeklosser for sidepanelet: sammenleggbare seksjoner, glidebrytere og tallfelt.
import { h } from './dom.js';

export function section(title, open, ...children) {
  return h('details', { class: 'side-section', open }, h('summary', { text: title }), ...children);
}

export function range(label, min, max, step, onInput) {
  const out = h('output');
  const input = h('input', { type: 'range', min, max, step, oninput: (e) => onInput(+e.target.value) });
  const row = h('div', { class: 'range-row' }, h('div', { class: 'range-head' }, h('span', { text: label }), out), input);
  return { row, input, out };
}

/** Tallfelt med enhet bak (f.eks. «m»). Selve <input> er `firstChild`. */
export function unitInput(unit, props) {
  return h('div', { class: 'unit-field', dataset: { unit } }, h('input', { class: 'field', type: 'number', ...props }));
}
