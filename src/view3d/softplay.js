// Myke lekeklosser og lette gjenstander (plaststoler) i gåmodus: laster fysikken
// (world/softphysics.js, med cannon-es) bare når rommet har slike, flytter 3D-gruppene (og
// skyggene) etter fysikken og stopper spilleren ved høye ting. Gummiklosser har dempet støtlyd. Rommet endres ikke; alt er tilbake etterpå.
import { resolveCircle } from '../world/collision.js';
import { OBJECTS } from '../core/objects.js';
import { bump } from '../audio/effects.js';

const RADIUS = 0.28;

export class SoftPlay {
  /** @param walk gåmodusen (for lyd: walk.audio, walk.sound) */
  constructor(walk) {
    this.walk = walk;
    this.level = null;
    this.objects = null;
    this.phys = null;
  }

  /** Nytt rom (reset() lager fysikken). */
  setWorld(level, objects) {
    this.level = level;
    this.objects = objects;
  }

  /** Ny fysikk med klossene der de står i rommet (også når man går ut av gåmodus). */
  reset(attempt = 0) {
    const level = this.level;
    this.phys = null;
    if (!level?.objects?.some((o) => OBJECTS[o.id]?.soft || OBJECTS[o.id]?.loose)) return;
    import('../world/softphysics.js').then(({ SoftPhysics }) => {
      if (this.level !== level) return;
      this.phys = new SoftPhysics(level);
      this.phys.onImpact = (strength, _x, _z, material) => {
        if (this.walk.sound) bump(this.walk.audio, strength, material);
      };
      this.phys.onSplash = (x, z, strength) => this.onSplash?.(x, z, strength);
      this._apply();
    }).catch((e) => {
      // Prøv igjen et par ganger (f.eks. mens dev-serveren bunter avhengigheter); ellers står klossene stille.
      if (attempt < 3) setTimeout(() => this.level === level && this.reset(attempt + 1), 1500);
      else console.warn('Soft play physics could not load:', e);
    });
  }

  /** Har spilleren flyttet på noe? (Da bygges ikke verdenen på nytt – det ville satt alt tilbake.) */
  disturbed() {
    return !!this.phys?.moved();
  }

  update(dt, walker, riding) {
    if (!this.phys) return;
    this.phys.step(dt, riding ? null : { x: walker.x, y: walker.floorY, z: walker.z, vx: walker.vx, vz: walker.vz });
    if (!riding) {
      const [x, z] = this.phys.pushOut(walker.x, walker.z, RADIUS, walker.floorY);
      if (x !== walker.x || z !== walker.z) [walker.x, walker.z] = resolveCircle(this.level, x, z, RADIUS);
    }
    this._apply();
  }

  _apply() {
    for (const p of this.phys.poses()) {
      const item = this.objects?.items?.[p.i];
      if (!item) continue; // ikke bygget ennå
      item.position.set(p.x, p.y, p.z);
      item.quaternion.set(p.q[0], p.q[1], p.q[2], p.q[3]);
      const shadow = item.userData.shadow;
      if (shadow) shadow.position.set(p.x, p.low + 0.004, p.z);
    }
  }
}
