// Utforsking i gåmodus: VHS-kassetter å finne, strømbrudd innimellom, og dører til ingensteds
// som fører videre til et nytt, generert nivå («Level 1», «Level 2» …). Nivåene finnes bare
// i gåmodus; går man ut, er man tilbake i rommet fra editoren. I Scary mode (view3d/scary.js)
// kommer strømbruddene oftere og varer lenger, og noe kommer etter deg i mørket.
import { nextLevel } from '../gen/endless.js';
import { Blackout } from './events.js';
import { Tapes } from './tapes.js';
import { Scary } from './scary.js';

const SCARY_TIMING = { first: [20, 40], every: [45, 90], dark: [12, 18] };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class Explorer {
  constructor(viewer) {
    this.v = viewer;
    this.tapes = new Tapes();
    viewer.scene.add(this.tapes.group);
    this.scary = new Scary(viewer);
    this.blackout = this._newBlackout();
    this.depth = 0; // 0 = rommet fra editoren
    this.home = null; // rommet fra editoren mens man er på et generert nivå
    this.found = 0;
    this.total = 0;
    this.busy = false;
    this._hinted = false;
  }

  /** Gåmodus starter i rommet fra editoren. */
  enter() {
    this.depth = 0;
    this.found = this.total = 0;
    this.blackout = this._newBlackout();
    this.scary.reset();
    this._placeTapes();
    if (!this._hinted && this._hasExits()) {
      this._hinted = true;
      this._hint = setTimeout(() => this.v.hud.flash('Somewhere there is a door that leads nowhere. Or somewhere else.', 4000), 2500);
    }
  }

  /** Ut av gåmodus: tilbake til rommet fra editoren. */
  exit() {
    this.tapes.clear();
    this.scary.reset();
    this.v.world?.setPower(1);
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
    this.home = null;
    this.depth = 0;
  }

  update(dt) {
    const v = this.v;
    if (this._scaryOn !== !!v.settings.scary) {
      // Slått av eller på: nye tider for strømbruddene, og monsteret forsvinner om det er av.
      this._scaryOn = !!v.settings.scary;
      this.blackout = this._newBlackout();
      if (!this._scaryOn) this.scary.hide();
    }
    const event = this.blackout.update(dt);
    const p = this.blackout.power;
    v.world.setPower(p);
    v.walk.power = p;
    this.tapes.setPower(p);
    if (v.walk.sound && (event === 'down' || event === 'up')) v.audio.power(event === 'down');
    if (this._scaryOn && !this.busy) this.scary.update(dt, p, this.blackout.phase === 'dark', !!v.settings.scaryMild, () => this.noclip());
    const w = v.walk.walker;
    const got = this.tapes.pickUp(w.x, w.floorY, w.z);
    if (got) {
      this.found += got;
      if (v.walk.sound) v.audio.pickup();
      v.hud.flash(this.tapes.left ? `📼 Tape ${this.found} of ${this.total}` : `📼 Tape ${this.found} of ${this.total} – all tapes on this level found`);
    }
    v.hud.setExtra([this.depth ? `LEVEL ${this.depth}` : null, this.total ? `📼 ${this.found}/${this.total}` : null].filter(Boolean).join(' · '));
  }

  /** Monsteret tok deg: bildet rives opp, og du våkner et annet sted. */
  noclip() {
    this.v.hud.glitch();
    this.goDeeper({ title: 'YOU NOCLIPPED', wait: 900 });
  }

  /** Gjennom en dør til ingensteds: svart, nytt nivå, tittel – og videre. */
  async goDeeper({ title = null, wait = 650 } = {}) {
    const v = this.v;
    if (this.busy) return;
    this.busy = true;
    clearTimeout(this._hint);
    v.hud.fade(true);
    if (v.walk.sound && !title) v.audio.door(true);
    await sleep(wait);
    if (v.mode !== 'walk') {
      // Gikk ut av gåmodus under overgangen: bli i rommet fra editoren.
      v.hud.fade(false);
      this.busy = false;
      return;
    }
    this.home ??= v.level;
    this.depth++;
    const { level, label } = nextLevel(this.depth, v.world.theme.id, Math.random);
    v.setLevel(level, { explorer: true });
    v.walk.enter();
    this.blackout = this._newBlackout();
    this.scary.reset();
    this._placeTapes();
    v.hud.title(title ?? `LEVEL ${this.depth}`, title ? `Level ${this.depth} – ${label}` : label);
    await sleep(250);
    v.hud.fade(false);
    this.busy = false;
  }

  _newBlackout() {
    return new Blackout(Math.random, this.v.settings.scary ? SCARY_TIMING : undefined);
  }

  /** Nye kassetter på nivået; de man ikke fant på forrige nivå, telles ikke lenger. */
  _placeTapes() {
    const v = this.v;
    this.total = this.found + this.tapes.place(v.walk.level, v.world.field, v.walk.walker);
  }

  _hasExits() {
    const level = this.v.walk.level;
    for (let z = 0; z < level.h; z++) for (let x = 0; x < level.w; x++) if (this.v.walk.isExit(x, z)) return true;
    return false;
  }
}
