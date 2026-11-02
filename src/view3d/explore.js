// Utforsking i gåmodus: VHS-kassetter å finne, strømbrudd innimellom, og dører til ingensteds
// som fører videre til et nytt, generert nivå («Level 1», «Level 2» …). Nivåene finnes bare
// i gåmodus; går man ut, er man tilbake i rommet fra editoren. Stemningen (gen/moods.js) styrer
// strømbrudd, avvik, hvor feil rommene er og monsteret (view3d/scary.js).
import { nextLevel } from '../gen/endless.js';
import { getMood, moodLevel } from '../gen/moods.js';
import { getLevelSize } from '../gen/sizes.js';
import { Blackout } from './events.js';
import { Tapes } from './tapes.js';
import { TapeHunt } from './tape-hunt.js';
import { WindowGhost } from './window-ghost.js';
import { Darkness, wakeAtStart } from './nightmare.js';
import { Scary } from './scary.js';
import { ShiftPlay } from './shifts.js';
import { waitWhileWalking } from './walk-session.js';
import { DailyRun } from './daily.js';
import { LightsOut } from './lights-out.js';
import { SpotRun } from './spot.js';
import { DescentRun } from './descent.js';
import { NoclipRun } from './noclip.js';
import { placeLevelTapes } from './tape-placing.js';
import { DESCENT } from '../gen/descent.js';

const NEVER = { first: [1e9, 1e9], every: [1e9, 1e9] };

export class Explorer {
  constructor(viewer) {
    this.v = viewer;
    this.tapes = new Tapes();
    viewer.scene.add(this.tapes.group);
    this.hunt = new TapeHunt(this); // låste dører til kassettene er funnet, summing, fremgang
    this.windowGhost = new WindowGhost(viewer); // skikkelsen utenfor vinduene (Uncanny/Nightmare)
    this.darkness = new Darkness(viewer); // står man i mørket? (Nightmare: der jakter monsteret)
    this.levelFound = 0; // kassetter funnet før dette nivået (Nightmare: tatt = de herfra er tapt)
    this.scary = new Scary(viewer);
    this.shifts = new ShiftPlay(this); // rommet endrer seg bak ryggen på en (world/shifts.js)
    this.daily = new DailyRun(this); // dagens nivå på tid (view3d/daily.js)
    this.lightsOut = new LightsOut(this); // Game mode uten strøm: sikringsskap i stedet for kassetter
    viewer.walk.interact = this.lightsOut; // E ved et sikringsskap (view3d/walkmode.js)
    this.spot = new SpotRun(this); // samme gang igjen og igjen (gen/spot.js)
    this.descent = new DescentRun(this); // ett forsøk, stadig dypere (gen/descent.js)
    this.noclip = new NoclipRun(this); // fra en butikk gjennom veggen og innover (gen/noclip.js)
    this.tapeCount = null; // (dybde) → kassetter på nivået, når modusen bestemmer det
    this.blackout = this._newBlackout();
    this.depth = 0; // 0 = rommet fra editoren
    this.home = null; // rommet fra editoren mens man er på et generert nivå
    this.found = 0;
    this.total = 0;
    this.busy = false;
    this._hinted = false;
  }

  get mood() {
    return getMood(this.v.settings.mood);
  }

  /** Modusene med egen tilstand: den aktive styrer HUD-linjen og kan gripe inn når nivåer lages (beforeLevel, theme, prepare, arrive). */
  get runs() { return [this.spot, this.descent, this.daily, this.noclip]; }
  _run() { return this.runs.find((r) => r.active) ?? null; }

  /**
   * Gåmodus starter i rommet fra editoren – i sterkere stemninger en kopi med ødelagte lys og små
   * feil (rommet i editoren endres ikke; det settes tilbake når man går ut).
   */
  enter() {
    this._cancelTransition();
    const v = this.v;
    const changed = moodLevel(v.level, v.settings.mood, Math.random, { home: true });
    if (changed) {
      this.home = v.level;
      v.setLevel(changed, { explorer: true });
      v.walk.walker.settle(v.walk.level);
    }
    this._moodId = v.settings.mood;
    this.depth = 0;
    this.found = this.total = 0;
    this.blackout = this._newBlackout();
    this.scary.reset(true); // true: lastes og forberedes nå (view3d/scary.js)
    this.shifts.reset();
    this.windowGhost.reset();
    this._placeTapes();
    if (!this._hinted && this._hasExits()) {
      this._hinted = true;
      this._hint = setTimeout(() => this.v.hud.flash('Somewhere there is a door that leads nowhere. Or somewhere else.', 4000), 2500);
    }
  }

  /** Ut av gåmodus: tilbake til rommet fra editoren. */
  exit() {
    this._cancelTransition();
    for (const r of [...this.runs, this.lightsOut]) r.stop();
    this.tapes.clear();
    this.hunt.stop();
    this.windowGhost.reset();
    this.scary.reset();
    this.v.storeys.setPower(1);
    this.v.walk.power = 1;
    if (this.home) {
      const home = this.home;
      this.home = null;
      this.depth = 0;
      this.v.setLevel(home, { explorer: true });
    }
  }

  /** Editoren har byttet rom mens man var på et generert nivå: det gjelder ikke lenger. */
  abandon() {
    this._cancelTransition();
    for (const r of [...this.runs, this.lightsOut]) r.stop();
    this.home = null;
    this.depth = 0;
  }

  update(dt) {
    const v = this.v;
    if (v.walk.paused) return;
    if (this._moodId !== v.settings.mood) {
      // Ny stemning: nye tider for strømbruddene, og monsteret forsvinner om det ikke hører hjemme.
      this._moodId = v.settings.mood;
      this.blackout = this._newBlackout();
      this.shifts.reset();
      if (!this.mood.monster) this.scary.hide();
    }
    const event = this.blackout.update(dt);
    const p = this.lightsOut.active ? this.lightsOut.update(dt) : this.blackout.power;
    v.storeys.setPower(p); // hele bygget
    v.walk.power = p;
    this.tapes.setPower(p);
    if (v.walk.sound && (event === 'down' || event === 'up')) v.audio.power(event === 'down');
    const monster = this.mood.monster;
    if (monster && !this.busy) {
      const { chase } = this.mood;
      const dark = this.blackout.phase === 'dark' || this.lightsOut.dark || (!!chase?.inDarkness && this.darkness.update());
      const caught = this.descent.active ? () => this.descent.die() : chase?.caught === 'restart' ? () => wakeAtStart(this) : () => this.noclip();
      this.scary.update(dt, p, dark, monster === 'lurk' && !this.descent.lethal, caught, chase);
    }
    if (!this.busy && !this.noclip.active) this.shifts.update(dt); // Noclip: ombygging ville brutt skjøtene
    if (!this.busy) this.windowGhost.update(dt, this.mood);
    const w = v.walk.walker;
    const got = this.tapes.pickUp(w.x, w.floorY, w.z, v.storeys.current);
    if (got) {
      this.found += got;
      if (v.walk.sound) v.audio.pickup();
      this.hunt.pickedUp(got);
    }
    if (!this.busy) this.hunt.update();
    if (!this.busy && this.lightsOut.active) this.lightsOut.hum();
    for (const r of this.runs) r.update(dt);
    const run = this._run();
    const where = run ? run.extra() : this.depth ? `${this.lightsOut.active ? 'LIGHTS OUT · ' : ''}LEVEL ${this.depth}` : null;
    const goal = this.spot.active || this.noclip.active ? null : this.lightsOut.active ? this.lightsOut.extra() : this.total ? `📼 ${this.found}/${this.total}` : null;
    const deepest = run || this.lightsOut.active ? null : this.hunt.extra();
    v.hud.setExtra([where, goal, deepest].filter(Boolean).join(' · '));
  }

  /** Monsteret tok deg: bildet rives opp, og du våkner et annet sted. */
  noclip() {
    this.v.hud.glitch();
    this.goDeeper({ title: 'YOU NOCLIPPED', wait: 900 });
  }

  /**
   * Gjennom en dør til ingensteds: svart, nytt nivå, tittel – og videre. Alltid et nytt rom, aldri
   * tilbake til et man har vært i.
   * @param door døren man gikk gjennom ({ info: { x, z } }), eller null (noclip)
   */
  async goDeeper({ title = null, wait = 650, door = null } = {}) {
    const v = this.v;
    if (this.busy || v.walk.paused) return;
    if (this.daily.active) return this.daily.leave(door); // Daily level: døren er målet
    if (this.spot.active) return this.spot.leave(door); // Spot the wrong: døren er svaret
    if (door && !this.hunt.tryExit()) return; // låst til kassettene er funnet (noclip slipper gjennom)
    const transition = {};
    this._transition = transition;
    const current = () => this._transition === transition;
    this.busy = true;
    clearTimeout(this._hint);
    v.hud.fade(true);
    if (v.walk.sound && !title) v.audio.door(true);
    try {
      if (!(await waitWhileWalking(v, wait, current))) return;
      this.home ??= v.level;
      this.depth++;
      const run = this._run();
      run?.beforeLevel?.(this.depth);
      const { anomalies } = this.mood;
      const { scale } = getLevelSize(v.settings.levelSize);
      const next = nextLevel(this.depth, v.world.theme.id, Math.random, this.descent.active ? { corridor: 0 } : anomalies, this.descent.active ? scale * DESCENT.SCALE : scale, run?.theme?.(this.depth));
      const { label, kind } = next;
      // Genererte nivåer gjøres feil etter stemningen (ikke korridorene – de må beholde mønsteret).
      const level = ((kind === 'room' || kind === 'halls') && moodLevel(next.level, v.settings.mood, Math.random)) || next.level;
      run?.prepare?.(level, this.depth);
      this.arrive(level);
      this.hunt.reached(this.depth);
      v.hud.title(title ?? `LEVEL ${this.depth}`, title ? `Level ${this.depth} – ${label}` : label);
      await waitWhileWalking(v, 250, current);
    } finally {
      if (current()) this._cancelTransition();
    }
  }

  /**
   * Inn på et nytt nivå: verdenen, gåingen, hendelsene og kassettene. rand: tilfeldighetene for
   * kassettene; loops: false gjør plasseringen uavhengig av de uendelige gangene (likt for alle).
   */
  arrive(level, rand = Math.random, { loops = true } = {}) {
    const v = this.v;
    v.setLevel(level, { explorer: true });
    v.walk.enter();
    this.blackout = this._newBlackout();
    this.scary.reset(true);
    this.shifts.reset();
    this.windowGhost.reset();
    this._placeTapes(rand, loops);
    if (this.lightsOut.active) {
      // Lights out: ingen kassetter – sikringsskapene er målet.
      this.tapes.clear();
      this.found = this.total = 0;
      this.lightsOut.arrive();
    }
    if (this.spot.active) {
      // Spot the wrong: bare gangen. Ingen kassetter, ingen hendelser.
      this.tapes.clear();
      this.found = this.total = 0;
    }
    this._run()?.arrive?.();
  }

  _cancelTransition() {
    this._transition = null;
    this.busy = false;
    clearTimeout(this._hint);
    this.v.hud.fade(false);
  }

  _newBlackout() {
    return new Blackout(Math.random, this.lightsOut?.active ? NEVER : this.mood.blackout ?? NEVER); // Lights out styrer strømmen selv
  }

  _placeTapes(rand = Math.random, avoidLoops = true) {
    placeLevelTapes(this, rand, avoidLoops);
  }

  _hasExits() {
    const level = this.v.walk.level;
    for (let z = 0; z < level.h; z++) for (let x = 0; x < level.w; x++) if (this.v.walk.isExit(x, z)) return true;
    return false;
  }
}
