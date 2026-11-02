// Lights out (Game mode, gen/fuses.js): på hvert nivå er strømmen borte, og sikringsskap på veggene slår
// den på igjen. E ved et skap: et klunk, lyset blinker seg tilbake – litt mer for hvert skap – og når alle
// er på, er dørene til ingensteds åpne (view3d/tape-hunt.js). Skapene summer når man er nær. Strømmen
// erstatter strømbruddene (view3d/explore.js), og i Nightmare jakter monsteret mens det er mørkt.
import { placeFuses, fusePower, fusesLocked } from '../gen/fuses.js';
import { Fuses } from './fuses.js';
import { tapeHum } from '../audio/tape-hum.js';

const HEAR = 12; // m
const FLICKER = 1.2; // s: lyset blinker seg tilbake

export class LightsOut {
  /** @param explorer view3d/explore.js */
  constructor(explorer) {
    this.ex = explorer;
    this.on = false;
    this.fuses = new Fuses();
    explorer.v.scene.add(this.fuses.group);
    this.power = this.target = 1;
    this.flicker = 0;
  }

  get active() {
    return this.on;
  }

  get left() {
    return this.fuses.left;
  }

  get locked() {
    return this.on && fusesLocked({ left: this.left, drifting: this.ex.v.walk.drift.on });
  }

  /** Mørkt nok til at monsteret jakter (Nightmare). */
  get dark() {
    return this.on && this.power < 0.5;
  }

  start() {
    this.on = true;
  }

  stop() {
    this.on = false;
    this.fuses.clear();
    this.power = this.target = 1;
    this.flicker = 0;
  }

  /** Nytt nivå: strømmen er borte, og skapene henger i etasjen man er i. */
  arrive() {
    const v = this.ex.v, s = v.storeys;
    this.fuses.place(placeFuses(v.walk.level, v.walk.walker, Math.random), v.world.field, s.at[s.current], s.current);
    this.power = this.target = fusePower(0, this.fuses.total);
    this.flicker = 0;
  }

  /** E: slå på skapet man står ved. Returnerer true når E er brukt her. */
  use() {
    if (!this.on) return false;
    const v = this.ex.v;
    const item = this.fuses.near(v.walk.walker, v.storeys.current);
    if (!item) return false;
    this.target = fusePower(this.fuses.total - this.left + 1, this.fuses.total);
    this.fuses.switchOn(item, this.target);
    this.flicker = FLICKER;
    if (v.walk.sound) v.audio.power(false);
    const on = this.fuses.total - this.left;
    v.hud.flash(this.left ? `⚡ ${on} of ${this.fuses.total} – the lights flicker back` : '⚡ The power is back – the doors are open', 3000);
    return true;
  }

  prompt() {
    if (!this.on) return null;
    const v = this.ex.v;
    return this.fuses.near(v.walk.walker, v.storeys.current) ? `${v.walk.session.touch ? 'Tap Use to' : 'E –'} switch on the power` : null;
  }

  /** Strømmen denne rammen (0..1): blinker etter at et skap er slått på, ellers som skapene sier. */
  update(dt) {
    if (this.flicker > 0) {
      this.flicker -= dt;
      const rising = 1 - Math.max(0, this.flicker) / FLICKER;
      this.power = Math.random() < 0.55 - rising * 0.4 ? this.target * 0.25 : this.target;
    } else this.power = this.target;
    this.fuses.setPower(this.power);
    return this.power;
  }

  /** Summingen fra nærmeste skap som er av (kalles etter kassettenes, som er stille her). */
  hum() {
    const v = this.ex.v, w = v.walk.walker;
    const n = this.fuses.nearestOff(w.x, w.z);
    const level = n && v.walk.sound ? Math.max(0, 1 - n.d / HEAR) ** 2 : 0;
    const pan = n ? ((n.item.px - w.x) * Math.cos(w.yaw) - (n.item.pz - w.z) * Math.sin(w.yaw)) / (n.d || 1) : 0;
    tapeHum(v.audio, level, pan);
  }

  extra() {
    return `⚡ ${this.fuses.total - this.left}/${this.fuses.total}`;
  }

  lockText() {
    return `The door is locked – the power is out · ⚡ ${this.fuses.total - this.left}/${this.fuses.total}`;
  }
}
