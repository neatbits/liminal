// HUD over 3D-vinduet: gålinje, hint, VHS-tekst, lastemelding, korte beskjeder og plask.
import { getMood } from '../gen/moods.js';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function el(tag, cls, html = '') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  e.innerHTML = html;
  return e;
}

export class Hud {
  /** @param actions { exit(), resume(), vhs(), sound(), music(), photo(), mood(), drift() } */
  constructor(root, actions) {
    this.root = el('div', 'hud');
    this.walkbar = el(
      'div',
      'hud-walkbar',
      `<button type="button" data-act="resume" class="hud-resume" title="Keep walking (or click anywhere)">▶ Resume</button>
       <span class="hud-badge">Walking</span>
       <span class="hud-stats"></span>
       <span class="hud-extra"></span>
       <button type="button" data-act="drift" title="Dream walk: drift slowly through the rooms on your own (G)">Drift</button>
       <button type="button" data-act="photo" title="Take a photo (P)">📷 Photo</button>
       <button type="button" data-act="vhs" title="VHS filter (V)">VHS</button>
       <button type="button" data-act="mood" class="hud-mood" title="Mood: Normal → Abandoned → Liminal → Uncanny → Nightmare (X)">Liminal</button>
       <button type="button" data-act="sound" title="Sound on/off (M)">Sound</button>
       <button type="button" data-act="music" title="Music on/off (N)">♪ Music</button>
       <button type="button" data-act="exit" title="Back to the editor (Esc)">✕ Exit</button>`,
    );
    this.hint = el('div', 'hud-hint');
    this.vhs = el('div', 'hud-vhs', '<span class="vhs-play">PLAY ▶</span><span class="vhs-speed">SP</span><span class="vhs-time"></span>');
    this.loading = el('div', 'hud-loading', 'Building the room …');
    this.message = el('div', 'hud-message');
    for (const n of [this.walkbar, this.hint, this.vhs, this.loading, this.message]) {
      n.hidden = true;
      this.root.append(n);
    }
    this.prompt = el('div', 'hud-prompt');
    this.prompt.hidden = true;
    this.root.append(this.prompt);
    this.splash = el('div', 'hud-splash');
    this.root.prepend(this.splash);
    this.shot = el('div', 'hud-shot');
    this.root.prepend(this.shot);
    // Overgang til et nytt nivå: svart, og så en tittel («LEVEL 3», temaets navn).
    this.black = el('div', 'hud-black');
    this.titleCard = el('div', 'hud-title', '<b></b><span></span>');
    this.glitchEl = el('div', 'hud-glitch');
    this.root.append(this.black, this.titleCard, this.glitchEl);
    this.walkbar.addEventListener('click', (e) => {
      const act = e.target.closest('button')?.dataset.act;
      if (act && actions[act]) actions[act]();
    });
    root.append(this.root);
    this._clock = 0;
    this._touch = matchMedia('(pointer: coarse)').matches;
  }

  setWalking(on) {
    this.walkbar.hidden = !on || (!this._touch && !this.root.classList.contains('paused'));
    if (!on) this.hint.hidden = true;
    if (!on) this.root.classList.remove('paused');
  }

  /** «Walking» eller «Sliding» i gålinjen. */
  setRiding(on) {
    this.walkbar.querySelector('.hud-badge').textContent = on ? 'Sliding' : 'Walking';
  }

  /** Kort tekst midt nede, f.eks. «E – open the door»; null skjuler den. */
  setPrompt(text) {
    if (this._promptText === text) return;
    this._promptText = text;
    this.prompt.hidden = !text;
    this.prompt.textContent = text ?? '';
  }

  /** Blågrønt glimt over bildet når man plasker ned i vannet. */
  splashFlash() {
    this.splash.classList.remove('go');
    void this.splash.offsetWidth; // start animasjonen på nytt
    this.splash.classList.add('go');
  }

  /** Drømmegange: gålinjen tones ned, og «Walking» blir «Drifting». */
  setDrifting(on) {
    this.root.classList.toggle('drifting', on);
    this.walkbar.querySelector('[data-act="drift"]').classList.toggle('on', on);
    this.walkbar.querySelector('.hud-badge').textContent = on ? 'Drifting' : 'Walking';
    if (on) this.hint.hidden = true;
  }

  /** Nivå og kassetter i gålinjen, f.eks. «LEVEL 2 · 📼 1/4» (tom tekst skjuler den). */
  setExtra(text) {
    if (this._extra === text) return;
    this._extra = text;
    this.walkbar.querySelector('.hud-extra').textContent = text;
  }

  /** Bildet rives opp i videostøy (når monsteret tar deg). */
  glitch() {
    this.glitchEl.classList.remove('go');
    void this.glitchEl.offsetWidth;
    this.glitchEl.classList.add('go');
  }

  /** Svart over bildet; instant: uten overgang (f.eks. før Game mode viser Level 1). */
  fade(on, instant = false) {
    if (instant) this.black.style.transition = 'none';
    this.black.classList.toggle('on', on);
    if (instant) {
      void this.black.offsetWidth;
      this.black.style.transition = '';
    }
  }

  title(main, sub) {
    this.titleCard.querySelector('b').textContent = main;
    this.titleCard.querySelector('span').textContent = sub;
    this.titleCard.classList.remove('go');
    void this.titleCard.offsetWidth;
    this.titleCard.classList.add('go');
  }

  /** Hvitt blink når man tar et bilde. */
  photoFlash() {
    this.shot.classList.remove('go');
    void this.shot.offsetWidth;
    this.shot.classList.add('go');
  }

  /** PC: kontrollene vises bare på pause. Berøring: behold den trykkbare gålinjen. */
  setLocked(locked, walking, paused = walking && !locked && !this._touch) {
    paused = walking && paused;
    this.root.classList.toggle('paused', paused);
    this.walkbar.hidden = !walking || (!this._touch && !paused);
    this.hint.hidden = !walking || (locked && !paused);
    this.hint.textContent = paused
      ? 'Paused · Click anywhere to keep walking (WASD to walk, Shift to run) · Esc again to exit'
      : this.phoneControls ? 'Left thumb: move · Right thumb: look around'
        : this._touch ? 'Left side: walk · Right side: look around' : 'Drag to look around · WASD to walk · Esc to exit';
  }

  setStats(meters, explored) {
    this.walkbar.querySelector('.hud-stats').textContent = `${Math.round(meters)} m walked · ${Math.round(explored * 100)} % explored`;
  }

  setToggles({ vhs, sound, music, mood }) {
    const m = this.walkbar.querySelector('[data-act="mood"]');
    m.textContent = `Mood: ${getMood(mood).label}`;
    m.dataset.mood = mood;
    this.walkbar.querySelector('[data-act="vhs"]').classList.toggle('on', vhs);
    this.walkbar.querySelector('[data-act="sound"]').classList.toggle('on', sound);
    this.walkbar.querySelector('[data-act="music"]').classList.toggle('on', !!music);
  }

  setVhs(on) {
    this.vhs.hidden = !on;
  }

  setLoading(on) {
    this.loading.hidden = !on;
  }

  flash(text, ms = 2200) {
    this.message.textContent = text;
    this.message.hidden = false;
    clearTimeout(this._msgTimer);
    this._msgTimer = setTimeout(() => (this.message.hidden = true), ms);
  }

  /** Oppdaterer VHS-klokken (et falskt 90-tallsår, ekte klokkeslett). */
  tick(dt) {
    this._clock -= dt;
    if (this.vhs.hidden || this._clock > 0) return;
    this._clock = 0.5;
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    this.vhs.querySelector('.vhs-time').textContent = `${MONTHS[d.getMonth()]}. ${pad(d.getDate())} 1997  ${time}`;
  }
}
