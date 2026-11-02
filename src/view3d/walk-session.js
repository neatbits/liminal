// Pause og gjenopptaking av gåmodus. Berøring trenger ikke pointer lock; desktop
// pauser når musa slippes. Et uttrykkelig Resume tillater også fallback med dra-mus.
import { isTyping } from '../ui/dom.js';

export class WalkSession {
  constructor(walk) {
    this.walk = walk;
    this.paused = false;
    this.focused = true;
    this.touch = globalThis.matchMedia?.('(pointer: coarse)').matches ?? false;
    window.addEventListener('keydown', (e) => {
      if (!walk.active || this.paused || e.repeat || e.ctrlKey || e.metaKey || isTyping(e)) return;
      if (e.code === 'KeyE') walk.useDoor();
      else if (e.code === 'KeyC') this.crawl();
      else if (e.code === 'KeyF') this.flash();
    });
    document.addEventListener('pointerlockchange', () => this.syncLock());
    window.addEventListener('blur', () => {
      this.focused = false;
      if (walk.active) this.setPaused(true);
    });
    window.addEventListener('focus', () => { this.focused = true; });
    document.addEventListener('visibilitychange', () => document.hidden && walk.active && this.setPaused(true));
  }

  /** C (eller knappen på mobil): ned på alle fire, eller opp igjen. */
  crawl() {
    const w = this.walk;
    if (w.active && !this.paused && !w.climb?.active && !w.rider.active) w.walker.toggleCrawl();
  }

  /** F (eller knappen på mobil): lommelykten. */
  flash() {
    const w = this.walk;
    if (w.active && !this.paused) w.flashlight.toggle(w.sound ? w.audio : null);
  }

  syncLock() {
    const w = this.walk;
    w.input.locked = document.pointerLockElement === w.canvas;
    this.setPaused(w.active && (document.hidden || !this.focused || (!w.input.locked && !this.touch)));
  }

  resume() {
    this.focused = true; // uttrykkelig brukerhandling, også ved dra-mus-fallback
    this.setPaused(false);
  }

  setPaused(on) {
    const w = this.walk;
    const changed = this.paused !== on || w.input.enabled !== (w.active && !on);
    this.paused = on;
    w.input.enabled = w.active && !on;
    if (changed) {
      w.input.reset();
      if (on || !w.active) {
        w.walker.vx = w.walker.vz = 0;
        w.audio.stop();
      } else if (w.sound) w.audio.start(w.theme);
    }
    w.hud.setLocked(w.input.locked, w.active, on);
  }
}

/** Venter bare mens gåmodus kjører. Utgang eller en ny økt avbryter gamle overganger. */
export async function waitWhileWalking(viewer, ms, current) {
  while (ms > 0) {
    if (viewer.mode !== 'walk' || !current()) return false;
    const start = performance.now();
    const paused = viewer.walk.paused;
    await new Promise((resolve) => setTimeout(resolve, Math.min(ms, 50)));
    if (!paused && !viewer.walk.paused) ms -= performance.now() - start;
  }
  return viewer.mode === 'walk' && current();
}
