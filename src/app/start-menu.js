// Startmenyen i programmet (Electron, desktop/): vises ved oppstart i stedet for «New room», og når
// man trykker på logoen. På nettsiden er forsiden startmenyen. Esc eller «Continue» lukker den.
import { h } from '../ui/dom.js';
import { openModal } from '../ui/modal.js';
import { newRoom, openExamples, openMine, playGame } from './actions.js';
import { openSettings } from './view-settings.js';

/** Kjører i programmet? (desktop/preload.cjs) */
export const desktop = () => typeof window !== 'undefined' && !!window.liminalDesktop;

export function startMenu(app) {
  let modal;
  // Hvert valg lukker menyen først, så neste dialog gir fokus tilbake til siden og ikke til menyen.
  const item = (label, sub, run, extra = {}) =>
    h(
      'button',
      { type: 'button', class: 'start-item', ...extra, onclick: () => (modal.close(), run()) },
      h('span', { class: 'start-label', text: label }),
      sub ? h('span', { class: 'start-sub', text: sub }) : null,
    );
  const body = h(
    'div',
    { class: 'start-body' },
    h('p', { class: 'start-kicker', text: 'REC ● 03:14 AM' }),
    h('h1', { class: 'start-title', text: 'Liminal Simulator' }),
    h(
      'nav',
      { class: 'start-items', 'aria-label': 'Main menu' },
      item('📼 Game mode', 'Endless levels – find the tapes', () => playGame(app), { autofocus: true }),
      item('Continue', `“${app.level.name}”`, () => {}),
      item('New room …', 'Draw your own', () => newRoom(app)),
      item('Examples …', 'Pools, malls, endless corridors', () => openExamples(app)),
      item('My rooms …', null, () => openMine(app)),
      item('Settings …', 'Graphics, controls, sound', () => openSettings(app)),
      item('About & credits', null, () => (location.href = '../about/')),
      item('Quit', null, () => window.liminalDesktop.quit()),
    ),
  );
  modal = openModal({ title: 'Main menu', body, className: 'start-screen' });
  return modal;
}

/** Logoen øverst åpner startmenyen i programmet (på nettsiden: forsiden). */
export function bindStartMenu(app) {
  const brand = document.querySelector('header .brand');
  if (!brand) return;
  brand.title = 'Main menu';
  brand.addEventListener('click', (e) => {
    e.preventDefault();
    startMenu(app);
  });
}
