// Spot the wrong i gåmodus (gen/spot.js): hver runde er den samme gangen, kanskje med én ting feil. Døren i
// enden er «alt er som før», døren bak en er «noe er feil». Feil svar nullstiller rekken, og man får vite hva
// man overså. Ferdig: resultatet går til appen (viewer.options.onRun).
import { SPOT, SPOT_THEMES, spotBase, spotRound, spotRight, recordSpot } from '../gen/spot.js';
import { formatTime } from '../gen/daily.js';
import { loadRuns, saveRuns } from '../core/storage.js';
import { waitWhileWalking } from './walk-session.js';
import { quietMood } from './mood.js';

export class SpotRun {
  /** @param explorer view3d/explore.js */
  constructor(explorer) {
    this.ex = explorer;
    this.run = null; // { base, streak, time, round, last, turns }
  }

  get active() {
    return this.run !== null;
  }

  /** Kalles når gåmodus er startet (view3d/game-mode.js). */
  start(rand = Math.random) {
    const ex = this.ex;
    const theme = SPOT_THEMES[Math.floor(rand() * SPOT_THEMES.length)];
    this.run = { base: spotBase(theme, rand), streak: 0, time: 0, round: null, last: null, turns: 0 };
    ex.home ??= ex.v.level;
    ex.depth = 1;
    ex.v.walk.noDrift = true; // drømmegangen svarer ikke for deg
    this._enter(true);
    ex.v.hud.title('SPOT THE WRONG', 'Learn this corridor');
    ex.v.hud.fade(false);
    clearTimeout(this._hint);
    this._hint = setTimeout(() => this.run && ex.v.hud.flash('All as before: go on through the far door. Anything wrong: turn back through the door behind you.', 7000), 2600);
  }

  _enter(first) {
    const run = this.run;
    run.round = spotRound(run.base, run.streak, Math.random, { first, last: run.last });
    run.last = run.round.change?.name ?? run.last;
    this.ex.arrive(run.round.level);
  }

  update(dt) {
    if (this.run && !this.ex.busy) this.run.time += dt;
  }

  extra() {
    return `SPOT THE WRONG · ${this.run.streak} / ${SPOT.GOAL} · ⏱ ${formatTime(this.run.time)}`;
  }

  /** Gjennom en av dørene: var det riktig? */
  async leave(door) {
    const { ex, run } = this;
    const v = ex.v;
    if (!door || ex.busy) return;
    const back = door.info.x === v.walk.level.spot.back;
    const { change } = run.round;
    const right = spotRight(change, back);
    run.turns++;
    run.streak = right ? run.streak + 1 : 0;
    if (right && run.streak < SPOT.GOAL) saveRuns({ ...loadRuns(), spot: recordSpot(loadRuns().spot, { streak: run.streak }) });
    const transition = {};
    ex._transition = transition;
    const current = () => ex._transition === transition;
    ex.busy = true;
    if (!right) v.hud.glitch();
    v.hud.fade(true);
    if (v.walk.sound) v.audio.door(true);
    try {
      if (!(await waitWhileWalking(v, 550, current))) return;
      if (run.streak >= SPOT.GOAL) return void this.finish();
      this._enter(!right);
      if (right) v.hud.title(`${run.streak} / ${SPOT.GOAL}`, change ? `Yes: ${change.what.toLowerCase()}` : 'Nothing had changed');
      else v.hud.title('BACK TO ZERO', change ? `You missed it: ${change.what.toLowerCase()}` : 'Nothing was wrong. You turned back for no reason');
      await waitWhileWalking(v, 250, current);
    } finally {
      if (current()) ex._cancelTransition();
    }
  }

  finish() {
    const { time, turns } = this.run;
    const runs = loadRuns();
    const spot = recordSpot(runs.spot, { streak: SPOT.GOAL, time });
    const saved = saveRuns({ ...runs, spot });
    this.stop();
    const v = this.ex.v;
    v.exitWalk(false);
    v.options.onRun?.({ mode: 'spot', won: true, time, turns, saved, ...spot });
  }

  /** Ut av modusen: stemningen spilleren hadde, tilbake. */
  stop() {
    if (this.run) {
      quietMood(this.ex.v, this.mood);
      this.ex.v.walk.noDrift = false;
    }
    this.run = null;
    clearTimeout(this._hint);
  }
}
