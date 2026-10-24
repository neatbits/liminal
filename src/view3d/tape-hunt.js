// Målet i den uendelige utforskingen: på genererte nivåer er dørene til ingensteds låst til alle
// kassettene er funnet (gen/tapes.js exitsLocked). Kassettene summer, sterkere jo nærmere man er
// (audio/tape-hum.js), og dypeste nivå og kassetter funnet i alt huskes (core/storage.js).
// Rommet fra editoren og drømmegangen er som før.
import { exitsLocked, reachableCells } from '../gen/tapes.js';
import { loadProgress, saveProgress } from '../core/storage.js';
import { tapeHum, lockedDoor } from '../audio/tape-hum.js';

const HEAR = 14; // m: så langt unna kan man høre en kassett

export class TapeHunt {
  constructor(explorer) {
    this.ex = explorer;
    this.progress = loadProgress();
    this._explained = false;
  }

  get locked() {
    const { depth, tapes, v } = this.ex;
    return exitsLocked({ depth, left: tapes.left, drifting: v.walk.drift.on });
  }

  /** Teksten i dørprompten for en låst dør til ingensteds, ellers null. */
  lockText() {
    return this.locked ? `The door is locked · 📼 ${this.ex.found}/${this.ex.total}` : null;
  }

  /**
   * Prøver å gå gjennom en dør til ingensteds. En låst dør åpnes likevel hvis ingen av de
   * gjenværende kassettene kan nås lenger (rommet har endret seg bak ryggen på en).
   */
  tryExit() {
    if (!this.locked) return true;
    const { v, tapes } = this.ex;
    const w = v.walk.walker, level = v.walk.level;
    const reach = reachableCells(level, w.x, w.z);
    if (!tapes.items.some((t) => reach[Math.floor(t.z) * level.w + Math.floor(t.x)])) return true;
    if (v.walk.sound) lockedDoor(v.audio);
    v.hud.flash(`The door won't open. 📼 ${this.ex.found} of ${this.ex.total} tapes found. Listen for the rest.`, 3500);
    return false;
  }

  /** Et nytt nivå er nådd. */
  reached(depth) {
    if (depth > this.progress.deepest) {
      this.progress.deepest = depth;
      saveProgress(this.progress);
    }
    if (!this._explained && this.locked) {
      this._explained = true;
      clearTimeout(this._hint);
      this._hint = setTimeout(() => this.ex.v.hud.flash('The doors here are locked. Find the tapes – they hum when you are close.', 5000), 2600);
    }
  }

  /** Kassetter plukket opp nå: melding, og fremgangen lagres. */
  pickedUp(got) {
    const { found, total, tapes, depth } = this.ex;
    this.progress.tapes += got;
    saveProgress(this.progress);
    const all = !tapes.left;
    this.ex.v.hud.flash(all && depth > 0 ? `📼 ${found} of ${total} – the doors are open` : all ? `📼 Tape ${found} of ${total} – all tapes on this level found` : `📼 Tape ${found} of ${total}`);
  }

  /** Summingen fra den nærmeste kassetten, panorert mot den. */
  update() {
    const v = this.ex.v, w = v.walk.walker;
    let best = null, d = Infinity;
    for (const t of this.ex.tapes.items) {
      const dist = Math.hypot(t.x - w.x, t.z - w.z, (t.y - w.floorY) * 0.5);
      if (dist < d) [best, d] = [t, dist];
    }
    const level = best && v.walk.sound ? Math.max(0, 1 - d / HEAR) ** 2 : 0;
    // Høyre for blikket: (cos yaw, −sin yaw), se Walker.update.
    const pan = best ? ((best.x - w.x) * Math.cos(w.yaw) - (best.z - w.z) * Math.sin(w.yaw)) / (d || 1) : 0;
    tapeHum(v.audio, level, pan);
  }

  /** «Deepest 12» i gålinjen når man har vært dypere enn der man er nå. */
  extra() {
    const { deepest } = this.progress;
    return deepest > this.ex.depth ? `Deepest ${deepest}` : null;
  }

  stop() {
    clearTimeout(this._hint);
    tapeHum(this.ex.v.audio, 0);
  }
}
