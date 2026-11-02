// Daily level i gåmodus (gen/daily.js): dagens nivå med kassettene fra datoens frø, en klokke som går
// når man ikke har pause, og mål når man går gjennom døren etter å ha funnet alle kassettene. Da lagres
// tiden (core/storage.js), man går ut av gåmodus, og appen viser resultatet (viewer.options.onDaily).
import { dailyKey, dailyLabel, dailyLevel, formatTime, recordRun, streak, shareText } from '../gen/daily.js';
import { loadDaily, saveDaily } from '../core/storage.js';

export class DailyRun {
  /** @param explorer view3d/explore.js */
  constructor(explorer) {
    this.ex = explorer;
    this.run = null; // { key, label, time }
  }

  get active() {
    return this.run !== null;
  }

  /** Dagens nivå (kalles når gåmodus er startet, view3d/game-mode.js). */
  start(key = dailyKey()) {
    const ex = this.ex;
    const { level, rand, label } = dailyLevel(key);
    this.run = { key, label, time: this.run?.key === key ? this.run.time : 0 };
    ex.home ??= ex.v.level;
    ex.depth = 1;
    ex.found = 0;
    ex.arrive(level, rand, { loops: false }); // kassettene fra frøet, likt for alle
    ex.v.hud.title('DAILY LEVEL', `${dailyLabel(key)} – ${label}`);
    ex.v.hud.fade(false);
    clearTimeout(this._hint);
    this._hint = setTimeout(() => this.run && ex.v.hud.flash('Find every tape – the door opens when you have them all. The clock is running.', 5000), 2600);
  }

  update(dt) {
    if (this.run && !this.ex.busy) this.run.time += dt;
  }

  extra() {
    return `DAILY · ⏱ ${formatTime(this.run.time)}`;
  }

  /** Gjennom en dør til ingensteds: mål når kassettene er funnet. Uten dør (noclip): samme nivå igjen, klokken går. */
  leave(door) {
    if (!door) return this.start(this.run.key);
    if (this.ex.v.walk.drift.on) return; // drømmegangen åpner dørene, men teller ikke her
    if (!this.ex.hunt.tryExit()) return;
    this.finish();
  }

  finish() {
    const { key, label, time } = this.run;
    const records = recordRun(loadDaily(), key, time);
    const saved = saveDaily(records);
    const days = streak(records, key);
    const tapes = this.ex.total;
    this.stop();
    const v = this.ex.v;
    v.exitWalk(false);
    v.options.onDaily?.({ key, date: dailyLabel(key), label, time, tapes, saved, days, ...records[key], share: shareText(key, time, tapes, days) });
  }

  stop() {
    this.run = null;
    clearTimeout(this._hint);
  }
}
