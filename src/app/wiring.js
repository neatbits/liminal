// Kobler sidepanelet og knappene i toppmenyen/panelene til appens handlinger.
import { clampHeight, clampDepth } from '../core/level.js';
import { $ } from '../ui/dom.js';
import { generateInto } from './actions.js';

/** Handlingene Sidebar kaller (se Sidebar-konstruktøren). */
export function sidebarActions(app) {
  return {
    tool: (id) => app.setTool(id),
    shape: (id) => app.setShape(id),
    brush: (d) => app.setBrush(app.editor.brush + d),
    zoneValue: (layer, v) => app.setZoneValue(layer, v),
    doorState: (state) => app.setDoorState(state),
    slideTube: (tube) => app.setSlideTube(tube),
    slideColor: (color) => app.setSlideColor(color),
    objectId: (id) => app.setObjectId(id),
    rename: (name) => app.rename(name),
    theme: (id) => app.setTheme(id),
    size: (w, h) => app.setSize(w, h),
    height: (v) => app.setRoomProp('height', clampHeight(v)),
    waterDepth: (v) => app.setRoomProp('waterDepth', clampDepth(v)),
    sky: (id) => app.setRoomProp('sky', id),
    bright: (v) => app.setProp('bright', v),
    fog: (v) => app.setFog(v),
    fillLights: () => app.fillLights(),
    makeWrong: (strength) => app.makeWrong(strength),
    clearLights: () => app.clearLights(),
    generate: () => generateInto(app),
    grid: (on) => app.setHelper('grid', on),
    rulers: (on) => app.setHelper('rulers', on),
  };
}

/** Angre/gjør om, tilpass, gå i rommet og visningsknappene over 3D-panelet. */
export function bindButtons(app) {
  $('#btn-undo').onclick = () => app.editor.undo();
  $('#btn-redo').onclick = () => app.editor.redo();
  $('#btn-fit').onclick = () => app.editor.fit();
  $('#btn-walk-top').onclick = () => app.walk(true);
  $('#view-actions').addEventListener('click', (e) => {
    const view = e.target.closest('[data-view]')?.dataset.view;
    if (view === 'walk') app.walk(false);
    else if (view === 'fullscreen') app.walk(true);
    else if (view === 'photo') app.viewer.photo();
    else if (view === 'drift') {
      app.walk(false);
      app.viewer.walk.drift.set(true);
    }
    else if (view) app.viewer.view(view);
  });
}
