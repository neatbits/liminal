// Et blokkert WebGL-kontekst må ikke hindre verktøy, 2D-plan eller lagring.
import { h } from '../ui/dom.js';
import { toast } from '../ui/toast.js';
import { MOODS } from '../gen/moods.js';

export class UnavailableViewer {
  constructor(container, options, error) {
    this.options = options;
    this.settings = options.settings;
    this.mode = 'overview';
    this.level = null;
    this.unavailable = true;
    const reload = h('button', { type: 'button', class: 'btn btn-accent', text: 'Try 3D again', onclick: () => location.reload() });
    this.notice = h('section', { class: 'graphics-unavailable', role: 'alert', tabindex: -1 },
      h('h2', { text: '3D graphics could not start' }),
      h('p', { text: 'You can keep editing and saving your room in 2D.' }),
      h('p', { text: 'If reloading does not help, close all browser windows and reopen the simulator. A graphics crash can temporarily block 3D.' }),
      reload,
      h('details', {}, h('summary', { text: 'Error details' }), h('p', { text: error.message })),
    );
    container.append(this.notice);
  }

  setLevel(level) { this.level = level; return null; }

  updateSettings(patch) {
    Object.assign(this.settings, patch);
    this.options.onSettingsChange?.(this.settings);
  }

  setMood(id) {
    if (!MOODS[id]) return;
    this.settings.mood = id;
    this.options.onMoodChange?.(this.settings.mood);
    this.options.onSettingsChange?.(this.settings);
  }

  _explain() {
    this.notice.focus();
    toast('3D graphics are unavailable. See the message in the 3D preview.', { error: true });
  }

  walkFullscreen() { this._explain(); return false; }
  photo() { this._explain(); }
  view() { this._explain(); }
  toggle() { this._explain(); }
}
