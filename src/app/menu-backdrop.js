// Holder 3D-bakgrunnen (view3d/menu-scene.js) i live så lenge en side i hele vinduet er åpen: hovedmenyen,
// innstillingene og spillsidene. Editorens visning hviler imens. Går ikke 3D, står den gule bakgrunnen.
import { MenuScene } from '../view3d/menu-scene.js';

const LEAVE = 250; // ms: bytte mellom sider skal ikke bygge scenen på nytt
const TURN = { main: 0, play: 0.1, create: -0.14 };

export function bindMenuBackdrop(app) {
  const root = document.getElementById('modal-root');
  const body = document.body;
  const state = { scene: null, page: 'main', turn: 0 };
  let leaving = 0;
  let starting = 0;
  let failed = false;

  const fail = (error) => {
    failed = true;
    if (error) console.warn('The menu background could not start.', error);
    stop();
  };
  const stop = () => {
    clearTimeout(starting);
    starting = 0;
    state.scene?.dispose();
    state.scene = null;
    body.classList.remove('menu-3d');
  };
  const start = () => {
    starting = 0;
    try {
      state.scene = new MenuScene({
        settings: app.settings,
        onLight: (v) => document.documentElement.style.setProperty('--menu-light', v.toFixed(2)),
        onLost: () => fail(),
      });
      state.scene.turn.to = state.turn;
    } catch (error) {
      fail(error);
    }
  };
  const show = () => {
    clearTimeout(leaving);
    leaving = 0;
    if (app.viewer) app.viewer.resting = true;
    if (state.scene || starting || failed) return;
    body.classList.add('menu-3d'); // mørkt med en gang, så det gule ikke blinker før scenen er klar
    starting = setTimeout(start, 30);
  };
  const hide = () => {
    leaving = 0;
    if (app.viewer) app.viewer.resting = false;
    stop();
  };
  new MutationObserver(() => {
    if (root.querySelector('.start-screen')) show();
    else leaving ||= setTimeout(hide, LEAVE);
  }).observe(root, { childList: true });

  return Object.assign(state, {
    /** Undermenyene dreier kameraet litt. */
    setPage(page) {
      state.turn = TURN[page] ?? 0;
      if (state.scene) state.scene.turn.to = state.turn;
    },
  });
}
