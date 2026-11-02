// Tåken i gåmodus har temaets farge (view3d/look.js), men den lyser ikke av seg selv: der det er mørkt rundt deg (ingen
// lamper som når fram, strømbrudd), blir den mørk også. Ellers gløder alt langt borte i tåkefargen selv i bekmørke.
// Lyset der man står prøves fra det bakte lysfeltet på et 0,5 m-gitter (som view3d/nightmare.js), og fargen glir.
// Står man lenge i mørket med lykten av, kommer et hint om den (world/flash-hint.js).
import * as THREE from 'three';
import { FlashHint } from '../world/flash-hint.js';

const REF = 0.18; // lysstyrke i øyehøyde der tåken får full farge
const MIN = 0.04; // så mye av fargen er igjen i bekmørke
const EASE = 1.5; // per sekund

const lum = (s) => s[0] * 0.2126 + s[1] * 0.7152 + s[2] * 0.0722 + (s[3] + s[4] + s[5] + s[6]) * 0.5;

export class FogLight {
  constructor(viewer) {
    this.v = viewer;
    this.base = new THREE.Color();
    this.target = new THREE.Color();
    this.level = 1;
    this.hint = new FlashHint();
  }

  /** Tåkefargen slik temaet har den (view3d/look.js kaller denne når utseendet settes). */
  setBase(color) {
    this.target.copy(color);
    if (this.v.mode !== 'walk' || this.v.explorer?.busy || !this.v.explorer?.noclip.active) this.base.copy(color); // ellers: glir over (Noclip)
    this.apply();
  }

  update(dt) {
    const { walk, world } = this.v;
    const field = world?.field;
    if (!field) return;
    const w = walk.walker;
    const q = (n) => Math.round(n * 2) / 2;
    const here = lum(field.sample(q(w.x), q(w.floorY + 1.2), q(w.z), 0, 1, 0));
    const target = (MIN + (1 - MIN) * Math.min(1, here / REF)) * (walk.power ?? 1);
    this.level += (target - this.level) * Math.min(1, dt * EASE);
    this.base.lerp(this.target, Math.min(1, dt * EASE));
    this.apply();
    const lamp = walk.flashlight;
    if (dt > 0 && this.hint.update(dt, { light: target, on: lamp.on, empty: lamp.limited && lamp.battery <= 0 })) {
      this.v.hud.flash(walk.session?.touch ? 'It’s dark. Tap Light for your flashlight.' : 'It’s dark. Press F for your flashlight.', 4500);
    }
  }

  apply() {
    const { scene } = this.v;
    scene.fog.color.copy(this.base).multiplyScalar(this.level);
    scene.background.copy(scene.fog.color);
  }
}
