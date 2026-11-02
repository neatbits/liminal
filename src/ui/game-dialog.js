// Spillsidene: før man starter et spill vises en side i hele vinduet, i samme stil som startmenyen, så
// editoren ikke er innom. Tape hunt og Lights out velger stemning (modusen er valgt allerede), så rett
// inn på Level 1 (view3d/game-mode.js). Daily level bruker samme side (ui/daily-dialog.js).
import { h } from './dom.js';
import { openModal } from './modal.js';
import { MOODS } from '../gen/moods.js';

const MODES = {
  tapes: ['Tape hunt', 'The doors stay locked until you find every VHS tape – listen for the hum.'],
  lights: ['Lights out', 'The power is out. Find the fuse boxes and switch the lights back on to open the doors.'],
};
const COVER = 400; // ms: siden blir stående til fullskjermen har tatt over, så editoren ikke blinker fram

/**
 * En side i hele vinduet med én hovedknapp. onBack: Back og Esc går dit (ellers lukkes siden).
 * @param o { title (for skjermlesere), body, start (knappen), onStart, onBack, cancel (teksten på den andre knappen) }
 */
export function startPage({ title, body, start, onStart, onBack, cancel = onBack ? 'Back' : 'Cancel' }) {
  let leaving = false;
  const modal = openModal({
    title,
    body,
    className: 'start-screen start-page',
    persistent: true,
    onClose: () => !leaving && onBack?.(),
    actions: [
      { label: cancel },
      {
        label: start,
        primary: true,
        onClick: () => {
          leaving = true;
          onStart();
          setTimeout(() => modal.close(), COVER);
          return false;
        },
      },
    ],
  });
}

/** Stemningene som kort. Returnerer { list, value() }. */
function moodCards(first) {
  let chosen = first;
  const list = h('div', { class: 'card-list' });
  for (const [id, { label, hint }] of Object.entries(MOODS)) {
    list.append(h(
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
      h('div', { class: 'card-main' }, h('div', { class: 'card-title', text: label }), h('div', { class: 'card-sub', text: hint })),
    ));
  }
  return { list, value: () => chosen };
}

/** @param o { mood, mode ('tapes' | 'lights'), onStart(mood), onBack } */
export function gameModeDialog({ mood, mode = 'tapes', onStart, onBack }) {
  const [title, text] = MODES[mode] ?? MODES.tapes;
  const moods = moodCards(MOODS[mood] ? mood : 'liminal');
  const body = h(
    'div',
    { class: 'start-body' },
    h('p', { class: 'start-kicker', text: 'REC ● 03:14 AM' }),
    h('h1', { class: 'start-title', text: title }),
    h('p', { class: 'start-lead', text }),
    h('div', { class: 'side-label', text: 'Mood' }),
    moods.list,
  );
  startPage({ title: 'Game mode', body, start: 'Start game', onStart: () => onStart(moods.value()), onBack });
}
