// Bakgrunnen i hovedmenyen: Level 0 (gen/menu-room.js) med blinkende lysrør, i et eget lerret med egen
// grafikkontekst, så den ikke rører verdenen i editoren. Lages og fjernes av app/menu-backdrop.js.
import * as THREE from 'three';
import { buildWorld } from '../world/build.js';
import { menuRoom, menuShot } from '../gen/menu-room.js';
import { createPostFX } from './postfx.js';
import { FlickerController } from './flicker.js';
import { frameDue } from './display.js';

const FOLLOW = 2.5; // hvor raskt kameraet følger musa og undermenyene

export class MenuScene {
  /** @param o { settings, onLight(0..1): lyset akkurat nå, onLost(): grafikkonteksten ble borte } */
  constructor({ settings, onLight, onLost }) {
    this.settings = { fpsCap: 30 }; // bildefrekvensen her (frameDue); bakgrunnen trenger ikke mer
    this.quality = settings;
    this.onLight = onLight;
    this.still = matchMedia('(prefers-reduced-motion: reduce)').matches; // ingen blinking eller kamerabevegelse
    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.domElement.className = 'menu-canvas';
    this.renderer = renderer;
    this._lost = (e) => (e.preventDefault(), onLost());
    renderer.domElement.addEventListener('webglcontextlost', this._lost);

    this.world = buildWorld(menuRoom(), { anisotropy: Math.min(4, renderer.capabilities.getMaxAnisotropy()), waterQuality: false });
    const { theme, group } = this.world;
    renderer.toneMappingExposure = theme.exposure;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(theme.fog.color, theme.fog.density * 0.8);
    this.scene.background = new THREE.Color(theme.fog.color);
    this.scene.add(group);
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.05, 200);
    this.camera.rotation.order = 'YXZ';
    this.postfx = createPostFX(renderer, this.scene, this.camera);
    this.postfx.setLook({ bloom: theme.bloom, grain: this.still ? 0 : 0.055, vignette: 0.7, aberration: 0.0025, vhs: !this.still });
    this.flicker = new FlickerController();

    this.time = 0;
    this.frames = 0;
    this.pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    this.turn = { now: 0, to: 0 };
    this.light = 1;
    this._onMove = (e) => {
      this.pointer.tx = (e.clientX / innerWidth) * 2 - 1;
      this.pointer.ty = (e.clientY / innerHeight) * 2 - 1;
    };
    this._onResize = () => this._resize();
    addEventListener('pointermove', this._onMove);
    addEventListener('resize', this._onResize);
    this._resize();
    document.body.append(renderer.domElement);
    this._last = performance.now();
    renderer.setAnimationLoop((t) => frameDue(this, t) && this.draw(t));
  }

  _resize() {
    const pr = Math.min(window.devicePixelRatio || 1, 1) * (this.quality.renderScale ?? 1);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.postfx.setSize(innerWidth, innerHeight, pr);
    this.camera.aspect = innerWidth / Math.max(1, innerHeight);
    this.camera.updateProjectionMatrix();
  }

  /** Tegner ett bilde (setAnimationLoop; også nettlesersjekken). */
  draw(now = performance.now()) {
    const dt = Math.min(0.1, Math.max(0, (now - this._last) / 1000));
    this._last = now;
    const full = this.quality.effects !== 'reduced';
    if (full !== this.full) this.postfx.setQuality((this.full = full));
    if (!this.still) {
      this.time += dt;
      this.flicker.update(dt);
    }
    const ease = Math.min(1, dt * FOLLOW);
    const p = this.pointer;
    p.x += (p.tx - p.x) * ease;
    p.y += (p.ty - p.y) * ease;
    this.turn.now += (this.turn.to - this.turn.now) * ease;
    const shot = menuShot(this.time, this.still ? 0 : p.x, this.still ? 0 : p.y, this.turn.now);
    this.camera.position.set(shot.x, shot.y, shot.z);
    this.camera.rotation.set(shot.pitch, shot.yaw, 0);
    this.world.update(this.time, this.flicker.values, this.camera);
    const values = this.flicker.values;
    const light = values.reduce((a, b) => a + b, 0) / values.length;
    if (light !== this.light) this.onLight((this.light = light));
    this.postfx.render(this.time);
    if (this.frames++ === 0) this.renderer.domElement.classList.add('on');
  }

  /** Slipper grafikkonteksten med en gang: spillet og editoren skal ha minnet. */
  dispose() {
    const { renderer } = this;
    renderer.setAnimationLoop(null);
    removeEventListener('pointermove', this._onMove);
    removeEventListener('resize', this._onResize);
    renderer.domElement.removeEventListener('webglcontextlost', this._lost);
    renderer.domElement.remove();
    this.scene.remove(this.world.group);
    this.world.dispose();
    this.postfx.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }
}
