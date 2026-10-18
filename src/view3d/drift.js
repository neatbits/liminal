// Drømmegange i gåmodus (G / «Drift»): autopiloten (world/autopilot.js) styrer gåeren sakte
// rundt – med myke svinger og lite hodebevegelse – og går gjennom dører til ingensteds videre
// til nye nivåer. Musen kan fortsatt se seg rundt; trykker man en gåtast, tar man over selv.
import { Autopilot } from '../world/autopilot.js';

const TURN = 1.6; // hvor raskt den svinger (1/s)

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export class Drift {
  constructor(walk) {
    this.walk = walk;
    this.on = false;
    this.pilot = null;
  }

  set(on) {
    if (this.on === on) return;
    this.on = on;
    this.pilot = on && this.walk.level ? new Autopilot(this.walk.level) : null;
    this.walk.walker.bobScale = on ? 0.35 : 1;
    this.walk.hud.setDrifting(on);
  }

  toggle() {
    this.set(!this.on);
    this.walk.hud.flash(this.on ? 'Drifting… press a movement key to take over' : 'Drift off', 2500);
  }

  /** Nytt rom eller nytt nivå: ny rute. */
  reset() {
    if (this.on) this.pilot = new Autopilot(this.walk.level);
  }

  /**
   * Input for gåeren denne rammen, eller null når man går selv.
   * @returns {{ forward, strafe, running, consumeLook } | null}
   */
  input(dt) {
    const real = this.walk.input;
    if (!this.on) return null;
    if (real.forward || real.strafe) {
      this.set(false); // man tar over selv
      return null;
    }
    const w = this.walk.walker;
    const step = this.pilot?.update(dt, w);
    if (step?.exit) {
      w.yaw += wrap(step.exit.yaw - w.yaw) * Math.min(1, dt * TURN * 2);
      this.walk.onExit?.(step.exit);
      return { forward: 0, strafe: 0, running: false, consumeLook: () => real.consumeLook() };
    }
    let forward = 0;
    if (step && step.yaw !== null) {
      const diff = wrap(step.yaw - w.yaw);
      w.yaw += diff * Math.min(1, dt * TURN);
      // Saktere i krappe svinger, og blikket sakte tilbake mot horisonten.
      forward = step.forward * Math.max(0.25, Math.cos(diff));
      w.pitch += (-0.04 - w.pitch) * Math.min(1, dt * 0.5);
    }
    return { forward, strafe: 0, running: false, consumeLook: () => real.consumeLook() };
  }
}
