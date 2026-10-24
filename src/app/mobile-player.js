// A phone has a room chooser and the walker, with no editor or draft writes.
import { h } from '../ui/dom.js';
import { PRESETS } from '../gen/index.js';
import { MOODS } from '../gen/moods.js';
import { loadSettings, saveSettings, listRooms, loadRoom } from '../core/storage.js';
import { createViewer } from '../view3d/create-viewer.js';
import { TouchControls } from '../view3d/touch-controls.js';
import { settingsDialog } from '../ui/settings-dialog.js';

export class MobilePlayer {
  constructor({ initial = null } = {}) {
    this.mobile = true;
    this.level = null;
    this.settings = loadSettings();
    this.root = document.getElementById('app');
    this.root.className = 'mobile-player';
    this.root.removeAttribute('data-layout');
    document.body.classList.add('mobile-mode');
    this.viewport = h('div', { id: 'viewport3d', class: 'viewport3d mobile-viewport' });
    this.root.replaceChildren(this.viewport);
    this.home = this._chooser(initial);
    this.root.append(this.home);
    this.viewer = createViewer(this.viewport, {
      settings: this.settings,
      onModeChange: mode => this._mode(mode),
      onSettingsChange: () => saveSettings(this.settings),
    });
    if (!this.viewer.unavailable) {
      this.controls = new TouchControls(this.viewer.hud.root, this.viewer.walk);
      this.viewer.hud.phoneControls = true;
      const exit = this.viewer.hud.walkbar.querySelector('[data-act="exit"]');
      exit.textContent = 'Choose a room';
      exit.title = 'Back to the room chooser';
      this.viewer.hud.hint.classList.add('mobile-walk-hint');
    } else {
      this.viewer.notice.querySelector('p').textContent =
        'Reload to try again. Your saved rooms have been kept.';
      this.home.prepend(this.viewer.notice);
      this.viewer.notice.style.position = 'static';
      this.viewer.notice.style.transform = 'none';
    }
    this._mode('overview');
  }

  _chooser(initial) {
    const mood = h(
      'select',
      {
        'aria-label': 'Mood',
        onchange: () => {
          this.viewer.setMood(mood.value);
          hint.textContent = MOODS[mood.value].hint;
        },
      },
      Object.entries(MOODS).map(([id, m]) =>
        h('option', { value: id, text: m.label, selected: id === this.settings.mood }),
      ),
    );
    const hint = h('p', { class: 'mobile-mood-hint', text: MOODS[this.settings.mood]?.hint ?? '' });
    const card = (name, description, make, id) =>
      h(
        'button',
        {
          type: 'button',
          class: 'mobile-room',
          dataset: { example: id },
          onclick: () => this.start(make()),
        },
        h(
          'span',
          { class: 'mobile-room-copy' },
          h('strong', { text: name }),
          h('span', { text: description }),
        ),
        h('span', { 'aria-hidden': true, text: '↗' }),
      );
    const saved = listRooms();
    return h(
      'main',
      { class: 'mobile-home' },
      h(
        'header',
        { class: 'mobile-home-head' },
        h('a', { class: 'brand', href: '../' }, h('span', { class: 'brand-mark' }), 'Liminal'),
        h('button', {
          type: 'button',
          class: 'btn',
          text: 'Settings',
          onclick: () =>
            settingsDialog(this.settings, p => {
              this.viewer.updateSettings(p);
              saveSettings(this.settings);
            }),
        }),
      ),
      h('p', { class: 'mobile-eyebrow', text: 'Wander somewhere else' }),
      h('h1', { text: 'An empty place.\nYours to explore.' }),
      h('p', {
        class: 'mobile-intro',
        text: 'Choose a space and step inside. Move with your left thumb and look around with your right.',
      }),
      h('label', { class: 'mobile-mood' }, 'Mood', mood),
      hint,
      initial ? card(`Explore ${initial.name}`, 'Start exploring this room', () => initial, 'current') : null,
      h(
        'section',
        { 'aria-label': 'Simulations', class: 'mobile-room-list' },
        PRESETS.map(p => card(p.name, p.hint, p.make, p.id)),
      ),
      saved.length
        ? h(
            'section',
            { 'aria-label': 'Saved rooms', class: 'mobile-room-list' },
            h('h2', { text: 'Your rooms' }),
            saved.map(r => card(r.name, `${r.w} × ${r.h} m`, () => loadRoom(r.id), `saved-${r.id}`)),
          )
        : null,
      h(
        'footer',
        { class: 'mobile-home-foot' },
        h('a', { href: '../about/', text: 'About & credits' }),
        h('button', { type: 'button', class: 'btn', text: 'Suggestions', dataset: { feedback: true } }),
      ),
    );
  }

  start(level) {
    if (!level || this.viewer.unavailable) return;
    this.level = level;
    this.home.hidden = true;
    this.viewport.inert = false;
    this.viewer.setLevel(level);
    if (!this.viewer.enterWalk()) {
      this._mode('overview');
      return;
    }
    this.viewer.hud.flash('Left thumb: move · Right thumb: look around', 4500);
  }

  _mode(mode) {
    const playing = mode === 'walk';
    this.home.hidden = playing;
    this.viewport.inert = !playing;
    this.viewer?.renderer?.setAnimationLoop(playing ? t => this.viewer._tick(t) : null);
    this.root.dataset.playing = String(playing);
    if (!playing) this.controls?.clear();
    if (!playing) {
      this.home.querySelector('select').value = this.settings.mood;
      this.home.querySelector('.mobile-mood-hint').textContent = MOODS[this.settings.mood]?.hint ?? '';
    }
    if (playing) this.viewport.focus({ preventScroll: true });
  }
}
