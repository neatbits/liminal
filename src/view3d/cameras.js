// Oversiktskamera («dukkehus»): OrbitControls med forhåndsinnstillinger og myke overganger.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export class OverviewCamera {
  constructor(camera, domElement) {
    this.camera = camera;
    this.controls = new OrbitControls(camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.04;
    this.controls.screenSpacePanning = false;
    this.tween = null;
    this.bounds = { cx: 24, cz: 24, size: 48 };
    this.floorY = 0; // gulvet i etasjen som vises (core/storeys.js)
  }

  set enabled(on) {
    this.controls.enabled = on;
  }

  /**
   * Området kameraet skal vise (i meter): det som er bygget, ikke hele kartet.
   * @param levelSize største side av hele rommet (for maks zoom ut)
   */
  setBounds(x0, z0, x1, z1, levelSize) {
    this.bounds = { cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, size: Math.max(x1 - x0, z1 - z0, 8) };
    this.controls.minDistance = 2;
    this.controls.maxDistance = Math.max(30, levelSize * 3);
  }

  /** Kamera- og målposisjon for en forhåndsinnstilling. */
  preset(name) {
    const { cx, cz, size } = this.bounds;
    const target = new THREE.Vector3(cx, this.floorY, cz);
    if (name === 'top') return { target, position: target.clone().add(new THREE.Vector3(0, size * 1.25, 0.01)) };
    const dir = new THREE.Vector3(-0.42, 0.8, 0.72).normalize();
    return { target, position: target.clone().addScaledVector(dir, size * 1.05) };
  }

  /** Løfter kameraet og målet til gulvet i en annen etasje, med samme vinkel og avstand. */
  raise(y) {
    const dy = y - this.floorY;
    this.floorY = y;
    if (!dy) return;
    this.camera.position.y += dy;
    this.controls.target.y += dy;
    if (this.tween) this.tween = { ...this.tween, to: this.preset('perspective') };
    this.controls.update();
  }

  /** Flytter kameraet mykt (eller umiddelbart) til en forhåndsinnstilling. */
  go(name, instant = false) {
    const to = this.preset(name);
    if (instant) {
      this.camera.position.copy(to.position);
      this.controls.target.copy(to.target);
      this.controls.update();
      this.tween = null;
      return;
    }
    this.tween = {
      t: 0,
      fromPos: this.camera.position.clone(),
      fromTarget: this.controls.target.clone(),
      to,
    };
  }

  /** Brukes når man går fra gåmodus til oversikt: start fra der man sto. */
  lookFrom(position, target) {
    this.camera.position.copy(position);
    this.controls.target.copy(target);
    this.controls.update();
  }

  update(dt) {
    if (this.tween) {
      const tw = this.tween;
      tw.t = Math.min(1, tw.t + dt / 0.7);
      const k = ease(tw.t);
      this.camera.position.lerpVectors(tw.fromPos, tw.to.position, k);
      this.controls.target.lerpVectors(tw.fromTarget, tw.to.target, k);
      if (tw.t >= 1) this.tween = null;
    }
    this.controls.update();
  }

  dispose() {
    this.controls.dispose();
  }
}
