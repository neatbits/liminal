// Hendelser som reagerer på spilleren (world/shifts.js): når det er tid og noe kan endres bak
// ryggen på en, bygges verdenen på nytt fra en kopi av rommet med endringen – mens man ser en
// annen vei. Og av og til, når man stopper etter å ha gått en stund, går noen et par skritt til.
// Bare i gåmodus; rommet i editoren røres ikke (Explorer setter det tilbake når man går ut).
import { cloneLevel, getTile } from '../core/level.js';
import { Shifts } from '../world/shifts.js';
import { surfaceFor } from './walker.js';

const ECHO = { chance: 0.3, after: 2.5, every: [40, 90], steps: [0.45, 0.95], volume: 0.45 };

export class ShiftPlay {
  /** @param explorer view3d/explore.js (stemningen, rommet fra editoren og visningen) */
  constructor(explorer) {
    this.ex = explorer;
    this.reset();
  }

  /** Nytt nivå eller ny stemning: ingen minner, nye tider. */
  reset() {
    this.shifts = new Shifts(Math.random, this.ex.mood.shifts ?? null);
    this.walked = 0; // sekunder man har gått uten å stoppe
    this.echoWait = ECHO.every[0];
    this.pending = []; // ekko-trinn som skal spilles: sekunder igjen
  }

  update(dt) {
    if (!this.shifts.every) return;
    const v = this.ex.v;
    const walk = v.walk;
    const w = walk.walker;
    this.shifts.observe(walk.level, w.x, w.z, dt);
    this._echo(dt, walk, w);
    // Ikke mens man sklir, i en uendelig gang (den flytter en), eller når man har dyttet på noe
    // (å bygge verdenen på nytt ville satt klossene og stolene tilbake).
    if (walk.rider.active || walk.play.soft.disturbed() || this._inLoop(walk, w)) return;
    const s = this.shifts.pick(walk.level, { x: w.x, z: w.z, yaw: w.yaw });
    if (!s) return;
    const copy = cloneLevel(walk.level);
    copy.objects = [...(walk.level.objects ?? [])];
    s.apply(copy);
    this.ex.home ??= v.level;
    v.setLevel(copy, { explorer: true });
  }

  /** Stopper man etter å ha gått en stund, kan det komme et par trinn til – ikke ens egne. */
  _echo(dt, walk, w) {
    this.echoWait -= dt;
    this.pending = this.pending.filter((t) => {
      if (t > dt) return true;
      const level = walk.level;
      const [x, z] = [Math.floor(w.x), Math.floor(w.z)];
      if (walk.sound) walk.audio.step(surfaceFor(walk.theme, getTile(level, x, z), level.finish?.[z * level.w + x] ?? 0), ECHO.volume);
      return false;
    }).map((t) => t - dt);
    const speed = Math.hypot(w.vx, w.vz);
    if (speed > 0.8) this.walked += dt;
    else if (speed < 0.15) {
      if (this.walked > ECHO.after && this.echoWait <= 0 && Math.random() < ECHO.chance) {
        this.pending.push(...ECHO.steps);
        this.echoWait = ECHO.every[0] + Math.random() * (ECHO.every[1] - ECHO.every[0]);
      }
      this.walked = 0;
    }
  }

  _inLoop(walk, w) {
    return (walk.loops?.loops ?? []).some((l) => {
      const [u, c] = l.axis === 'x' ? [w.x, w.z] : [w.z, w.x];
      return u >= l.u0 - 3 && u <= l.u1 + 3 && c >= l.v0 - 4 && c <= l.v1 + 4;
    });
  }
}
