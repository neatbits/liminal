// Musikk av og på (settings.music): sangene i music/ spilles i tilfeldig rekkefølge i loop, med et <audio>-
// element (strømmes, så bare sangen som spilles lastes). Myk inn- og uttoning. Nettleseren slipper
// ikke lyd fram før brukeren har gjort noe, så er musikken på fra forrige gang, starter den ved
// første klikk eller tastetrykk.
import { tracksFrom, shuffled, fadeStep } from './playlist.js';

export const TRACKS = tracksFrom(import.meta.glob('../../music/*.mp3', { query: '?url', import: 'default', eager: true }));

const LEVEL = 0.5; // musikken i forhold til volumet i innstillingene
const FADE = 1.2; // sekunder
const STEP = 30; // ms mellom hvert steg i toningen

export class Music {
  constructor() {
    this.on = false;
    this.volume = 0.8;
    this.audio = null;
    this.order = shuffled(TRACKS.length);
    this.pos = 0;
    this.level = 0; // nåværende styrke under toningen (0–1)
    this._fader = 0;
  }

  get title() {
    return TRACKS[this.order[this.pos]]?.title ?? '';
  }

  setVolume(v) {
    this.volume = v;
    if (this.audio) this.audio.volume = this._gain();
  }

  setOn(on) {
    const next = !!on && TRACKS.length > 0;
    if (next === this.on) return;
    this.on = next;
    if (this.on) this._play();
    this._fade();
  }

  _gain() {
    return Math.min(1, this.volume * LEVEL * this.level);
  }

  _ensure() {
    if (this.audio) return this.audio;
    const a = new Audio();
    a.preload = 'auto';
    a.addEventListener('ended', () => {
      this.pos++;
      // Ny runde i ny tilfeldig rekkefølge (ikke den samme sangen to ganger på rad).
      if (this.pos >= this.order.length) [this.order, this.pos] = [shuffled(TRACKS.length, Math.random, this.order.at(-1)), 0];
      this._load();
      this._play();
    });
    this.audio = a;
    this._load();
    return a;
  }

  _load() {
    this.audio.src = TRACKS[this.order[this.pos]].url;
  }

  _play() {
    const a = this._ensure();
    a.play().catch(() => {
      // Ingen brukerhandling ennå: prøv igjen ved første klikk eller tastetrykk.
      const retry = () => this.on && a.play().catch(() => {});
      addEventListener('pointerdown', retry, { once: true });
      addEventListener('keydown', retry, { once: true });
    });
  }

  // Med klokke og ikke skjermbilder: toningen må bli ferdig også når vinduet er skjult eller minimert.
  _fade() {
    clearInterval(this._fader);
    let last = performance.now();
    this._fader = setInterval(() => {
      const now = performance.now();
      const target = this.on ? 1 : 0;
      this.level = fadeStep(this.level, target, (now - last) / FADE / 1000);
      last = now;
      if (this.audio) this.audio.volume = this._gain();
      if (this.level !== target) return;
      clearInterval(this._fader);
      if (!this.on) this.audio?.pause();
    }, STEP);
  }
}
