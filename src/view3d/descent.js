// The Descent i gåmodus (gen/descent.js): ett forsøk gjennom stadig verre nivåer. Lykten tømmes, batterier ligger
// på gulvet, og tar skikkelsen deg, er det over. Stemningen følger dybden uten å røre spillerens valg.
import { DESCENT, descentMood, descentTapes, descentBatteries, descentLethal, charged, recordDescent } from '../gen/descent.js';
import { placeTapes } from '../gen/tapes.js';
import { formatTime } from '../gen/daily.js';
import { loadRuns, saveRuns } from '../core/storage.js';
import { waitWhileWalking } from './walk-session.js';
import { quietMood } from './mood.js';
import { Batteries } from './batteries.js';

export class DescentRun {
  /** @param explorer view3d/explore.js */
  constructor(explorer) {
    this.ex = explorer;
    this.run = null; // { time, tapes, warned }
    this.batteries = new Batteries();
    explorer.v.scene.add(this.batteries.group);
  }

  get active() {
    return this.run !== null;
  }

  /** Dette dypet tar skikkelsen deg (view3d/explore.js). */
  get lethal() {
    return this.active && descentLethal(this.ex.depth);
  }

  get lamp() {
    return this.ex.v.walk.flashlight;
  }

  /** Kalles når gåmodus er startet (view3d/game-mode.js). */
  start() {
    const ex = this.ex;
    this.run = { time: 0, warned: false };
    this.lamp.fit(true);
    ex.v.walk.noDrift = true; // drømmegangen ville åpnet dørene
    ex.depth = 0;
    ex.found = 0;
    ex.tapeCount = descentTapes;
    ex.goDeeper({ wait: 450 });
    clearTimeout(this._hint);
    this._hint = setTimeout(() => this.run && ex.v.hud.flash('One life. Your flashlight (F) runs down, so look for batteries. Find the tapes to open the door.', 7000), 3000);
  }

  /** Før nivået lages: stemningen for dypet (den avgjør hvor feil det blir). */
  beforeLevel(depth) {
    quietMood(this.ex.v, descentMood(depth));
  }

  /** Nivået er klart: batterier på gulvet. */
  arrive() {
    const v = this.ex.v;
    const count = descentBatteries(this.ex.depth);
    const spots = placeTapes(v.walk.level, v.walk.walker, Math.random, count);
    this.batteries.place(spots, v.world.field, v.storeys.at[v.storeys.current]);
    if (this.ex.depth === DESCENT.LETHAL) setTimeout(() => this.run && v.hud.flash('Something down here can take you now.', 5000), 3000);
  }

  update(dt) {
    if (!this.run || this.ex.busy) return;
    this.run.time += dt;
    const v = this.ex.v, w = v.walk.walker, lamp = this.lamp;
    this.batteries.setPower(v.walk.power);
    if (this.batteries.pickUp(w.x, w.floorY, w.z)) {
      lamp.battery = charged(lamp.battery);
      if (v.walk.sound) v.audio.pickup();
      v.hud.flash(`🔋 ${Math.round(lamp.battery * 100)} %`);
      this.run.warned = false;
    }
    if (lamp.battery < 0.15 && !this.run.warned) {
      this.run.warned = true;
      v.hud.flash('🔋 The flashlight is running out');
    }
  }

  extra() {
    return `DESCENT · LEVEL ${this.ex.depth} · 🔋 ${Math.round(this.lamp.battery * 100)} %`;
  }

  /** Skikkelsen tok deg: forsøket er over. */
  async die() {
    const ex = this.ex;
    const v = ex.v;
    if (ex.busy || !this.run) return;
    const transition = {};
    ex._transition = transition;
    ex.busy = true;
    v.hud.glitch();
    v.hud.fade(true);
    await waitWhileWalking(v, 900, () => ex._transition === transition);
    if (ex._transition !== transition) return;
    ex._cancelTransition();
    this.finish();
  }

  finish() {
    const ex = this.ex;
    const result = { depth: ex.depth, time: this.run.time, tapes: ex.found };
    const runs = loadRuns();
    const before = runs.descent?.bestDepth ?? 0;
    const descent = recordDescent(runs.descent, result);
    const saved = saveRuns({ ...runs, descent });
    this._end();
    ex.v.exitWalk(false);
    ex.v.options.onRun?.({ mode: 'descent', ...result, ...descent, record: result.depth > before, saved });
  }

  /** Ut av modusen. Går man ut midt i, teller dybden likevel. */
  stop() {
    const ex = this.ex;
    if (this.run && ex.depth > 0) {
      const runs = loadRuns();
      saveRuns({ ...runs, descent: recordDescent(runs.descent, { depth: ex.depth, time: this.run.time, tapes: ex.found }) });
    }
    this._end();
  }

  _end() {
    const ex = this.ex;
    if (this.run) quietMood(ex.v, this.mood);
    ex.v.walk.noDrift = false;
    this.run = null;
    ex.tapeCount = null;
    this.batteries.clear();
    this.lamp.fit(false);
    clearTimeout(this._hint);
  }
}
