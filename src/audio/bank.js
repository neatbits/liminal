// Lydbuffere som lages litt etter litt i bakgrunnen (noen tusen prøver per runde), så tunge,
// syntetiserte lyder (brølet og Nightmare-lydene i eerie-night.js) er klare når de skal spilles
// – uten å stoppe bildet i 50 ms mens de regnes ut. Oppskriften er (sampleRate) → { seconds, fn, peak },
// der fn(t, i) gir prøve i (i rekkefølge, så fn kan ha tilstand). Ingen DOM.
import { normalize } from './buffers.js';

const SLICE = 8192; // prøver per runde: et par millisekunder

export class SoundBank {
  /** @param schedule kjører neste runde senere (standard: setTimeout 0, så bildene kommer imellom) */
  constructor(ctx, recipes, schedule = (fn) => setTimeout(fn, 0)) {
    this.ctx = ctx;
    this.recipes = recipes;
    this.schedule = schedule;
    this.ready = new Map(); // navn → ferdig buffer
    this.queue = [];
    this.current = null; // navnet som lages nå
  }

  /** Sørger for at én variant av hver lyd er klar eller på vei. */
  prepare(...names) {
    for (const name of names) {
      if (this.ready.has(name) || this.current === name || this.queue.includes(name)) continue;
      this.queue.push(name);
    }
    this._next();
  }

  /** En ferdig variant (og en ny begynner å lages, så neste blir litt annerledes), eller null. */
  take(name) {
    const buffer = this.ready.get(name) ?? null;
    if (buffer) {
      this.ready.delete(name);
      this.prepare(name);
    }
    return buffer;
  }

  _next() {
    if (this.current || !this.queue.length) return;
    const name = (this.current = this.queue.shift());
    const sr = this.ctx.sampleRate;
    const { seconds, fn, peak = 0.8 } = this.recipes[name](sr);
    const buffer = this.ctx.createBuffer(1, Math.max(1, Math.floor(sr * seconds)), sr);
    const d = buffer.getChannelData(0);
    let i = 0;
    const step = () => {
      const end = Math.min(d.length, i + SLICE);
      for (; i < end; i++) d[i] = fn(i / sr, i);
      if (i < d.length) return this.schedule(step);
      normalize(d, peak);
      this.ready.set(name, buffer);
      this.current = null;
      this._next();
    };
    this.schedule(step);
  }
}
