// Angre/gjør om med øyeblikksbilder av rutenettet. Et bilde tas *før* en endring.
import { LAYERS } from './level.js';

// Sklie- og gjenstandslistene endres aldri på stedet, så de kan deles mellom bildene og
// sammenlignes med ===.

export function snapshot(level) {
  const snap = { w: level.w, h: level.h, spawn: { ...level.spawn }, slides: level.slides, objects: level.objects, seed: level.seed };
  for (const key of LAYERS) snap[key] = level[key].slice();
  return snap;
}

/** Kopierer form og innhold (w, h, alle lag, sklier, spawn) inn i et eksisterende rom. */
export function applySnapshot(level, snap) {
  level.w = snap.w;
  level.h = snap.h;
  for (const key of LAYERS) level[key] = snap[key].slice();
  level.slides = snap.slides ?? [];
  level.objects = snap.objects ?? [];
  level.spawn = { ...snap.spawn };
  level.seed = snap.seed; // frøet rommet ble generert fra (følger med når man angrer)
}

function sameContent(a, b) {
  if (a.w !== b.w || a.h !== b.h || a.slides !== b.slides || a.objects !== b.objects) return false;
  if (a.spawn.x !== b.spawn.x || a.spawn.z !== b.spawn.z || a.spawn.a !== b.spawn.a) return false;
  for (const key of LAYERS) {
    const x = a[key];
    const y = b[key];
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
  }
  return true;
}

export class History {
  constructor(limit = 100) {
    this.limit = limit;
    this.undoStack = [];
    this.redoStack = [];
  }

  get canUndo() {
    return this.undoStack.length > 0;
  }

  get canRedo() {
    return this.redoStack.length > 0;
  }

  /** Kalles før en endring. */
  push(level) {
    this.undoStack.push(snapshot(level));
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack.length = 0;
  }

  /** Fjerner siste bilde hvis endringen likevel ikke endret noe (f.eks. klikk uten effekt). */
  dropIfUnchanged(level) {
    const last = this.undoStack[this.undoStack.length - 1];
    if (last && sameContent(last, level)) this.undoStack.pop();
  }

  undo(level) {
    const snap = this.undoStack.pop();
    if (!snap) return false;
    this.redoStack.push(snapshot(level));
    applySnapshot(level, snap);
    return true;
  }

  redo(level) {
    const snap = this.redoStack.pop();
    if (!snap) return false;
    this.undoStack.push(snapshot(level));
    applySnapshot(level, snap);
    return true;
  }

  clear() {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }
}
