// 3D-visningen: renderer, scene, etterbehandling og bytte mellom oversikt og gåmodus.
import * as THREE from 'three';
import { builtBounds } from '../core/level.js';
import { buildWorld } from '../world/build.js';
import { AudioEngine } from '../audio/engine.js';
import { createPostFX } from './postfx.js';
import { OverviewCamera } from './cameras.js';
import { FlickerController } from './flicker.js';
import { Hud } from './hud.js';
import { WalkMode } from './walkmode.js';
import { shootPhoto } from './photo.js';
import { Explorer } from './explore.js';
import { cycleScary } from './scary.js';

const OVERVIEW_BG = new THREE.Color('#d8d6cf');

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
    this.overview = new OverviewCamera(this.camera, renderer.domElement);
    this.flicker = new FlickerController();
    this.audio = new AudioEngine();
    this.audio.setVolume(this.settings.volume);
    this.hud = new Hud(container, {
      exit: () => this.exitWalk(),
      vhs: () => this.toggle('vhs'),
      sound: () => this.toggle('sound'),
      photo: () => this.photo(),
      scary: () => this.cycleScary(),
      drift: () => this.walk.drift.toggle(),
    });
    this.walk = new WalkMode({ canvas: renderer.domElement, hud: this.hud, audio: this.audio });
    this.walk.sound = this.settings.sound;
    // Kassetter, strømbrudd og uendelige nivåer (dører til ingensteds) i gåmodus.
    this.explorer = new Explorer(this);
    this.walk.onExit = (door) => this.explorer.goDeeper({ door });
    this.hud.setToggles(this.settings);

    renderer.domElement.addEventListener('click', () => {
      if (this.mode === 'walk' && !this.walk.locked) this.walk.lock();
    });
    window.addEventListener('keydown', (e) => this._onKey(e));
    document.addEventListener('fullscreenchange', () => this._resize());
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
    if (this.world) {
      this.scene.remove(this.world.group);
      this.world.dispose();
    }
    this.world = buildWorld(level, { anisotropy: this.anisotropy, waterQuality: this.settings.waterReflections });
    this.world.water?.setSize(this._rtW, this._rtH);
    this.scene.add(this.world.group);
    const built = builtBounds(level);
    const b = built ?? { x0: 0, z0: 0, x1: level.w - 1, z1: level.h - 1 };
    this.overview.setBounds(b.x0, b.z0, b.x1 + 1, b.z1 + 1, Math.max(level.w, level.h));
    // Rammer inn på nytt ved nytt rom, ny størrelse, eller når det første gulvet tegnes.
    const firstBuild = built && !this._hadBuilt;
    this._hadBuilt = !!built;
    if ((refit || firstBuild) && this.mode === 'overview') this.overview.go('perspective', first);
    this.walk.setWorld(level, this.world.theme, this.world.field, this.world.doors, this.world);
    this._applyLook();
    return this.world.stats;
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

  toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      return;
    }
    const request = this.container.requestFullscreen?.();
    if (request) request.catch(() => this.hud.flash('Fullscreen is not available here.'));
    else this.hud.flash('This browser does not support fullscreen.');
    this.enterWalk();
  }

  /** Fotomodus (P): bilde av det man ser – lagres eller deles (photo.js). */
  photo() {
    return shootPhoto(this);
  }

  /** Scary mode: av → på → på uten jumpscares → av (scary.js). */
  cycleScary() {
    cycleScary(this);
  }

  toggle(key) {
    this.settings[key] = !this.settings[key];
    if (key === 'sound') this.walk.setSound(this.settings.sound);
    this.hud.setToggles(this.settings);
    this._applyLook();
    this.options.onSettingsChange?.(this.settings);
  }

  updateSettings(patch) {
    Object.assign(this.settings, patch);
    this.walk.walker.sensitivity = this.settings.sensitivity;
    this.audio.setVolume(this.settings.volume);
    this.world?.water?.setQuality(this.settings.waterReflections);
    this._applyLook();
  }

  _applyLook() {
    const theme = this.world?.theme;
    if (!theme) return;
    const walking = this.mode === 'walk';
    const fog = this.scene.fog;
    this.renderer.toneMappingExposure = theme.exposure;
    if (walking) {
      fog.color.set(theme.fog.color);
      // Scary mode: tettere tåke og mørkere bilde.
      fog.density = theme.fog.density * (this.level.fog ?? 1) * (this.settings.scary ? 1.9 : 1);
      this.renderer.toneMappingExposure = theme.exposure * (this.settings.scary ? 0.8 : 1);
      this.scene.background.copy(fog.color);
      this.camera.fov = this.settings.fov;
      this.world.setBoost(1);
    } else {
      fog.density = 0;
      this.scene.background.copy(OVERVIEW_BG);
      this.camera.fov = 45;
      this.world.setBoost(1.15);
    }
    this.camera.updateProjectionMatrix();
    this.world.water?.setMirror(walking);
    this.postfx.setLook({
      bloom: walking ? theme.bloom : theme.bloom * 0.5,
      grain: walking && this.settings.grain ? 0.055 : 0,
      vignette: walking ? 0.65 : 0.1,
      aberration: walking ? 0.0025 : 0,
      vhs: walking && this.settings.vhs,
    });
    this.hud.setVhs(walking && this.settings.vhs);
    this.audio.eerieScale = walking && this.settings.scary ? 0.35 : 1;
  }

  _onKey(e) {
    if (this.mode !== 'walk' || e.target?.tagName === 'INPUT' || e.ctrlKey || e.metaKey) return;
    if (e.code === 'KeyV') this.toggle('vhs');
    else if (e.code === 'KeyM') this.toggle('sound');
    else if (e.code === 'KeyP') this.photo();
    else if (e.code === 'KeyX') this.cycleScary();
    else if (e.code === 'KeyG') this.walk.drift.toggle();
    else if (e.code === 'Escape' && !this.walk.locked && !document.fullscreenElement) this.exitWalk();
  }

  _resize() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    const pr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    this.postfx.setSize(w, h, pr);
    // Speil- og brytningsbildet for vannet tegnes i halv oppløsning.
    this._rtW = (w * pr) / 2;
    this._rtH = (h * pr) / 2;
    this.world?.water?.setSize(this._rtW, this._rtH);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  _tick(timestamp) {
    this._timer.update(timestamp);
    const dt = Math.min(0.05, this._timer.getDelta());
    this.time += dt;
    if (!this.world) return;
    const changed = this.flicker.update(dt);
    this.world.update(this.time, this.flicker.values);
    if (this.mode === 'walk') {
      this.walk.update(dt, this.camera, this.flicker.values, changed);
      this.explorer.update(dt);
    }
    else this.overview.update(dt);
    this.hud.tick(dt);
    this.postfx.render(this.time);
  }
}
