// I Uncanny og Nightmare (stemninger med monster) står spøkelset av og til helt stille utenfor ett
// av vinduene (world/window-ghost.js): et stillbilde av spøkelsesmodellen (view3d/ghost-snapshot.js),
// satt inn i vindusutsikten av world/window-ghost-view.js – kjellerbyen og temaenes landskap.
// Det dukker opp mens man ser en annen vei, og er borte igjen etter et kort glimt: når man har sett
// mot det et par sekunder (også mens man ser på det), eller etter en stund om man aldri ser det.
// Tidene stopper på pause.
import * as THREE from 'three';
import { windows } from '../core/windows.js';
import { ghostSpot, facingWall } from '../world/window-ghost.js';
import { GhostSnapshot } from './ghost-snapshot.js';

const WAIT = [20, 70]; // s før det dukker opp (igjen)
const GLANCE = [1.5, 3.5]; // s man ser mot det før det er borte
const UNSEEN = 25; // s det venter om man aldri snur seg

export class WindowGhost {
  constructor(viewer, rand = Math.random) {
    this.v = viewer;
    this.rand = rand;
    this._dir = new THREE.Vector3();
    this.snapshot = null; // lastes først når det trengs (Uncanny/Nightmare i et kjellerrom med vindu)
    this.image = null;
    this.reset();
  }

  get visible() {
    return !!this.spot;
  }

  /** Skjult, og ny ventetid (nytt nivå, ny stemning, ut av gåmodus). */
  reset() {
    this._token = null; // et bilde som er under arbeid, gjelder ikke lenger
    this.spot = null;
    this.timer = this._range(WAIT);
    this._apply();
  }

  update(dt, mood) {
    if (!mood.monster || !this._materials().length) {
      if (this.spot) this.reset();
      return;
    }
    const d = this.v.camera.getWorldDirection(this._dir);
    const forward = [d.x, d.z];
    if (this.spot) {
      // Sett: borte etter et glimt. Ikke sett: borte etter en stund (mens man fortsatt ser bort).
      if (facingWall(forward, this.spot.frame)) this.glance -= dt;
      else this.timer -= dt;
      if (this.glance <= 0 || this.timer <= 0) this.reset();
      return;
    }
    this.timer -= dt;
    if (this.timer > 0) return;
    const behind = windows(this.v.walk.level).filter((w) => !facingWall(forward, w.n));
    if (!behind.length) {
      this.timer = 4;
      return;
    }
    const spot = ghostSpot(behind[Math.floor(this.rand() * behind.length)], this.rand);
    this.timer = Infinity; // til bildet er klart
    const token = (this._token = {});
    this.snapshot ??= new GhostSnapshot(this.v.renderer);
    this.snapshot.take(this.rand).then((image) => {
      if (this._token !== token) return; // nullstilt mens modellen lastet
      this.image = image;
      this.spot = image ? spot : null;
      this.timer = image ? UNSEEN : this._range(WAIT);
      this.glance = this._range(GLANCE);
      this._apply();
    });
  }

  _range([a, b]) {
    return a + this.rand() * (b - a);
  }

  /** Utsiktsmaterialene i denne verdenen (alle temaer med utsikt, ikke Level 0). En ny verden (f.eks. etter
   * en endring bak ryggen) får straks samme plassering. */
  _materials() {
    const world = this.v.world;
    if (this._world !== world) {
      this._world = world;
      this._mats = (world?.group.getObjectsByProperty('name', 'windowGlass') ?? []).map((m) => m.material).filter((m) => m.uniforms?.uGhost);
      this._set(this._mats);
    }
    return this._mats;
  }

  _apply() {
    this._set(this._materials());
  }

  _set(materials) {
    const s = this.spot;
    for (const m of materials) {
      m.uniforms.uGhost.value.set(s?.along ?? 0, s?.y ?? 0, s?.out ?? 0, s ? 1 : 0);
      if (!s) continue;
      m.uniforms.uGhostFrame.value.set(s.frame[0], s.frame[1]);
      m.uniforms.uGhostMap.value = this.image.texture;
      m.uniforms.uGhostSize.value.set(this.image.width, this.image.height);
    }
  }
}
