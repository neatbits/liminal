// Den sorte skikkelsen i 3D: én flate som vender mot den som ser (core/figure.js), med kroppen i en
// shader (view3d/figure-material.js). Posisjonen kommer fra AI-en (world/monster-ai.js).
import * as THREE from 'three';
import { FIGURE, figurePose } from '../core/figure.js';
import { figureMaterial } from './figure-material.js';

export class Monster3D {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'monster';
    this.group.visible = false;
    const [w, h] = FIGURE.plane;
    this.geometry = new THREE.PlaneGeometry(w, h).translate(0, h / 2, 0);
    this.material = figureMaterial(FIGURE.height);
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    this.group.add(this.mesh);
    this.ready = Promise.resolve(true);
    this.time = 0;
    this.phase = 0;
    this.rush = 0;
    this.disposed = false;
    this.warmed = false;
    this._warming = false;
  }

  /** Ingenting å laste (kroppen er kode); kalles som før, så shaderen kan forberedes under overgangen. */
  load() {
    return this.disposed ? Promise.resolve(false) : this.ready;
  }

  /**
   * Tegner skikkelsen én gang, usynlig, rett foran kameraet: shaderen kompileres nå, ikke i det
   * bildet den først viser seg. Neste update() etter det bildet setter materialet tilbake.
   */
  warm(renderer, camera, scene) {
    if (this.warmed || this.disposed) return;
    this.warmed = this._warming = true;
    const ahead = camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(2.5);
    this.group.position.copy(camera.position).add(ahead);
    this.group.position.y -= FIGURE.height / 2;
    this.group.visible = true;
    this.material.colorWrite = false;
    this._drawn = false;
    this.mesh.onAfterRender = () => (this._drawn = true);
    renderer.compileAsync?.(this.group, camera, scene).catch(() => {});
  }

  update(dt, ai, player, power) {
    if (this.disposed) return;
    if (this._warming) {
      if (!this._drawn && !ai.visible) return; // det usynlige bildet er ikke tegnet ennå
      this._warming = false;
      this.material.colorWrite = true;
      this.mesh.onAfterRender = () => {};
    }
    this.group.visible = ai.visible;
    if (!ai.visible) {
      this.rush = 0;
      return;
    }
    const step = Math.max(0, dt);
    this.time += step;
    this.rush += ((ai.fast ? 1 : 0) - this.rush) * Math.min(1, step * 7);
    this.phase += step * (2.2 + 7 * this.rush);
    const p = figurePose(this.time, ai, player);
    this.group.position.set(p.x, p.y + (this.base ?? 0), p.z); // base: etasjen (view3d/storeys.js)
    this.group.rotation.y = p.yaw;
    const u = this.material.uniforms;
    u.uTime.value = this.time;
    u.uRush.value = this.rush;
    u.uSway.value = p.sway;
    u.uStride.value = Math.sin(this.phase);
    u.uDark.value = 1 - Math.max(0, Math.min(1, power ?? 1));
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.group.visible = false;
    this.geometry.dispose();
    this.material.dispose();
  }
}
