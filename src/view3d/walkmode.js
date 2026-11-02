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
import { staticLevel, humLevel } from './walk-sounds.js';
import { crawlPrompt } from '../core/crawl.js';
import { Flashlight } from './flashlight.js';

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
    this.base = 0; // gulvhøyden i etasjen man går i (view3d/storeys.js)
    this._statsIn = 0;
    this.doors = null;
    this.climb = null; // stiger mellom etasjer (view3d/climb.js, settes av view3d/storeys.js)
    this.lift = null; // heiser (view3d/lifts.js, settes av view3d/storeys.js)
    this.interact = null; // annet man bruker med E: { use(), prompt() } (sikringsskap, view3d/lights-out.js)
    this.power = 1; // strømmen (0..1): settes under strømbrudd (view3d/explore.js)
    this.mood = null; // stemningen (gen/moods.js), settes av visningen
    this.play = new WaterPlay(this);
    this.drift = new Drift(this); // drømmegange (G)
    this.flashlight = new Flashlight(); // F
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
    this.lift?.sync(); // lukkede heisdører stenger døråpningen i kopien (view3d/lifts.js)
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
    this.climb?.stop();
    this.beforeEnter?.(); // etasje 0 (view3d/storeys.js)
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
    this.flashlight.off();
    this.climb?.stop();
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
    this._requestLock();
  }

  /** Esc på pause: fortsetter bare om nettleseren gir musa tilbake (pointerlockchange → session.syncLock). */
  relock() {
    if (!this.active) return;
    if (this.session.touch) this.session.resume();
    else this._requestLock();
  }

  _requestLock() {
    const plain = () => { try { this.canvas.requestPointerLock()?.catch?.(() => {}); } catch { /* støttes ikke (f.eks. mobil) */ } };
    try { this.canvas.requestPointerLock({ unadjustedMovement: true })?.catch?.(plain); } catch { plain(); }
  }

  setSound(on) {
    this.sound = on;
    this.audio.setEnabled(on);
    if (on && this.active && !this.paused) this.audio.start(this.theme);
  }

  /** Uendelige ganger – bare når stemningen har avvik (mood.anomalies.loops). */
  _loops(theme) {
    return new Loops(this.level, Math.random, this.mood?.anomalies.loops && !this.noLoops ? [1, 2] : [0, 0], textureRepeats(theme)); // noLoops: Noclip
  }

  /** En dør til ingensteds (med dørblad) – i gåmodus fører den videre (onExit). */
  isExit(x, z) {
    const d = doorInfo(this.level, x, z);
    return !!d?.oneSided && d.state !== DOOR.NONE;
  }

  /** E: åpner eller lukker døren man står foran – eller går gjennom en dør til ingensteds. */
  useDoor() {
    if (!this.active || this.paused || this.climb?.use() || this.lift?.use() || this.interact?.use()) return; // E ved en stige, en heis eller et skap
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
    const climb = !this.rider.active && (this.climb?.prompt() || this.lift?.prompt() || this.interact?.prompt());
    if (climb) return this.hud.setPrompt(climb);
    const w = this.walker;
    const door = this.rider.active ? null : doorInReach(this.level, w.x, w.z, w.yaw, 1.8, { exits: true });
    const verb = door?.info.oneSided ? 'go through' : door?.info.state === DOOR.CLOSED ? 'open' : 'close';
    const locked = door?.info.oneSided ? this.exitLock?.() : null; // kassettjakten (view3d/tape-hunt.js)
    const crawl = this.rider.active ? null : crawlPrompt(w, this.level, this.session.touch);
    this.hud.setPrompt(door ? locked ?? `${this.session.touch ? 'Tap Use to' : 'E –'} ${verb} the door` : crawl);
  }

  /** Går man framover inn i toppen av en sklie, tar sklien over. */
  _maybeSlide() {
    const w = this.walker;
    if (this.input.forward <= 0) return;
    // En sklie her, eller en sklie ned til etasjen under (dropAt bytter etasje, view3d/storeys.js).
    const path = (this.level.slides.length && slideEntry(this.level, w.x, w.z, groundAt(this.level, w.x, w.z, w.floorY))) || this.dropAt?.(w);
    if (!path) return;
    this.rider.start(path, Math.hypot(w.vx, w.vz));
    w.stand();
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

  update(dt, camera, flickerValues, changedGroups) {
    if (!this.active || this.paused || !this.level) return;
    if (this.climb?.active) {
      this.climb.update(dt, this.input, camera);
    } else if (this.rider.active) {
      this._ride(dt, camera);
    } else {
      const [px, pz] = [this.walker.x, this.walker.z];
      const surface = this.walker.update(dt, this.drift.input(dt) ?? this.input, this.level, this.theme);
      this.loops.update(px, pz, this.walker); // flyttes sømløst én periode tilbake i en uendelig gang
      if (surface && this.sound) this.audio.step(surface, this.walker.down ? 0.45 : 1);
      if (this.walker.splash) this._splash(this.walker.x, this.walker.z, this.walker.splash);
      this.walker.splash = 0;
      this.walker.applyToCamera(camera);
      this._maybeSlide();
    }
    this.lift?.update(dt, camera); // heisene: dører, turen og etasjebyttet (view3d/lifts.js)
    camera.position.y += this.base; // etasjen man går i (view3d/storeys.js)
    this.flashlight.update(dt, camera);
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
      this.audio.update(dt, humLevel(this.field, this.walker, flickerValues) * this.power);
      this.audio.static(staticLevel(this.screens, this.walker));
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
