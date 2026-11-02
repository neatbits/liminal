// Heisene i gåmodus (core/elevators.js): E ved dørene ute kaller heisen, som kommer (pling) og åpner. Inne velger E
// neste etasje (eller tallet for etasjen). Dørene lukkes, vognen knirker og durer, lyset blafrer, og man kommer ut i
// etasjen man valgte – samme punkt i vognen, etasjebyttet går gjennom view3d/storeys.js (enter). Dørene stopper for
// den som står i døråpningen. Mens de ikke er åpne, er døråpningen vegg i etasjen man går i (walk.level).
import { TILE } from '../core/level.js';
import { STAIR_DIRS } from '../core/heights.js';
import { liftSound, liftMotor } from '../audio/lift.js';

const OPEN_TIME = 1.1; // s: dørene glir
const HOLD = 5; // s: så lenge dørene står åpne
const TRAVEL = [2.6, 1.6]; // s: turen, pluss per etasje
const REACH = 1.8; // så nær dørene man må stå for å kalle heisen

const cellIn = (cells, x, z) => cells.some(([cx, cz]) => cx === Math.floor(x) && cz === Math.floor(z));
const nearCells = (cells, x, z, r) => cells.some(([cx, cz]) => Math.hypot(x - Math.max(cx, Math.min(x, cx + 1)), z - Math.max(cz, Math.min(z, cz + 1))) < r);

export class Lifts {
  /** @param storeys view3d/storeys.js (etasjene, verdenene og enter(k)) */
  constructor(storeys) {
    this.s = storeys;
    this.list = [];
  }

  get walk() {
    return this.s.v.walk;
  }

  /** Etter at etasjene er bygget: én tilstand per heis, vognen i startetasjen (ellers nederst). */
  reset() {
    this.stop();
    const byId = new Map();
    this.s.levels.forEach((level, k) => {
      for (const l of level.lifts ?? []) {
        if (!byId.has(l.id)) byId.set(l.id, { ...l, floors: {}, at: l.stops.includes(this.s.spawn) ? this.s.spawn : l.stops[0], phase: 'idle', open: 0, t: 0, target: null, call: null });
        byId.get(l.id).floors[k] = l.floor;
      }
    });
    this.list = [...byId.values()];
    this.sync();
    this._draw();
  }

  /** Ut av gåmodus: dørene igjen, motoren av og lyset som før. */
  stop() {
    for (const L of this.list) Object.assign(L, { phase: 'idle', open: 0, target: null, call: null, riding: false });
    if (this.dip) this._dip(false);
    liftMotor(this.walk.audio, 0);
    this._draw();
  }

  _inCar(L) {
    const w = this.walk.walker;
    return this.s.current === L.at && cellIn(L.car, w.x, w.z);
  }

  /** Ved dørene ute, vendt mot dem. */
  _atDoors(L) {
    const w = this.walk.walker;
    if (!L.stops.includes(this.s.current) || this._inCar(L)) return false;
    const [mx, mz] = [(L.landing[0][0] + L.landing[1][0]) / 2 + 0.5, (L.landing[0][1] + L.landing[1][1]) / 2 + 0.5];
    const [dx, dz] = STAIR_DIRS[L.dir];
    return Math.hypot(w.x - mx, w.z - mz) < REACH && -Math.sin(w.yaw) * -dx + -Math.cos(w.yaw) * -dz > 0.3;
  }

  _next(L) {
    const i = L.stops.indexOf(L.at);
    return L.stops[(i + 1) % L.stops.length];
  }

  _sound(kind) {
    if (this.walk.sound) liftSound(this.walk.audio, kind);
  }

  /** E: kall heisen her, eller kjør til neste etasje inne. Returnerer true når E ble brukt. */
  use() {
    for (const L of this.list) {
      if (this._inCar(L) && L.phase !== 'moving') return this._go(L, this._next(L)), true;
      if (this._atDoors(L)) return this._go(L, this.s.current, true), true;
    }
    return false;
  }

  /** Tallet for etasje k (0 = nederst) inne i en heis. Returnerer true når det ble brukt. */
  choose(k) {
    const L = this.list.find((l) => this._inCar(l) && l.phase !== 'moving');
    if (!L || !L.stops.includes(k)) return !!L;
    this._go(L, k);
    return true;
  }

  _go(L, k, call = false) {
    this._sound('click');
    if (call) L.call = k;
    if (k === L.at && L.phase !== 'moving') {
      if (L.phase === 'open') L.t = HOLD;
      else if (L.phase !== 'opening') L.phase = 'opening';
      L.call = null;
      return;
    }
    L.target = k;
    if (L.phase === 'idle') this._move(L);
    else if (L.phase !== 'moving' && L.phase !== 'closing') { L.phase = 'closing'; this._sound('slide'); }
  }

  _move(L) {
    L.riding = this._inCar(L);
    L.from = L.at;
    L.T = L.t = TRAVEL[0] + TRAVEL[1] * Math.abs(L.stops.indexOf(L.target) - L.stops.indexOf(L.at));
    L.phase = 'moving';
    if (L.riding) this._sound('creak');
  }

  _arrive(L) {
    if (L.riding) {
      const w = this.walk.walker;
      const dy = w.floorY - L.floors[L.from];
      if (this.dip) this._dip(false); // før byttet: det er denne etasjen som er dempet
      this.s.enter(L.target);
      w.floorY = L.floors[L.target] + Math.max(0, dy);
      liftMotor(this.walk.audio, 0);
    }
    L.at = L.target;
    if (L.riding || L.at === this.s.current) { this._sound('ding'); this._sound('slide'); }
    Object.assign(L, { target: null, call: null, riding: false, phase: 'opening' });
  }

  /** Lyset blafrer under turen: etasjen man står i dempes et øyeblikk. */
  _dip(on) {
    this.dip = on;
    this.s.all[this.s.current]?.setPower(this.walk.power * (on ? 0.3 : 1));
  }

  /** Hver ramme i gåmodus. */
  update(dt, camera) {
    const w = this.walk.walker;
    for (const L of this.list) {
      if (L.phase === 'opening') {
        L.open = Math.min(1, L.open + dt / OPEN_TIME);
        if (L.open >= 1) [L.phase, L.t] = ['open', HOLD];
      } else if (L.phase === 'open') {
        if (this.s.current === L.at && nearCells(L.door, w.x, w.z, 0.4)) L.t = Math.max(L.t, 1.2);
        if ((L.t -= dt) <= 0) { L.phase = 'closing'; if (this.s.current === L.at) this._sound('slide'); }
      } else if (L.phase === 'closing') {
        if (this.s.current === L.at && nearCells(L.door, w.x, w.z, 0.38)) L.phase = 'opening'; // noen står i døren
        else if ((L.open -= dt / OPEN_TIME) <= 0) {
          L.open = 0;
          if (L.target !== null && L.target !== L.at) this._move(L);
          else L.phase = 'idle';
        }
      } else if (L.phase === 'moving') {
        L.t -= dt;
        if (L.riding) this._ride(L, dt, camera);
        if (L.t <= 0) this._arrive(L);
      }
    }
    this.sync();
    this._draw();
  }

  _ride(L, dt, camera) {
    const u = 1 - L.t / L.T; // 0 → 1
    const speed = Math.min(1, u * 4, (1 - u) * 4);
    if (this.walk.sound) liftMotor(this.walk.audio, speed);
    if (Math.random() < dt * 0.9) this._sound('creak');
    if (this.dip ? Math.random() < dt * 8 : Math.random() < dt * 1.2) this._dip(!this.dip);
    const jolt = u < 0.08 || u > 0.92 ? 0.012 : 0.003;
    camera.position.y += (Math.random() - 0.5) * jolt * 2;
  }

  /** Døråpningen er vegg i etasjen man går i, unntatt når dørene der står åpne (også rett etter walk.setWorld). */
  sync() {
    const level = this.walk.level;
    if (!level) return;
    for (const L of this.list) {
      if (!L.stops.includes(this.s.current)) continue;
      const open = L.at === this.s.current && L.open > 0.8;
      for (const [x, z] of L.door) level.tiles[z * level.w + x] = open ? TILE.FLOOR : TILE.WALL;
    }
  }

  /** Dørene og lampene i hver etasje: etasjelampene viser hvor vognen er (også underveis). */
  _draw() {
    for (const L of this.list) {
      const a = L.stops.indexOf(L.phase === 'moving' ? L.from : L.at);
      const b = L.phase === 'moving' ? L.stops.indexOf(L.target) : a;
      const at = L.stops[Math.round(a + (b - a) * (L.phase === 'moving' ? 1 - L.t / L.T : 0))];
      for (const k of L.stops) {
        const lifts = this.s.all[k]?.lifts;
        if (!lifts) continue;
        lifts.set(L.id, k === L.at && L.phase !== 'moving' ? L.open : 0);
        lifts.show(L.id, { at, call: L.call === k, target: L.target });
      }
    }
  }

  /** Teksten nederst, eller null. */
  prompt() {
    const verb = this.walk.session.touch ? 'Tap Use to' : 'E –';
    for (const L of this.list) {
      if (this._inCar(L) || (L.riding && L.phase === 'moving')) {
        if (L.phase === 'moving') return `Going ${L.floors[L.target] !== undefined && L.stops.indexOf(L.target) > L.stops.indexOf(L.from) ? 'up' : 'down'} to floor ${L.target + 1}…`;
        const keys = this.walk.session.touch ? '' : ` · or press ${L.stops.map((k) => k + 1).join(' / ')}`;
        return `${verb} go to floor ${this._next(L) + 1}${keys}`;
      }
      if (!this._atDoors(L)) continue;
      if (L.call === this.s.current) return 'The elevator is on its way…';
      if (L.at === this.s.current && (L.phase === 'open' || L.phase === 'opening')) return null;
      return `${verb} call the elevator`;
    }
    return null;
  }
}
