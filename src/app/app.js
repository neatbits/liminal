// App-kontrolleren: eier rommet og holder 2D-skissen, 3D-visningen og panelene i synk.
import { resizeLevel } from '../core/level.js';
import { levelStats } from '../core/stats.js';
import { applySnapshot } from '../core/history.js';
import { autoLights, clearLights } from '../core/ops.js';
import { makeWrong, changeMarkers } from '../gen/wrong.js';
import { getTheme } from '../core/themes.js';
import { loadSettings, saveSettings, saveDraft } from '../core/storage.js';
import { Editor } from '../editor/editor.js';
import { Viewer } from '../view3d/viewer.js';
import { Sidebar } from '../ui/sidebar.js';
import { setupLayout } from '../ui/layout.js';
import { buildMenus } from '../ui/menus.js';
import { $ } from '../ui/dom.js';
import { toast } from '../ui/toast.js';
import { menuConfig } from './menu-config.js';
import { bindShortcuts } from './shortcuts.js';
import { hoverText, toolText, renderBadge } from './status.js';
import { sidebarActions, bindButtons } from './wiring.js';

export class App {
  constructor() {
    this.settings = loadSettings();
    this.level = null;
    this.dirty = false;
    this.editor = new Editor($('#editor-canvas'), {
      onChange: (kind) => this.changed(kind),
      onHover: (cell) => ($('#hover-info').textContent = hoverText(this.level, cell)),
      onHint: (text) => toast(text, { ms: 4500 }),
    });
    this.editor.grid = this.settings.grid;
    this.editor.rulers = this.settings.rulers;
    this.viewer = new Viewer($('#viewport3d'), {
      settings: this.settings,
      onModeChange: (mode) => $('[data-view="walk"]').classList.toggle('active', mode === 'walk'),
      onSettingsChange: () => saveSettings(this.settings),
    });
    this.sidebar = new Sidebar($('#sidebar'), sidebarActions(this));
    this.sidebar.syncHelpers(this.settings);
    this.layout = setupLayout({
      app: $('#app'),
      toggle: $('#layout-toggle'),
      splitter: $('#splitter'),
      workspace: $('.workspace'),
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
    this._schedule3D(kind === 'live' ? 160 : 30, kind === 'live');
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

  setTool(id) {
    this.editor.setTool(id);
    this._syncTool();
  }

  setShape(id) {
    this.editor.setShape(id);
    this._syncTool();
  }

  setBrush(n) {
    this.editor.setBrush(n);
    this._syncTool();
  }

  setZoneValue(layer, metres) {
    this.editor.setZoneValue(layer, metres);
    this._syncTool();
  }

  setDoorState(state) {
    this.editor.setDoorState(state);
    this._syncTool();
  }

  setSlideTube(tube) {
    this.editor.setSlideTube(tube);
    this._syncTool();
  }

  setSlideColor(color) {
    this.editor.setSlideColor(color);
    this._syncTool();
  }

  setObjectId(id) {
    this.editor.setObjectId(id);
    this._syncTool();
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
    this.editor.checkpoint();
    applySnapshot(this.level, resizeLevel(this.level, w, h));
    this.mutated();
    this.editor.fit();
  }

  setProp(key, value) {
    this.level[key] = value;
    this.changed('live');
  }

  /** Takhøyde/vanndybde for hele rommet: også skissen må tegnes på nytt (soner, farger). */
  setRoomProp(key, value) {
    this.level[key] = value;
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
    autoLights(this.level, { spacing: getTheme(this.level.theme).lightSpacing, flicker: 0.04, broken: 0.03 });
    this.mutated();
  }

  clearLights() {
    this.editor.checkpoint();
    clearLights(this.level);
    this.mutated();
  }

  /** «Make it wrong»: små endringer som gjør rommet litt feil; stedene vises en kort stund i skissen. */
  makeWrong(strength) {
    this.editor.checkpoint();
    const changes = makeWrong(this.level, strength);
    this.mutated();
    this.editor.highlight(changeMarkers(changes), 6000);
    toast(`${changes.length} small things are now wrong. Can you find them? (Ctrl+Z undoes)`, { ms: 5000 });
  }

  toggleWaterReflections() {
    this.settings.waterReflections = !this.settings.waterReflections;
    saveSettings(this.settings);
    this.viewer.updateSettings({});
    toast(`Water reflections ${this.settings.waterReflections ? 'on' : 'off'}`);
  }

  setHelper(key, on) {
    this.settings[key] = on;
    this.editor[key] = on;
    saveSettings(this.settings);
    this.sidebar.syncHelpers(this.settings);
    this.editor.invalidate();
  }

  /** Gå i rommet – i 3D-panelet, eller i fullskjerm. */
  walk(fullscreen) {
    if (this.layout.layout === '2d') this.layout.set('split');
    if (this._pending3D) this._rebuild();
    if (fullscreen) this.viewer.toggleFullscreen();
    else this.viewer.enterWalk();
  }

  _schedule3D(ms, throttle) {
    if (this._pending3D && throttle) return;
    clearTimeout(this._pending3D);
    this._pending3D = setTimeout(() => this._rebuild(), ms);
  }

  _rebuild() {
    clearTimeout(this._pending3D);
    this._pending3D = null;
    const s = this.viewer.setLevel(this.level);
    $('#status-build').textContent = `3D built in ${s.ms} ms · ${s.vertices.toLocaleString('en-US')} vertices · ${s.lights} lights`;
  }

  _saveDraftSoon() {
    clearTimeout(this._draftTimer);
    this._draftTimer = setTimeout(() => saveDraft(this.level), 600);
  }

  _syncTool() {
    this.sidebar.syncTool(this.editor);
    $('#status-tool').textContent = toolText(this.editor);
  }

  _refreshBadge() {
    renderBadge(this.level, this.dirty);
  }

  _refreshUI() {
    this.sidebar.syncLevel(this.level);
    this.sidebar.syncStats(levelStats(this.level));
    this._refreshBadge();
    $('#btn-undo').disabled = !this.editor.history.canUndo;
    $('#btn-redo').disabled = !this.editor.history.canRedo;
    // Ruten under pekeren kan ha endret seg uten at pekeren har flyttet seg.
    const hover = this.editor.hover;
    $('#hover-info').textContent = hover ? hoverText(this.level, hover.map(Math.floor)) : '';
  }
}
