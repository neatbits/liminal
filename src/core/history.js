// Angre/gjør om med øyeblikksbilder av rutenettet. Et bilde tas *før* en endring.
// Med etasjer (core/storeys.js) gjelder et bilde én etasje (`storey`), eller hele bygget ('all':
// størrelse og etasjelisten). Bildet husker etasjenummeret, ikke objektet.
import { LAYERS, cloneLevel } from './level.js';
import { storeyLevel } from './storeys.js';

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

/** Bilde av etasje `storey` i rommet, eller av hele bygget ('all'). */
function capture(room, storey) {
  const start = room.spawnStorey ?? 0; // etasjen man starter i (startpunktet kan flyttes til en annen etasje)
  if (storey !== 'all') return { ...snapshot(storeyLevel(room, storey)), storey, start };
  return { all: true, base: snapshot(room), storeys: (room.storeys ?? []).map(cloneLevel), start };
}

function restore(room, snap) {
  room.spawnStorey = snap.start;
  if (!snap.all) return applySnapshot(storeyLevel(room, snap.storey), snap);
  applySnapshot(room, snap.base);
  room.storeys = snap.storeys.map(cloneLevel);
}

function unchanged(room, snap) {
  if ((room.spawnStorey ?? 0) !== snap.start) return false;
  if (!snap.all) return sameContent(snap, storeyLevel(room, snap.storey));
  const now = room.storeys ?? [];
  return sameContent(snap.base, room) && now.length === snap.storeys.length && now.every((s, i) => sameContent(snap.storeys[i], s));
}

function sameContent(a, b) {
  if (a.w !== b.w || a.h !== b.h || a.seed !== b.seed || a.slides !== b.slides || a.objects !== b.objects) return false;
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
    this.pending = null;
  }

  get canUndo() {
    return this.undoStack.length > 0;
  }

  get canRedo() {
    return this.redoStack.length > 0;
  }

  /** Kalles før en endring i etasje `storey` (0 = rommet), eller 'all' for hele bygget. */
  push(room, storey = 0) {
    const snap = capture(room, storey);
    this.pending = { snap, redo: this.redoStack.slice(), evicted: null };
    this.undoStack.push(snap);
    if (this.undoStack.length > this.limit) this.pending.evicted = this.undoStack.shift();
    this.redoStack.length = 0;
  }

  /** Fjerner siste bilde hvis endringen likevel ikke endret noe (f.eks. klikk uten effekt). */
  dropIfUnchanged(room) {
    const last = this.undoStack[this.undoStack.length - 1];
    if (last && unchanged(room, last)) {
      this.undoStack.pop();
      if (this.pending?.snap === last) {
        this.redoStack = this.pending.redo;
        if (this.pending.evicted) this.undoStack.unshift(this.pending.evicted);
      }
    }
    this.pending = null;
  }

  /** Angrer siste endring. Returnerer { storey } (eller { all: true }) for det som ble endret, ellers false. */
  undo(room) {
    return this._step(room, this.undoStack, this.redoStack);
  }

  redo(room) {
    return this._step(room, this.redoStack, this.undoStack);
  }

  _step(room, from, to) {
    this.dropIfUnchanged(room);
    const snap = from.pop();
    if (!snap) return false;
    to.push(capture(room, snap.all ? 'all' : snap.storey));
    restore(room, snap);
    return snap.all ? { all: true } : { storey: snap.storey };
  }

  clear() {
    this.pending = null;
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }
}
