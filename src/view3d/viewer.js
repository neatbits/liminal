// 3D-visningen: renderer, scene, etterbehandling og bytte mellom oversikt og gåmodus.
import * as THREE from 'three';
import { builtBounds } from '../core/level.js';
import { Storeys } from './storeys.js';
import { walkKey } from './viewer-keys.js';
import { AudioEngine } from '../audio/engine.js';
import { createPostFX } from './postfx.js';
import { OverviewCamera } from './cameras.js';
import { FlickerController } from './flicker.js';
import { Hud } from './hud.js';
import { WalkMode } from './walkmode.js';
import { shootPhoto } from './photo.js';
import { Explorer } from './explore.js';
import { getMood, nextMood } from '../gen/moods.js';
import { setMood } from './mood.js';
import { applyLook, OVERVIEW_BG } from './look.js';
import { resizeView, frameDue } from './display.js';
import { Music } from '../audio/music.js';
import { activeTint, tintFactor } from '../core/tints.js';

export class Viewer {
  /** @param options { settings, onModeChange(mode), onSettingsChange(settings) } */
  constructor(container, options) {
    this.container = container;
    this.settings = options.settings;
    this.options = options;
    this.mode = 'overview';
    this.world = null;
    this.level = null;
    this.time = 0;

    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.domElement.className = 'viewport-canvas';
    container.append(renderer.domElement);
    this.renderer = renderer;
    this.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x000000, 0);
    this.scene.background = OVERVIEW_BG.clone();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.05, 500);
    this.postfx = createPostFX(renderer, this.scene, this.camera);
    this.postfx.setQuality(this.settings.effects !== 'reduced');
    this.overview = new OverviewCamera(this.camera, renderer.domElement);
    this.flicker = new FlickerController();
    this.audio = new AudioEngine();
    this.audio.setVolume(this.settings.volume);
    this.music = new Music(); // av og på med settings.music (M i gåmodus er lyden, N musikken)
    this.music.setVolume(this.settings.volume);
    this.music.setOn(this.settings.music);
    this.hud = new Hud(container, {
      exit: () => this.exitWalk(),
      resume: () => this.walkFullscreen(),
      vhs: () => this.toggle('vhs'),
      sound: () => this.toggle('sound'),
      music: () => this.toggle('music'),
      photo: () => this.photo(),
      mood: () => this.setMood(nextMood(this.settings.mood)),
      drift: () => this.walk.drift.toggle(),
    });
    this.walk = new WalkMode({ canvas: renderer.domElement, hud: this.hud, audio: this.audio });
    this.walk.sound = this.settings.sound;
    this.walk.mood = getMood(this.settings.mood);
    // Kassetter, strømbrudd og uendelige nivåer (dører til ingensteds) i gåmodus.
    this.explorer = new Explorer(this);
    this.storeys = new Storeys(this); // etasjene og trapperommene mellom dem
    this.walk.onExit = (door) => this.explorer.goDeeper({ door });
    this.walk.exitLock = () => this.explorer.hunt.lockText();
    this.hud.setToggles(this.settings);

    // Pause: Esc slipper musa (og i Firefox/Safari også fullskjermen) – menyen står da midt på
    // skjermen (hud.js). Et klikk eller «Resume» fortsetter i fullskjerm; Esc én gang til går ut.
    this._pausedAt = 0;
    renderer.domElement.addEventListener('click', () => {
      if (this.mode === 'walk' && !this.walk.locked) this.walkFullscreen();
    });
    window.addEventListener('keydown', (e) => walkKey(this, e));
    document.addEventListener('pointerlockchange', () => {
      if (!document.pointerLockElement) this._pausedAt = performance.now();
    });
    document.addEventListener('fullscreenchange', () => {
      this._resize();
      if (!document.fullscreenElement) this._pausedAt = performance.now();
    });
    new ResizeObserver(() => this._resize()).observe(container);
    this._resize();
    this._timer = new THREE.Timer();
    this._timer.connect(document); // pauser riktig når fanen er skjult
    renderer.setAnimationLoop((t) => this._tick(t));
  }

  /**
   * Bygger verdenen på nytt fra rommet. Beholder kamera og posisjon. explorer: rommet er et
   * generert nivå i gåmodus (eller rommet fra editoren igjen etterpå), ikke en endring i editoren.
   */
  setLevel(level, { explorer = false } = {}) {
    if (!explorer && this.explorer?.home) this.explorer.abandon();
    const first = !this.level;
    const refit = first || level !== this.level || level.w !== this._w || level.h !== this._h;
    this._w = level.w;
    this._h = level.h;
    this.level = level;
    const options = { anisotropy: this.anisotropy, waterQuality: this.settings.waterReflections, waterDetail: this.settings.waterDetail, waterWaves: this.settings.waterWaves };
    const storeys = this.storeys.build(level, options); // alle etasjene (view3d/storeys.js)
    this.world = storeys.world;
    this.world.water?.setSize(this._rtW, this._rtH);
    this.world.floorReflection?.setSize(this._rtW, this._rtH);
    const built = builtBounds(level);
    const b = built ?? { x0: 0, z0: 0, x1: level.w - 1, z1: level.h - 1 };
    this.overview.setBounds(b.x0, b.z0, b.x1 + 1, b.z1 + 1, Math.max(level.w, level.h));
    // Rammer inn på nytt ved nytt rom, ny størrelse, eller når det første gulvet tegnes.
    const firstBuild = built && !this._hadBuilt;
    this._hadBuilt = !!built;
    if ((refit || firstBuild) && this.mode === 'overview') this.overview.go('perspective', first);
    if (!this.storeys.rebuilt()) this.walk.setWorld(storeys.level, this.world.theme, this.world.field, this.world.doors, this.world);
    this.showStorey(this.storeys.shown);
    this._applyLook();
    return storeys.stats;
  }

  /** Oversikten viser etasjene opp til k og sikter på den (view3d/storeys.js). */
  showStorey(k) {
    this.storeys.show(k);
    if (this.mode !== 'walk') this.overview.raise(this.storeys.floorY());
  }

  /** 'perspective' | 'top' | 'reset' */
  view(name) {
    if (this.mode === 'walk') this.exitWalk(false);
    this.overview.go(name === 'top' ? 'top' : 'perspective');
  }

  enterWalk() {
    if (!this.level) return false;
    if (this.mode !== 'walk') {
      this.walk.walker.sensitivity = this.settings.sensitivity;
      if (!this.walk.enter()) {
        this.hud.flash('This room has no floor to stand on yet. Draw some floor first.');
        return false;
      }
      this.mode = 'walk';
      this.overview.enabled = false;
      this.explorer.enter();
      this._applyLook();
      this.options.onModeChange?.(this.mode);
    }
    this.walk.lock();
    return true;
  }

  exitWalk(tween = true) {
    if (this.mode !== 'walk') return;
    this.storeys.leave();
    if (document.fullscreenElement) document.exitFullscreen?.();
    const { x, z } = this.walk.walker;
    this.walk.exit();
    this.mode = 'overview';
    this.explorer.exit();
    this.overview.enabled = true;
    this.overview.lookFrom(this.camera.position.clone(), new THREE.Vector3(x, 0, z));
    if (tween) this.overview.go('perspective');
    this._applyLook();
    this.options.onModeChange?.(this.mode);
  }

  /**
   * Gåmodus i fullskjerm; der fullskjerm ikke går (iframe, iPhone), i panelet. Keyboard Lock
   * (Chrome/Edge) gjør at et kort trykk på Esc bare pauser – hold Esc for å gå ut av fullskjermen.
   */
  walkFullscreen() {
    if (!this.enterWalk()) return false;
    if (!document.fullscreenElement) {
      this.container.requestFullscreen?.()?.then(() => navigator.keyboard?.lock?.(['Escape'])).catch(() => {});
    }
    return true;
  }

  /** Esc: med musa låst pauser den (bare med Keyboard Lock); på pause går den ut av gåmodus. */
  _escape() {
    if (this.walk.locked) document.exitPointerLock();
    else if (performance.now() - this._pausedAt > 300) this.exitWalk(); // ikke det samme trykket som pauset
  }

  // Fotomodus (P, photo.js) og stemningen i gåmodus (Normal … Nightmare, mood.js).
  photo = () => shootPhoto(this);
  setMood = (id) => setMood(this, id);

  toggle(key) {
    this.settings[key] = !this.settings[key];
    if (key === 'sound') this.walk.setSound(this.settings.sound);
    if (key === 'music') this.music.setOn(this.settings.music);
    this.hud.setToggles(this.settings);
    this._applyLook();
    this.options.onSettingsChange?.(this.settings);
  }

  updateSettings(patch) {
    Object.assign(this.settings, patch);
    this.walk.walker.sensitivity = this.settings.sensitivity;
    this.audio.setVolume(this.settings.volume);
    this.music.setVolume(this.settings.volume);
    this.world?.water?.setQuality(this.settings.waterReflections);
    this.world?.water?.setDetail(this.settings.waterDetail);
    this.world?.water?.setWaves(this.settings.waterWaves);
    this.postfx.setQuality(this.settings.effects !== 'reduced');
    this._resize();
    this._applyLook();
  }

  _applyLook() {
    applyLook(this);
  }

  // Størrelse, format i fullskjerm og oppløsning (display.js).
  _resize() {
    resizeView(this);
  }

  _tick(timestamp) {
    if (!frameDue(this, timestamp)) return; // begrenset bildefrekvens
    this._timer.update(timestamp);
    const dt = this.mode === 'walk' && this.walk.paused ? 0 : Math.min(0.05, this._timer.getDelta());
    this.time += dt;
    if (!this.world) return;
    const changed = this.flicker.update(dt);
    // Lysfargen: visningsinnstillingen eller rommets (core/tints.js).
    const tint = tintFactor(activeTint(this.settings.light, this.level), this.time, this.world.field.color);
    this.world.setTint(tint);
    this.world.update(this.time, this.flicker.values, this.camera);
    this.storeys.update(this.time, this.flicker.values, this.camera, tint);
    if (this.mode === 'walk') {
      this.walk.update(dt, this.camera, this.flicker.values, changed);
      this.storeys.follow(); // trapperom: bytt etasje midt på reposet
      if (!this.walk.paused) this.explorer.update(dt);
    }
    else this.overview.update(dt);
    this.hud.tick(dt);
    this.postfx.render(this.time);
  }
}
