// Lek i vannet i gåmodus: badeender som dyttes rundt (world/floaters.js) og kjølvann i
// ballbingene (world/balls.js). Flytter gjenstandenes 3D-grupper; rommet endres ikke.
import { TILE, getTile } from '../core/level.js';
import { Floaters } from '../world/floaters.js';

const BODY_RADIUS = 0.28;

export class WaterPlay {
  constructor() {
    this.level = null;
    this.objects = null;
    this.balls = null;
    this.floaters = null;
  }

  /** @param objects createObjects-resultatet (items), balls createBalls-resultatet eller null */
  setWorld(level, objects = null, balls = null) {
    this.level = level;
    this.objects = objects;
    this.balls = balls;
    this.reset();
  }

  /** Endene tilbake der de står i editoren. */
  reset() {
    if (!this.level) return;
    this.floaters = new Floaters(this.level);
    this._apply();
  }

  /** Plask (f.eks. landing fra sklien): ender og baller dyttes utover. */
  splash(x, z, strength = 1.5) {
    this.floaters?.splash(x, z, strength);
    this.balls?.touch(x, z, strength);
  }

  update(dt, walker, riding) {
    if (!this.floaters) return;
    const player = riding ? null : { x: walker.x, z: walker.z, vx: walker.vx, vz: walker.vz, r: BODY_RADIUS };
    if (this.floaters.bodies.length) {
      this.floaters.step(dt, player);
      this._apply();
    }
    if (this.balls && player && getTile(this.level, Math.floor(walker.x), Math.floor(walker.z)) === TILE.WATER) {
      this.balls.touch(walker.x, walker.z, 1);
    }
  }

  _apply() {
    for (const p of this.floaters.poses()) {
      const item = this.objects?.items?.[p.i];
      if (!item) continue; // modellen er ikke lastet ennå
      item.position.set(p.x, p.y, p.z);
      item.rotation.set(p.tilt, p.yaw, 0, 'YXZ');
    }
  }
}
