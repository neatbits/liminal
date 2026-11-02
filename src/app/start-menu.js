// Startmenyen i programmet (Electron, desktop/): vises ved oppstart i stedet for «New room», og når
// man trykker på logoen. På nettsiden er forsiden startmenyen. Fem valg, med spillene og det å lage rom
// på hver sin side, foran et Level 0 i 3D (app/menu-backdrop.js). Esc går en side tilbake og lukker til slutt.
import { h } from '../ui/dom.js';
import { openModal } from '../ui/modal.js';
import { newRoom, openExamples, openMine, playGame, playDaily, playRun } from './actions.js';
import { openSettings } from './view-settings.js';
import { bindMenuBackdrop } from './menu-backdrop.js';

const BACK = '← Back';

/** Kjører i programmet? (desktop/preload.cjs) */
export const desktop = () => typeof window !== 'undefined' && !!window.liminalDesktop;

/** Sidene: { label, sub, to (en annen side) | run }. */
function pages(app) {
  const from = { back: () => startMenu(app, 'play') }; // spillene: Back, Esc og Exit kommer hit igjen
  return {
    main: [
      { label: 'Play', sub: 'Six ways to get lost', to: 'play' },
      { label: 'Create', sub: `Continue “${app.level.name}”, or draw something new`, to: 'create' },
      { label: 'Settings', sub: 'Graphics, controls, sound', run: () => openSettings(app, { back: () => startMenu(app) }) },
      { label: 'About & credits', sub: 'Who made what', run: () => (location.href = '../about/') },
      { label: 'Quit', sub: 'The lights stay on without you', run: () => window.liminalDesktop.quit() },
    ],
    play: [
      { label: 'Tape hunt', sub: 'Endless levels – find every tape to open the door', run: () => playGame(app, 'tapes', from) },
      { label: 'Noclip', sub: 'An ordinary store. A wall in the back that isn’t', run: () => playRun(app, 'noclip', from) },
      { label: 'The Descent', sub: 'One life, one battery, ever deeper', run: () => playRun(app, 'descent', from) },
      { label: 'Spot the wrong', sub: 'The same corridor. Is anything different?', run: () => playRun(app, 'spot', from) },
      { label: 'Lights out', sub: 'The power is gone – find the fuse boxes', run: () => playGame(app, 'lights', from) },
      { label: 'Daily level', sub: 'A new level every day, on the clock', run: () => playDaily(app, from) },
      { label: BACK, to: 'main' },
    ],
    create: [
      { label: 'Continue', sub: `“${app.level.name}”`, run: () => {} },
      { label: 'New room …', sub: 'Draw your own', run: () => newRoom(app) },
      { label: 'Examples …', sub: 'Pools, malls, endless corridors', run: () => openExamples(app) },
      { label: 'My rooms …', sub: 'Saved on this computer', run: () => openMine(app) },
      { label: BACK, to: 'main' },
    ],
  };
}

export function startMenu(app, first = 'main') {
  const all = pages(app);
  const hint = h('p', { class: 'start-hint', 'aria-live': 'polite' });
  const nav = h('nav', { class: 'start-items', 'aria-label': 'Main menu' });
  let page = first;
  let modal;

  const show = (id, focus = null) => {
    page = id;
    app.menuBackdrop?.setPage(id);
    nav.replaceChildren(...all[id].map((entry, i) => {
      const button = h(
        'button',
        {
          type: 'button',
          class: 'start-item',
          // Mus og tastatur har samme markør: det man peker på, er det som er valgt.
          onmouseenter: (e) => e.currentTarget.focus(),
          onfocus: () => (hint.textContent = entry.sub ?? ''),
          // Hvert valg lukker menyen først, så neste dialog gir fokus tilbake til siden og ikke til menyen.
          onclick: () => (entry.to ? show(entry.to, id === 'main' ? null : labelOf(id)) : (modal.close(), entry.run())),
        },
        h('span', { class: 'start-label', text: entry.label }),
      );
      button.style.setProperty('--i', i);
      return button;
    }));
    const items = [...nav.children];
    (items.find((b) => b.textContent === focus) ?? items[0]).focus();
  };
  const labelOf = (id) => all.main.find((e) => e.to === id)?.label;
  const back = () => page !== 'main' && (show('main', labelOf(page)), true);

  nav.addEventListener('keydown', (e) => {
    const step = { ArrowDown: 1, ArrowUp: -1 }[e.key];
    if (e.key === 'ArrowLeft') back();
    if (!step) return;
    e.preventDefault();
    const items = [...nav.children];
    items[(items.indexOf(document.activeElement) + step + items.length) % items.length].focus();
  });

  const body = h(
    'div',
    { class: 'start-body' },
    h('p', { class: 'start-kicker' }, h('span', { class: 'start-rec', text: '●' }), ' REC 03:14 AM'),
    h('h1', { class: 'start-title', text: 'Liminal Simulator' }),
    nav,
    hint,
  );
  modal = openModal({ title: 'Main menu', body, className: 'start-screen start-home', persistent: true, onEscape: back });
  show(first);
  return modal;
}

/** Logoen øverst åpner startmenyen i programmet (på nettsiden: forsiden). */
export function bindStartMenu(app) {
  app.menuBackdrop = bindMenuBackdrop(app);
  const brand = document.querySelector('header .brand');
  if (!brand) return;
  brand.title = 'Main menu';
  brand.addEventListener('click', (e) => {
    e.preventDefault();
    startMenu(app);
  });
}
