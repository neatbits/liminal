// Kobler sidepanelet og knappene i toppmenyen/panelene til appens handlinger.
import { clampHeight, clampDepth } from '../core/level.js';
import { $ } from '../ui/dom.js';
import { generateInto } from './actions.js';
import { TINTS } from '../core/tints.js';
import { StoreyBar } from '../ui/storey-bar.js';
import { goStorey, addStorey, removeCurrentStorey } from './storey-actions.js';

/** Handlingene Sidebar kaller (se Sidebar-konstruktøren). */
export function sidebarActions(app) {
  return {
    tool: (id) => app.setTool(id),
    shape: (id) => app.setShape(id),
    brush: (d) => app.setBrush(app.editor.brush + d),
    zoneValue: (layer, v) => app.setZoneValue(layer, v),
    doorState: (state) => app.setDoorState(state),
    cornerKind: (kind) => app.setCornerKind(kind),
    pillarDiameter: (diameter) => { app.editor.pillarDiameter = diameter; app.setTool(app.editor.tool.id); },
    slideTube: (tube) => app.setSlideTube(tube),
    escalatorDown: (down) => app.setEscalatorDown(down),
    slideColor: (color) => app.setSlideColor(color),
    ledColor: (v) => app.setLedColor(v),
    panelType: (v) => app.setPanelType(v),
    objectId: (id) => app.setObjectId(id),
    rename: (name) => app.rename(name),
    theme: (id) => app.setTheme(id),
    size: (w, h) => app.setSize(w, h),
    height: (v) => app.setRoomProp('height', clampHeight(v)),
    waterDepth: (v) => app.setRoomProp('waterDepth', clampDepth(v)),
    sky: (id) => app.setRoomProp('sky', id),
    tint: (id) => app.setRoomProp('tint', id === 'theme' ? null : id),
    bright: (v) => app.setProp('bright', v),
    fog: (v) => app.setFog(v),
    fillLights: () => app.fillLights(),
    makeWrong: (strength) => app.makeWrong(strength),
    clearLights: () => app.clearLights(),
    generate: (seed) => generateInto(app, seed),
    grid: (on) => app.setHelper('grid', on),
    rulers: (on) => app.setHelper('rulers', on),
  };
}

/** Angre/gjør om, tilpass, gå i rommet og visningsknappene over 3D-panelet. */
export function bindButtons(app) {
  $('#btn-undo').onclick = () => app.editor.undo();
  $('#btn-redo').onclick = () => app.editor.redo();
  $('#btn-fit').onclick = () => app.editor.fit();
  app.storeyBar = new StoreyBar({
    go: (k) => goStorey(app, k),
    add: () => addStorey(app),
    copy: () => addStorey(app, { copy: true }),
    remove: () => removeCurrentStorey(app),
  });
  $('#btn-fit').before(app.storeyBar.root);
  $('#btn-walk-top').onclick = () => app.walk();
  $('#btn-drift').onclick = () => app.walk({ drift: true });
  const mood = $('#mood-select');
  mood.value = app.settings.mood;
  mood.onchange = () => app.viewer.setMood(mood.value);
  app.viewer.options.onMoodChange = (id) => (mood.value = id);
  // Lysfargen i visningen: rommets, eller en annen som overstyrer den (core/tints.js).
  const light = $('#light-select');
  for (const [id, t] of [['room', { label: "Room's light" }], ...Object.entries(TINTS)]) light.append(new Option(t.label, id));
  light.value = app.settings.light;
  light.onchange = () => {
    app.settings.light = light.value;
    app.viewer.options.onSettingsChange?.(app.settings);
  };
  const size = $('#size-select'); // størrelsen på de uendelige nivåene, fra neste nivå (gen/sizes.js)
  size.value = app.settings.levelSize;
  size.onchange = () => {
    app.settings.levelSize = size.value;
    app.viewer.options.onSettingsChange?.(app.settings);
  };
  // Musikken (audio/music.js) kan også slås av og på i gåmodus (N): knappen følger innstillingen.
  const music = $('#btn-music');
  const save = app.viewer.options.onSettingsChange;
  const syncMusic = () => music.classList.toggle('active', !!app.settings.music);
  app.viewer.options.onSettingsChange = (s) => (save?.(s), syncMusic());
  syncMusic();
  music.onclick = () => app.viewer.toggle('music');
  $('#view-actions').addEventListener('click', (e) => {
    const view = e.target.closest('[data-view]')?.dataset.view;
    if (view === 'photo') app.viewer.photo();
    else if (view) app.viewer.view(view);
  });
}
