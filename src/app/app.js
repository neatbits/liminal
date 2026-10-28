// App-kontrolleren: eier rommet og holder 2D-skissen, 3D-visningen og panelene i synk.
import { resizeLevel } from '../core/level.js';
import { levelStats } from '../core/stats.js';
import { applySnapshot } from '../core/history.js';
import { autoLights, clearLights } from '../core/ops.js';
import { makeWrong, changeMarkers } from '../gen/wrong.js';
import { getTheme } from '../core/themes.js';
import { loadSettings, saveSettings } from '../core/storage.js';
import { Editor } from '../editor/editor.js';
import { createViewer } from '../view3d/create-viewer.js';
import { Sidebar } from '../ui/sidebar.js';
import { setupLayout } from '../ui/layout.js';
import { buildMenus } from '../ui/menus.js';
import { $ } from '../ui/dom.js';
import { toast } from '../ui/toast.js';
import { menuConfig } from './menu-config.js';
import { bindShortcuts } from './shortcuts.js';
import { hoverText, toolText, renderBadge } from './status.js';
import { sidebarActions, bindButtons } from './wiring.js';
import { DraftSaver } from './draft.js';
import { toolMethods } from './tool-methods.js';
import { storeyCount } from '../core/storeys.js';

export class App {
  constructor() {
    this.settings = loadSettings();
    this.level = null;
    this.dirty = false;
    this.drafts = new DraftSaver(() => this.level, () => toast('Could not autosave – export your room to keep a copy.', { error: true, ms: 6000 }));
    this.editor = new Editor($('#editor-canvas'), {
      onChange: (kind) => this.changed(kind),
      onHover: (cell) => ($('#hover-info').textContent = hoverText(this.editor.level, cell)),
      onStorey: () => this._refreshUI(),
      onHint: (text) => toast(text, { ms: 4500 }),
    });
    this.editor.grid = this.settings.grid;
    this.editor.rulers = this.settings.rulers;
    this.viewer = createViewer($('#viewport3d'), {
      settings: this.settings,
      onModeChange: (mode) => {
        $('#btn-walk-top').classList.toggle('active', mode === 'walk');
        $('#view-settings').hidden = mode === 'walk'; // gåmodus har egne knapper i HUD-en
      },
      onSettingsChange: () => saveSettings(this.settings),
    });
    this.sidebar = new Sidebar($('#sidebar'), sidebarActions(this));
    this.sidebar.syncHelpers(this.settings);
    this.layout = setupLayout({
      app: $('#app'),
      toggle: $('#layout-toggle'),
      splitter: $('#splitter'),
      workspace: $('.workspace'),
      onChange: (layout) => this._show3D(layout !== '2d'),
    });
    buildMenus($('#menus'), menuConfig(this));
    bindShortcuts(this);
    bindButtons(this);
    this.setTool('floor');
  }

  /** Bytter til et nytt rom (nullstiller angre-historikken). */
  setLevel(level, { dirty = false } = {}) {
    this.level = level;
    this.dirty = dirty;
    this.editor.setLevel(level);
    this._refreshUI();
    this._rebuild();
    this._saveDraftSoon();
  }

  /** Kalles ved hver endring. 'live' = mens man tegner (strupet), 'commit' = ferdig. */
  changed(kind = 'commit') {
    this.dirty = true;
    this._refreshUI();
    // Store rom venter til penselen hviler; små rom får fortsatt løpende 3D-forhåndsvisning.
    this._schedule3D(kind === 'live' ? 160 : 30, kind === 'live' && this.level.w * this.level.h < 4096);
    this._saveDraftSoon();
  }

  /** Endring gjort utenfor editoren: lag angre-punkt først med editor.checkpoint(). */
  mutated() {
    this.editor.refresh();
    this.changed('commit');
  }

  markSaved() {
    this.dirty = false;
    this._refreshBadge();
    this._saveDraftSoon();
  }

  rename(name) {
    this.level.name = name.trim() || 'Untitled';
    this.dirty = true;
    this._refreshBadge();
    this._saveDraftSoon();
  }

  setTheme(id) {
    this.level.theme = getTheme(id).id;
    this.mutated();
  }

  setSize(w, h) {
    if (w === this.level.w && h === this.level.h) return;
    this.editor.checkpoint(true); // alle etasjene endrer størrelse
    const resized = resizeLevel(this.level, w, h);
    applySnapshot(this.level, resized);
    if (resized.storeys) this.level.storeys = resized.storeys;
    this.mutated();
    this.editor.fit();
  }

  setProp(key, value) {
    this.level[key] = value;
    this.changed('live');
  }

  /** Takhøyde/vanndybde for etasjen, himmel/lysfarge for bygget: også skissen må tegnes på nytt. */
  setRoomProp(key, value) {
    (key === 'height' || key === 'waterDepth' ? this.editor.level : this.level)[key] = value;
    this.editor.refresh();
    this.changed('live');
  }

  setFog(v) {
    this.level.fog = v;
    this.dirty = true;
    this.viewer.updateSettings({});
    this._refreshUI();
    this._saveDraftSoon();
  }

  fillLights() {
    this.editor.checkpoint();
    autoLights(this.editor.level, { spacing: getTheme(this.level.theme).lightSpacing, flicker: 0.04, broken: 0.03 });
    this.mutated();
  }

  clearLights() {
    this.editor.checkpoint();
    clearLights(this.editor.level);
    this.mutated();
  }

  /** «Make it wrong»: små endringer som gjør rommet litt feil; stedene vises en kort stund i skissen. */
  makeWrong(strength) {
    this.editor.checkpoint();
    const changes = makeWrong(this.editor.level, strength);
    this.mutated();
    this.editor.highlight(changeMarkers(changes), 6000);
    toast(`${changes.length} small things are now wrong. Can you find them? (Ctrl+Z undoes)`, { ms: 5000 });
  }

  setHelper(key, on) {
    this.settings[key] = on;
    this.editor[key] = on;
    saveSettings(this.settings);
    this.sidebar.syncHelpers(this.settings);
    this.editor.invalidate();
  }

  /** Går i rommet i fullskjerm (Esc tilbake). drift: drømmegange (view3d/drift.js). */
  walk({ drift = false } = {}) {
    if (this.layout.layout === '2d') this.layout.set('split'); // bygger 3D om det var utsatt (_show3D)
    if (this._pending3D || this._stale3D) this._rebuild();
    if (this.viewer.walkFullscreen() && drift) this.viewer.walk.drift.set(true);
  }

  _schedule3D(ms, throttle) {
    if (this._hidden3D) {
      // Bare 2D vises: ingen ombygging før 3D vises igjen (_show3D) eller man går i rommet.
      clearTimeout(this._pending3D);
      this._pending3D = null;
      this._stale3D = true;
      return;
    }
    if (this._pending3D && throttle) return;
    clearTimeout(this._pending3D);
    this._pending3D = setTimeout(() => this._rebuild(), ms);
  }

  /** 3D-panelet vises eller skjules (2D-visningen): skjult tegnes og bygges ingenting i 3D. */
  _show3D(on) {
    this._hidden3D = !on;
    if (this.viewer) this.viewer.hidden = !on;
    if (on && this._stale3D) this._rebuild();
  }

  _rebuild() {
    clearTimeout(this._pending3D);
    this._pending3D = null;
    this._stale3D = false;
    const s = this.viewer.setLevel(this.level);
    $('#status-build').textContent = s ? `3D built in ${s.ms} ms · ${s.vertices.toLocaleString('en-US')} vertices · ${s.lights} lights` : '3D unavailable · 2D editor ready';
  }

  _saveDraftSoon() {
    this.drafts.schedule();
  }

  _syncTool() {
    this.sidebar.syncTool(this.editor);
    $('#status-tool').textContent = toolText(this.editor);
  }

  _refreshBadge() {
    renderBadge(this.level, this.dirty);
  }

  _refreshUI() {
    const floor = this.editor.level; // etasjen som tegnes: egen takhøyde, vanndybde, frø og tall
    this.sidebar.syncLevel({ ...this.level, height: floor.height, waterDepth: floor.waterDepth, seed: floor.seed });
    this.sidebar.syncStats(levelStats(floor));
    this.storeyBar?.sync(this.editor.storey, storeyCount(this.level));
    this.viewer.showStorey(this.editor.storey);
    this._refreshBadge();
    $('#btn-undo').disabled = !this.editor.history.canUndo;
    $('#btn-redo').disabled = !this.editor.history.canRedo;
    // Ruten under pekeren kan ha endret seg uten at pekeren har flyttet seg.
    const hover = this.editor.hover;
    $('#hover-info').textContent = hover ? hoverText(floor, hover.map(Math.floor)) : '';
  }
}

Object.assign(App.prototype, toolMethods);
