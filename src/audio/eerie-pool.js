// En ferdig variant av hver skummel lyd i temaet, laget i bakgrunnen (audio/eerie-worker.js): å syntetisere en lyd når den
// skal spilles, tok opptil 100 ms midt i et bilde. take(name) gir en ferdig variant og bestiller en ny (så de fortsatt
// varierer), eller null når ingen er klar ennå – da hoppes lyden over denne gangen. Uten bakgrunnstråd lages den her.
import { eerieBuffer } from './eerie.js';

export class EeriePool {
  constructor(ctx) {
    this.ctx = ctx;
    this.ready = new Map(); // navn → AudioBuffer
    this.asked = new Set();
    try {
      this.worker = new Worker(new URL('./eerie-worker.js', import.meta.url), { type: 'module' });
      this.worker.onmessage = ({ data }) => this._arrived(data);
      this.worker.onerror = () => (this.worker = null);
    } catch {
      this.worker = null;
    }
  }

  /** Sørger for at én variant av hver lyd er klar eller på vei. */
  prepare(names) {
    if (!this.worker) return;
    for (const name of new Set(names)) {
      if (this.ready.has(name) || this.asked.has(name)) continue;
      this.asked.add(name);
      this.worker.postMessage({ id: name, name, sampleRate: this.ctx.sampleRate });
    }
  }

  /** En ferdig variant (og en ny bestilles), null når den ikke er klar – eller laget her, uten bakgrunnstråd. */
  take(name) {
    if (!this.worker) return eerieBuffer(this.ctx, name);
    const buffer = this.ready.get(name) ?? null;
    if (buffer) this.ready.delete(name);
    this.prepare([name]);
    return buffer;
  }

  _arrived({ name, sampleRate, channels, error }) {
    this.asked.delete(name);
    if (error || !channels) return;
    const buffer = this.ctx.createBuffer(channels.length, channels[0].length, sampleRate);
    channels.forEach((c, i) => buffer.copyToChannel(c, i));
    this.ready.set(name, buffer);
  }
}
