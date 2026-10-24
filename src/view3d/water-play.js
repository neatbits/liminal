// Lek i vannet i gåmodus: badeender som dyttes rundt (world/floaters.js), ringer i vannet der man
// vasser og plasker (world/ripples.js), kjølvann i ballbingene (world/balls.js), og myke lekeklosser
// med fysikk (softplay.js). Flytter gjenstandenes 3D-grupper; rommet endres ikke.
import { WATER_SURFACE } from '../core/level.js';
import { waterCell } from '../core/pillar-water.js';
import { Floaters } from '../world/floaters.js';
import { Ripples } from '../world/ripples.js';
import { SoftPlay } from './softplay.js';

const BODY_RADIUS = 0.28;

export class WaterPlay {
  /** @param walk gåmodusen (lyd til klossene) */
  constructor(walk) {
    this.soft = new SoftPlay(walk);
    this.soft.onSplash = (x, z, strength) => {
      this.splash(x, z, strength);
      const distance = Math.hypot(x - walk.walker.x, z - walk.walker.z);
      const gain = Math.min(0.8, strength * 0.4) / (1 + distance * distance * 0.08);
      if (walk.sound) walk.audio.splash(strength * 2, gain);
    };
    this.level = null;
    this.objects = null;
    this.balls = null;
    this.floaters = null;
    this.water = null;
    this.ripples = new Ripples();
  }

  /** @param objects createObjects-resultatet (items), balls createBalls-resultatet eller null, water vannflaten */
  setWorld(level, objects = null, balls = null, water = null) {
    this.level = level;
    this.objects = objects;
    this.balls = balls;
    this.water = water;
    this.ripples = new Ripples();
    this.soft.setWorld(level, objects);
    this.reset();
  }

  /** Endene og klossene tilbake der de står i editoren. */
  reset() {
    if (!this.level) return;
    this.soft.reset();
    this.ripples = new Ripples();
    this.water?.setRipples(this.ripples.values());
    this.floaters = new Floaters(this.level);
    this._apply();
  }

  /** Plask (f.eks. landing fra sklien): ender og baller dyttes utover. */
  splash(x, z, strength = 1.5) {
    this.floaters?.splash(x, z, strength);
    this.balls?.touch(x, z, strength);
    if (this.water) this.ripples.splash(x, z, strength);
  }

  update(dt, walker, riding) {
    if (!this.floaters) return;
    this.soft.update(dt, walker, riding);
    const player = riding ? null : { x: walker.x, z: walker.z, vx: walker.vx, vz: walker.vz, r: BODY_RADIUS };
    if (this.floaters.bodies.length) {
      this.floaters.step(dt, player);
      this._apply();
    }
    const inWater = player && waterCell(this.level, Math.floor(walker.x), Math.floor(walker.z));
    if (this.balls && inWater) this.balls.touch(walker.x, walker.z, 1);
    if (this.water) {
      // Ringer der man vasser eller svømmer (ikke oppe på stupebrettet eller i lufta over vannet).
      if (inWater && walker.floorY < WATER_SURFACE && !walker.vy) this.ripples.wade(walker.x, walker.z, Math.hypot(walker.vx, walker.vz));
      this.ripples.step(dt);
      this.water.setRipples(this.ripples.values());
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
