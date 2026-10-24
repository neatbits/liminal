// Objektvelgeren i sidepanelet (objektverktøyet): søkefelt, gjenstandene i grupper med ikon, og en
// linje om den valgte gjenstanden (størrelse og hva den kan). Samme form som choices() i
// tool-panel.js: { row, select(id) }.
import { OBJECTS } from '../core/objects.js';
import { h } from './dom.js';
import { OBJECT_ICONS, objectGroups, objectInfo } from './object-info.js';

export function objectPicker(pick) {
  const items = new Map();
  const groups = objectGroups().map(([label, ids]) => {
    const buttons = ids.map((id) => {
      const b = h(
        'button',
        { type: 'button', class: 'object-item', title: OBJECTS[id].label, onclick: () => pick(id) },
        h('span', { class: 'object-icon', text: OBJECT_ICONS[id] ?? '📦' }),
        h('span', { class: 'object-label', text: OBJECTS[id].label }),
      );
      items.set(id, { button: b, text: `${OBJECTS[id].label} ${id} ${label}`.toLowerCase() });
      return b;
    });
    const el = h('div', { class: 'object-group' }, h('p', { class: 'tool-group-label', text: label }), h('div', { class: 'object-grid' }, buttons));
    return { el, ids };
  });
  const empty = h('p', { class: 'side-hint', text: 'No objects match.', hidden: true });
  const info = h('p', { class: 'object-info' });

  // Søk: viser gjenstandene der navnet (eller gruppen) inneholder alle ordene.
  const search = h('input', {
    class: 'field object-search',
    type: 'search',
    placeholder: 'Search objects …',
    oninput: () => {
      const words = search.value.toLowerCase().split(/\s+/).filter(Boolean);
      let shown = 0;
      for (const g of groups) {
        let any = false;
        for (const id of g.ids) {
          const { button, text } = items.get(id);
          button.hidden = !words.every((w) => text.includes(w));
          any ||= !button.hidden;
        }
        g.el.hidden = !any;
        shown += any ? 1 : 0;
      }
      empty.hidden = shown > 0;
    },
  });

  const row = h('div', { class: 'object-picker', hidden: true }, search, h('div', { class: 'object-list' }, ...groups.map((g) => g.el), empty), info);
  return {
    row,
    select(id) {
      for (const [key, { button }] of items) button.classList.toggle('active', key === id);
      info.textContent = OBJECTS[id] ? `${OBJECTS[id].label}: ${objectInfo(id)}` : '';
    },
  };
}
