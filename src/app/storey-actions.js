// Etasjene i editoren: bytte, legge til, kopiere og fjerne (core/storeys.js). Endringer i
// etasjelisten lagres som angre-punkt for hele bygget.
import { storeyCount, insertStorey, insertBelow, removeStorey, copyStorey, MAX_STOREYS } from '../core/storeys.js';
import { toast } from '../ui/toast.js';

/** Bytter til etasje k (0 = nederst), om den finnes. */
export function goStorey(app, k) {
  if (k < 0 || k >= storeyCount(app.level) || k === app.editor.storey) return;
  app.editor.setStorey(k);
}

/** Ny tom etasje øverst, nederst (below: en kjeller) eller (copy) en kopi av etasjen man står i rett over den. */
export function addStorey(app, { copy = false, below = false } = {}) {
  const ed = app.editor;
  ed.checkpoint(true);
  const k = below ? insertBelow(app.level) : copy ? insertStorey(app.level, ed.storey + 1, copyStorey(app.level, ed.storey)) : insertStorey(app.level, storeyCount(app.level));
  if (k < 0) {
    ed.settle();
    toast(`A room can have at most ${MAX_STOREYS} floors.`, { error: true });
    return;
  }
  ed.setStorey(k);
  app.mutated();
  toast(below ? 'Added a floor below – you still start on the floor you started on' : copy ? `Floor ${k + 1} is a copy of floor ${k} – Ctrl+Z to undo` : `Added floor ${k + 1} – the floor below shows faintly in blue`);
}

/** Fjerner etasjen man står i (ikke den eneste). */
export function removeCurrentStorey(app) {
  const ed = app.editor;
  if (storeyCount(app.level) < 2) return;
  ed.checkpoint(true);
  const k = ed.storey;
  removeStorey(app.level, k);
  ed.setStorey(Math.max(0, k - 1));
  app.mutated();
  toast(`Removed floor ${k + 1} – Ctrl+Z to undo`);
}
