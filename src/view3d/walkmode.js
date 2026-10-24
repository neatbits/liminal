// Gåmodus: kobler sammen gåeren, skliing, dører (E), lek i vannet, input, lyd og HUD-statistikk.
// Gåmodus jobber på en kopi av rommet, så dører man åpner ikke endrer selve rommet.
import { resolveSpawn } from '../core/spawn.js';
import { LIGHT, cloneLevel } from '../core/level.js';
import { DOOR, doorInfo, doorInReach, toggleDoor } from '../core/doors.js';
import { groundAt } from '../core/heights.js';
import { slideEntry } from '../core/slides.js';
import { Walker } from './walker.js';
import { Rider } from './rider.js';
import { WalkInput } from './input.js';
import { WaterPlay } from './water-play.js';
import { Drift } from './drift.js';
import { Loops, textureRepeats } from '../world/anomalies.js';
import { glowSources } from '../core/objects.js';
import { windows } from '../core/windows.js';
import { WalkSession } from './walk-session.js';

export class WalkMode {
  constructor({ canvas, hud, audio }) {
    this.canvas = canvas;
    this.hud = hud;
    this.audio = audio;
    this.walker = new Walker();
    this.rider = new Rider();
    this.input = new WalkInput(canvas);
    this.active = false;
    this.level = null;
    this.theme = null;
    this.field = null;
    this.sound = true;
    this._statsIn = 0;
    this.doors = null;
    this.power = 1; // strømmen (0..1): settes under strømbrudd (view3d/explore.js)
    this.mood = null; // stemningen (gen/moods.js), settes av visningen
    this.play = new WaterPlay(this);
    this.drift = new Drift(this); // drømmegange (G)
    this.session = new WalkSession(this);
  }

  get locked() {
    return this.input.locked;
  }

  get paused() {
    return this.session.paused;
  }

  /** @param extras { objects, balls } fra buildWorld (ender og ballbinger i gåmodus) */
  setWorld(level, theme, field, doors = null, extras = {}) {
    const themeChanged = this.theme && this.theme.id !== theme.id;
    this.level = cloneLevel(level);
    this.doors = doors;
    this.play.setWorld(this.level, extras.objects, extras.balls, extras.water);
    this.screens = glowSources(this.level);
    this.loops = this._loops(theme); // ganger som er lengre innenfra enn utenfra
    this.windows = windows(this.level);
    this.drift.reset();
    this.theme = theme;
    this.field = field;
    if (this.active) {
      this.rider.path = null; // banen kan ha endret seg
      this.hud.setRiding(false);
      this.walker.settle(this.level);
      if (themeChanged && this.sound && !this.paused) this.audio.start(theme);
    }
  }

  /** Starter gåing fra rommets startpunkt. Returnerer false hvis rommet ikke har gulv. */
  enter() {
    const spawn = resolveSpawn(this.level);
    if (!spawn) return false;
    this.walker.reset(this.level, spawn);
    this.loops = this._loops(this.theme);
    this.play.reset();
    this.rider.path = null;
    this.input.reset();
    this.active = true;
    this.hud.setWalking(true);
    this.session.syncLock();
    return true;
  }

  exit() {
    this.active = false;
    this.hud.setPrompt(null);
    this.rider.path = null;
    this.hud.setRiding(false);
    this.input.enabled = false;
    this.input.reset();
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    this.audio.stop();
    this.hud.setWalking(false);
    this.play.reset();
    this.drift.set(false);
  }

  lock() {
    this.session.resume();
    if(this.session.touch)return; // phone controls must retain ordinary touch/pointer events
    const fallback = () => {
      try {
        this.canvas.requestPointerLock()?.catch?.(() => {});
      } catch {
        /* pointer lock støttes ikke (f.eks. mobil) */
      }
    };
    try {
      const p = this.canvas.requestPointerLock({ unadjustedMovement: true });
      if (p?.catch) p.catch(fallback);
    } catch {
      fallback();
    }
  }

  setSound(on) {
    this.sound = on;
    this.audio.setEnabled(on);
    if (on && this.active && !this.paused) this.audio.start(this.theme);
  }

  /** Uendelige ganger – bare når stemningen har avvik (mood.anomalies.loops). */
  _loops(theme) {
    return new Loops(this.level, Math.random, this.mood?.anomalies.loops ? [1, 2] : [0, 0], textureRepeats(theme));
  }

  /** En dør til ingensteds (med dørblad) – i gåmodus fører den videre (onExit). */
  isExit(x, z) {
    const d = doorInfo(this.level, x, z);
    return !!d?.oneSided && d.state !== DOOR.NONE;
  }

  /** E: åpner eller lukker døren man står foran – eller går gjennom en dør til ingensteds. */
  useDoor() {
    if (!this.active || this.paused) return;
    const w = this.walker;
    const door = doorInReach(this.level, w.x, w.z, w.yaw, 1.8, { exits: true });
    if (!door || this.rider.active) return;
    if (door.info.oneSided) return this.onExit?.(door);
    const state = toggleDoor(this.level, door.i, w.x, w.z, 0.28);
    if (state === null) return;
    this.doors?.set(door.i, state);
    if (this.sound) this.audio.door(state === DOOR.OPEN);
  }

  _prompt() {
    const w = this.walker;
    const door = this.rider.active ? null : doorInReach(this.level, w.x, w.z, w.yaw, 1.8, { exits: true });
    const verb = door?.info.oneSided ? 'go through' : door?.info.state === DOOR.CLOSED ? 'open' : 'close';
    this.hud.setPrompt(door ? `${this.session.touch?'Tap Use to':'E –'} ${verb} the door` : null);
  }

  /** Går man framover inn i toppen av en sklie, tar sklien over. */
  _maybeSlide() {
    const w = this.walker;
    if (this.input.forward <= 0 || !this.level.slides.length) return;
    const path = slideEntry(this.level, w.x, w.z, groundAt(this.level, w.x, w.z, w.floorY));
    if (!path) return;
    this.rider.start(path, Math.hypot(w.vx, w.vz));
    this.hud.setRiding(true);
  }

  _ride(dt, camera) {
    const landed = this.rider.update(dt, this.input);
    if (this.sound) this.audio.slide(landed ? 0 : this.rider.v);
    if (!landed) return this.rider.applyToCamera(camera);
    this.walker.land(this.level, landed);
    this._splash(landed.x, landed.z, landed.speed);
    this.walker.applyToCamera(camera);
    this.hud.setRiding(false);
  }

  /** Plask: bølger og ender som dyttes unna, et blågrønt glimt (bare i vann) og lyden. */
  _splash(x, z, speed) {
    this.play.splash(x, z);
    if (this.theme.pit !== 'balls') this.hud.splashFlash();
    if (this.sound) this.audio.splash(speed);
  }

  /** Hvor mye TV-sus man hører her (0..1): nærmeste skjerm. */
  _staticLevel() {
    let best = 0;
    for (const s of this.screens ?? []) {
      const d2 = (s.x - this.walker.x) ** 2 + (s.z - this.walker.z) ** 2;
      best = Math.max(best, 1 / (1 + d2 * 0.7));
    }
    return best;
  }

  /** Hvor mye lysrørsurr man hører her (0..1), vektet med blinkegruppenes tilstand. */
  _humLevel(flicker) {
    let sum = 0;
    for (const l of this.field.near(this.walker.x, this.walker.z, 6)) {
      if (l.object) continue; // skjermer surrer ikke som lysrør
      const d2 = (l.x - this.walker.x) ** 2 + (l.z - this.walker.z) ** 2;
      const w = l.state === LIGHT.FLICKER ? flicker[l.group] : 1;
      sum += w / (1 + d2 * 0.3);
    }
    return Math.min(1, sum);
  }

  update(dt, camera, flickerValues, changedGroups) {
    if (!this.active || this.paused || !this.level) return;
    if (this.rider.active) {
      this._ride(dt, camera);
    } else {
      const [px, pz] = [this.walker.x, this.walker.z];
      const surface = this.walker.update(dt, this.drift.input(dt) ?? this.input, this.level, this.theme);
      this.loops.update(px, pz, this.walker); // flyttes sømløst én periode tilbake i en uendelig gang
      if (surface && this.sound) this.audio.step(surface);
      if (this.walker.splash) this._splash(this.walker.x, this.walker.z, this.walker.splash);
      this.walker.splash = 0;
      this.walker.applyToCamera(camera);
      this._maybeSlide();
    }
    this.play.update(dt, this.walker, this.rider.active);

    if (this.sound) {
      for (const g of changedGroups) {
        const near = this.field
          .near(this.walker.x, this.walker.z, 7)
          .filter((l) => l.state === LIGHT.FLICKER && l.group === g)
          .map((l) => Math.hypot(l.x - this.walker.x, l.z - this.walker.z));
        if (near.length) this.audio.flickerBuzz(Math.min(...near));
      }
      const w = this.walker;
      this.audio.listen({ level: this.level, x: w.x, z: w.z, y: w.floorY, yaw: w.yaw, windows: this.windows, power:this.power });
      this.audio.update(dt, this._humLevel(flickerValues) * this.power);
      this.audio.static(this._staticLevel());
    }

    this._statsIn -= dt;
    this._promptIn = (this._promptIn ?? 0) - dt;
    if (this._promptIn <= 0) {
      this._promptIn = 0.15;
      this._prompt();
    }
    if (this._statsIn <= 0) {
      this._statsIn = 0.5;
      this.hud.setStats(this.walker.distance, this.walker.explored(this.level));
    }
  }
}
