// Noclip i gåmodus (gen/noclip.js): man starter i en vanlig møbelbutikk. Lener man seg mot firkanten på lagerveggen,
// glir man gjennom og havner i Level 0 – og derfra er det én sammenhengende verden uten dører (view3d/zones.js): man går
// og går, og plutselig er man et annet sted. Man kan gå tilbake, og på det første nivået fører en firkant til butikken.
// Stemningen blir verre jo lenger inn man er, uten å røre spillerens valg (quietMood).
import { NOCLIP, storeLevel, storeReturn, againstMark, recordNoclip } from '../gen/noclip.js';
import { loadRuns, saveRuns } from '../core/storage.js';
import { waitWhileWalking } from './walk-session.js';
import { quietMood } from './mood.js';
import { Zones } from './zones.js';
import { Minimap } from './minimap.js';

export class NoclipRun {
  /** @param explorer view3d/explore.js */
  constructor(explorer) {
    this.ex = explorer;
    this.run = null; // { store, push, best, far }
    this.zones = new Zones(explorer.v);
    this.map = new Minimap(explorer.v); // nede til høyre, inne i områdene
  }

  get active() {
    return this.run !== null;
  }

  /** Kalles når gåmodus er startet (view3d/game-mode.js). */
  start() {
    const ex = this.ex;
    this.run = { store: storeLevel(), push: 0, best: 0, far: 0 };
    ex.home ??= ex.v.level;
    ex.tapeCount = () => 0; // ingen kassetter: målet er å komme langt
    ex.v.walk.noDrift = true;
    this._toStore();
    clearTimeout(this._hint);
    this._hint = setTimeout(() => this.run && !ex.depth && ex.v.hud.flash('Just a furniture store. Have a look around – the storeroom is at the back.', 6000), 2500);
  }

  _toStore() {
    const ex = this.ex;
    this.zones.clear();
    quietMood(ex.v, 'normal');
    ex.depth = 0;
    ex.arrive(this.run.store);
  }

  update(dt) {
    const run = this.run;
    if (!run || this.ex.busy) return;
    const v = this.ex.v;
    this.zones.update(dt, (depth) => {
      this.ex.depth = depth;
      run.best = Math.max(run.best, depth);
    });
    if (this.zones.active) {
      run.far = Math.max(run.far, this.zones.distance);
      this.map.update(dt, this.zones);
    } else this.map.show(false);
    const mark = this.zones.c === 0 ? v.walk.level.noclip : null; // firkanten finnes bare i butikken og på det første nivået
    run.push = againstMark(mark, v.walk.walker) ? run.push + dt : 0;
    if (run.push >= NOCLIP.PUSH) {
      run.push = 0;
      this.through();
    }
  }

  /** Gjennom veggen: fra butikken inn i Level 0, eller fra det første nivået tilbake til butikken. */
  async through() {
    const ex = this.ex;
    const v = ex.v;
    const inside = this.zones.active;
    const transition = {};
    ex._transition = transition;
    const current = () => ex._transition === transition;
    ex.busy = true;
    v.hud.glitch();
    v.hud.fade(true);
    try {
      if (!(await waitWhileWalking(v, inside ? 700 : 900, current))) return;
      if (inside) {
        this.run.store.spawn = storeReturn(this.run.store);
        this._toStore();
        v.hud.title('THE STORE', 'Back where everything is normal');
      } else {
        this.zones.begin(ex);
        this.run.best = Math.max(this.run.best, 1);
        v.hud.title('YOU NOCLIPPED', 'Level 0 – keep walking');
        setTimeout(() => this.zones.active && v.hud.flash(v.walk.session?.touch ? 'Tap the map to make it big.' : 'Press M for the big map.', 4000), 5000);
      }
      await waitWhileWalking(v, 250, current);
    } finally {
      if (current()) ex._cancelTransition();
    }
  }

  extra() {
    const { depth } = this.ex;
    return depth ? `NOCLIP · LEVEL ${depth} · ${Math.round(this.zones.distance)} m` : 'NOCLIP · THE STORE';
  }

  /** Ut av modusen: rekorden lagres, områdene kastes, og stemningen spilleren hadde, kommer tilbake. */
  stop() {
    const ex = this.ex;
    if (this.run) {
      if (this.run.best) {
        const runs = loadRuns();
        saveRuns({ ...runs, noclip: recordNoclip(runs.noclip, { depth: this.run.best, distance: this.run.far }) });
      }
      this.zones.clear();
      this.map.show(false);
      quietMood(ex.v, this.mood);
      ex.v.walk.noDrift = false;
      ex.tapeCount = null;
    }
    this.run = null;
    clearTimeout(this._hint);
  }
}
