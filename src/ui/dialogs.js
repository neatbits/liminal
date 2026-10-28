// Konkrete dialoger: nytt rom, eksempler, mine rom, deling og hurtigtaster.
import { THEMES, THEME_IDS } from '../core/themes.js';
import { TEMPLATES, PRESETS } from '../gen/index.js';
import { TOOLS, SHAPES } from '../editor/tools.js';
import { h, formatDate } from './dom.js';
import { openModal } from './modal.js';
import { MOODS } from '../gen/moods.js';

const SIZES = [16, 24, 32, 48, 64, 96, 128];

function themeSelect(value) {
  return h(
    'select',
    { class: 'field' },
    THEME_IDS.map((id) => h('option', { value: id, text: THEMES[id].label, selected: id === value })),
  );
}

function sizeSelect(value) {
  return h('select', { class: 'field' }, SIZES.map((s) => h('option', { value: s, text: `${s} m`, selected: s === value })));
}

/**
 * Nytt rom. startup: ved oppstart, med rommet bak dialogen; draft: navnet på utkastet man holdt på med
 * (da er «Continue» hovedvalget), onExamples/onMine: åpne de dialogene i stedet.
 */
export function newRoomDialog({ theme, onCreate, startup = false, draft = null, onExamples, onMine }) {
  const themeEl = themeSelect(theme);
  const wEl = sizeSelect(48);
  const hEl = sizeSelect(48);
  let template = 'hall';
  // Frø for «Randomly generated» (tomt = tilfeldig); vises bare for den malen.
  const seedEl = h('input', { class: 'field', type: 'number', min: 0, step: 1, placeholder: 'Random' });
  const seedRow = h('div', { class: 'row', style: { display: 'none' } }, h('label', { text: 'Seed' }), seedEl);
  const cards = TEMPLATES.map((t) =>
    h(
      'button',
      {
        type: 'button',
        class: t.id === template ? 'card selected' : 'card',
        onclick: (e) => {
          template = t.id;
          for (const c of list.children) c.classList.toggle('selected', c === e.currentTarget);
          seedRow.style.display = template === 'random' ? '' : 'none';
        },
      },
      h('div', { class: 'card-main' }, h('div', { class: 'card-title', text: t.label }), h('div', { class: 'card-sub', text: t.hint })),
    ),
  );
  const list = h('div', { class: 'card-list' }, cards);
  const body = h(
    'div',
    {},
    startup ? h('p', { text: draft ? 'Pick up where you left off, or create a new room.' : 'Create a new room, or continue the room behind this dialog.' }) : null,
    h('div', { class: 'row' }, h('label', { text: 'Theme' }), themeEl),
    h('div', { class: 'row-2' }, h('div', {}, h('label', { text: 'Width' }), wEl), h('div', {}, h('label', { text: 'Depth' }), hEl)),
    h('div', { class: 'side-label', text: 'Start from' }),
    list,
    seedRow,
    startup && (onExamples || onMine)
      ? h('div', { class: 'start-links' }, h('span', { text: 'Or open' }),
          h('button', { type: 'button', class: 'btn', text: 'Examples …', onclick: () => onExamples() }),
          h('button', { type: 'button', class: 'btn', text: 'My rooms …', onclick: () => onMine() }))
      : null,
  );
  const create = { label: 'Create room', onClick: () => onCreate({ theme: themeEl.value, w: +wEl.value, h: +hEl.value, template, seed: seedEl.value }) };
  const short = draft && draft.length > 28 ? `${draft.slice(0, 27)}…` : draft;
  openModal({
    title: 'New room',
    body,
    // Med et utkast er det å fortsette hovedvalget (Enter); ellers å lage rommet.
    actions: draft && startup
      ? [create, { label: `Continue “${short}”`, primary: true }]
      : [{ label: startup ? 'Continue current room' : 'Cancel' }, { ...create, primary: true }],
  });
}

/** Game mode: velg stemning, så rett inn på Level 1 (view3d/game-mode.js). */
export function gameModeDialog({ mood, onStart }) {
  let chosen = MOODS[mood] ? mood : 'liminal';
  const cards = Object.entries(MOODS).map(([id, m]) =>
    h(
      'button',
      {
        type: 'button',
        class: id === chosen ? 'card selected' : 'card',
        'aria-pressed': String(id === chosen),
        onclick: (e) => {
          chosen = id;
          for (const c of list.children) {
            c.classList.toggle('selected', c === e.currentTarget);
            c.setAttribute('aria-pressed', String(c === e.currentTarget));
          }
        },
      },
      h('div', { class: 'card-main' }, h('div', { class: 'card-title', text: m.label }), h('div', { class: 'card-sub', text: m.hint })),
    ),
  );
  const list = h('div', { class: 'card-list' }, cards);
  const body = h(
    'div',
    {},
    h('p', { text: 'Endless generated levels. The doors stay locked until you find every VHS tape – listen for the hum. How deep can you go?' }),
    h('div', { class: 'side-label', text: 'Mood' }),
    list,
  );
  openModal({ title: 'Game mode', body, actions: [{ label: 'Cancel' }, { label: 'Start game', primary: true, onClick: () => onStart(chosen) }] });
}

export function examplesDialog({ onPick }) {
  const body = h(
    'div',
    { class: 'card-list' },
    PRESETS.map((p) => {
      const make = p.make;
      return h(
        'button',
        { type: 'button', class: 'card', onclick: () => (onPick(make()), modal.close()) },
        h('div', { class: 'card-main' }, h('div', { class: 'card-title', text: p.name }), h('div', { class: 'card-sub', text: p.hint })),
      );
    }),
  );
  const modal = openModal({ title: 'Examples', body, actions: [{ label: 'Close' }] });
}

export function myRoomsDialog({ rooms, onOpen, onDelete, onImport, onExport }) {
  const render = (list) =>
    list.length
      ? list.map((r) =>
          h(
            'div',
            { class: 'card' },
            h('span', { class: 'card-thumb', style: { background: THEMES[r.theme]?.plan.floor ?? '#ddd' } }),
            h(
              'div',
              { class: 'card-main' },
              h('div', { class: 'card-title', text: r.name }),
              h('div', { class: 'card-sub', text: `${THEMES[r.theme]?.label ?? r.theme} · ${r.w} × ${r.h} m · ${formatDate(r.updated)}` }),
            ),
            h('button', { type: 'button', class: 'chip', text: 'Open', onclick: () => (onOpen(r.id), modal.close()) }),
            h('button', {
              type: 'button',
              class: 'chip',
              text: 'Delete',
              onclick: (e) => {
                if (!confirm(`Delete “${r.name}”?`)) return;
                if (onDelete(r.id) === false) return;
                e.currentTarget.closest('.card').remove();
              },
            }),
          ),
        )
      : [h('p', { class: 'empty-note', text: 'No saved rooms yet. Press “Save” (Ctrl+S) to save the room you are working on.' })];
  const body = h('div', { class: 'card-list' }, render(rooms));
  const modal = openModal({
    title: 'My rooms',
    body,
    actions: [
      { label: 'Import file …', onClick: () => onImport() },
      { label: 'Export this room', onClick: () => (onExport(), false) },
      { label: 'Close', primary: true },
    ],
  });
}

export function shareDialog({ url, onCopy }) {
  const input = h('input', { class: 'field share-link', value: url, readonly: true, onfocus: (e) => e.target.select() });
  openModal({
    title: 'Share room',
    body: h(
      'div',
      {},
      h('p', { text: 'The whole room lives inside the link – nothing is uploaded. Anyone who opens it can walk the room and build on their own copy.' }),
      input,
      h('p', { class: 'side-hint', text: `${url.length} characters` }),
    ),
    actions: [
      { label: 'Close' },
      { label: 'Copy link', primary: true, onClick: () => (onCopy(url), false) },
    ],
  });
}

export function helpDialog() {
  const rows = [
    ...TOOLS.map((t) => [t.key, t.label]),
    ...SHAPES.map((s) => [s.key, s.label]),
    ['[ ]', 'Brush size'],
    ['Right-click / Alt', 'Erase with the current tool'],
    ['Space + drag', 'Pan the plan (or middle mouse button)'],
    ['Wheel', 'Zoom'],
    ['0', 'Fit the plan'],
    ['Page Up / Page Down', 'Floor above / below'],
    ['Ctrl+Z / Ctrl+Y', 'Undo / redo'],
    ['Ctrl+S', 'Save to My rooms'],
    ['W A S D / arrows', 'Walk'],
    ['Shift', 'Run'],
    ['Space', 'Jump (higher from a diving board)'],
    ['E', 'Open and close doors'],
    ['P', 'Take a photo'],
    ['X', 'Next mood (Normal … Nightmare)'],
    ['G', 'Dream walk on and off'],
    ['V / M / N', 'VHS filter / sound / music on and off'],
    ['Esc', 'Release the mouse · back to the editor'],
  ];
  openModal({
    title: 'Keyboard shortcuts',
    body: h('div', { class: 'shortcut-list' }, rows.flatMap(([k, v]) => [h('kbd', { text: k }), h('span', { text: v })])),
    actions: [{ label: 'Close', primary: true }],
  });
}
