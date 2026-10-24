// Utkast lagres etter en kort pause, og straks når fanen skjules eller siden forlates.
// Én feilmelding per sammenhengende lagringsfeil; nye endringer prøver på nytt.
import { saveDraft } from '../core/storage.js';

export class DraftSaver {
  constructor(readLevel, onError) {
    this.readLevel = readLevel;
    this.onError = onError;
    this.pending = false;
    this.failed = false;
    window.addEventListener('pagehide', () => this.flush());
    document.addEventListener('visibilitychange', () => document.hidden && this.flush());
  }

  schedule() {
    this.pending = true;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 600);
  }

  flush() {
    clearTimeout(this.timer);
    if (!this.pending) return;
    this.pending = false;
    const level = this.readLevel();
    if (!level) return;
    const ok = saveDraft(level);
    if (!ok && !this.failed) this.onError();
    this.failed = !ok;
    return ok;
  }
}
