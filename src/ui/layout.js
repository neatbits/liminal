// Visningsoppsett: 2D, 3D eller delt, og en dra-bar skillelinje mellom panelene.

const KEY = 'liminal.layout.v1';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {};
  } catch {
    return {};
  }
}

function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ikke kritisk */
  }
}

export function setupLayout({ app, toggle, splitter, workspace, onChange }) {
  const state = { layout: 'split', split: 0.5, ...load() };

  const apply = () => {
    app.dataset.layout = state.layout;
    for (const b of toggle.querySelectorAll('button')) b.classList.toggle('active', b.dataset.layout === state.layout);
    workspace.style.setProperty('--left', `${state.split}fr`);
    workspace.style.setProperty('--right', `${1 - state.split}fr`);
    onChange?.(state.layout);
  };

  toggle.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-layout]');
    if (!b) return;
    state.layout = b.dataset.layout;
    save(state);
    apply();
  });

  splitter.addEventListener('pointerdown', (e) => {
    splitter.setPointerCapture(e.pointerId);
    splitter.classList.add('dragging');
    const sidebar = workspace.firstElementChild.getBoundingClientRect();
    const total = workspace.getBoundingClientRect().right - sidebar.right - splitter.offsetWidth;
    const move = (ev) => {
      state.split = Math.max(0.2, Math.min(0.8, (ev.clientX - sidebar.right) / total));
      apply();
    };
    const up = () => {
      splitter.classList.remove('dragging');
      splitter.removeEventListener('pointermove', move);
      splitter.removeEventListener('pointerup', up);
      save(state);
    };
    splitter.addEventListener('pointermove', move);
    splitter.addEventListener('pointerup', up);
  });

  apply();
  return {
    get layout() {
      return state.layout;
    },
    set(layout) {
      state.layout = layout;
      save(state);
      apply();
    },
  };
}
