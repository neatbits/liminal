// Klatring på stiger mellom etasjer (core/ladders.js) i gåmodus. E ved foten av en stige eller ved
// hullet ovenfra: man står på stigen og vender mot den, på siden mot utgangen (stigen står mot motsatt
// kant), W klatrer opp, S ned. Øverst går man av bakover, ut på kanten man kom fra, nederst av
// stigen. Etasjebyttet går gjennom view3d/storeys.js (enter), så høyden regnes om som i trapperommene. Musen ser seg rundt som ellers.
const SPEED = 1.5; // m/s
const REACH = 1.0; // så nær stigen (foten) man må stå for å ta tak
const STAND = 0.06; // man står så langt fra midten av ruten, mot utgangen (bort fra stigen)
const OFF_TOP = 0.85; // øverst: så langt mot utgangen fra midten av hullet man går av
const ON_TOP = 0.1; // ovenfra: man begynner så langt under kanten (ellers er man «øverst» med en gang)

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export class Climb {
  /** @param storeys view3d/storeys.js (etasjene som gås i, og enter(k)) */
  constructor(storeys) {
    this.s = storeys;
    this.on = null; // stigen man er på: { k, x, z, dir, gap }
  }

  get active() {
    return this.on !== null;
  }

  get walk() {
    return this.s.v.walk;
  }

  stop() {
    this.on = null;
  }

  /** Stigen man kan ta tak i her: { ladder, down } – foten i denne etasjen, eller hullet ovenfra. */
  near() {
    const w = this.walk.walker;
    const level = this.s.levels[this.s.current];
    const facing = [-Math.sin(w.yaw), -Math.cos(w.yaw)];
    for (const l of level?.ladders ?? []) {
      const [px, pz] = [l.x + 0.5, l.z + 0.5];
      if (Math.hypot(w.x - px, w.z - pz) < REACH && -(facing[0] * l.dir[0] + facing[1] * l.dir[1]) > 0.2) return { ladder: l, down: false }; // vendt mot stigen
    }
    for (const l of level?.holes ?? []) {
      // Ved hullet, vendt mot det, fra alle sider (bak stigen også: da flyttes man rundt til klatresiden).
      const [tx, tz] = [l.x + 0.5 - w.x, l.z + 0.5 - w.z];
      const d = Math.hypot(tx, tz) || 1;
      if (d < REACH + 0.25 && (facing[0] * tx + facing[1] * tz) / d > 0.2) return { ladder: l, down: true };
    }
    return null;
  }

  /** Teksten nederst, eller null. */
  prompt() {
    if (this.on) return 'W / S – climb';
    const n = this.near();
    return n && `${this.walk.session.touch ? 'Tap Use to' : 'E –'} climb ${n.down ? 'down' : 'up'}`;
  }

  /** E: ta tak i stigen her (returnerer true), ellers false (da er E for dører). */
  use() {
    if (this.on) return true;
    const n = this.near();
    if (!n) return false;
    const { ladder } = n;
    if (n.down) this.s.enter(ladder.k); // ned i etasjen med stigen: gåeren står da i høyden gap
    const w = this.walk.walker;
    [w.x, w.z] = [ladder.x + 0.5 + ladder.dir[0] * STAND, ladder.z + 0.5 + ladder.dir[1] * STAND];
    w.yaw = Math.atan2(ladder.dir[0], ladder.dir[1]); // mot stigen (bort fra utgangen)
    w.vx = w.vz = w.vy = 0;
    w.stand();
    w.floorY = n.down ? ladder.gap - ON_TOP : Math.max(0, w.floorY);
    this.on = ladder;
    return true;
  }

  /** Ett steg på stigen; kameraet som gåerens. */
  update(dt, input, camera) {
    const w = this.walk.walker;
    const [lx, ly] = input.consumeLook();
    const sens = 0.0022 * w.sensitivity;
    w.yaw -= lx * sens;
    w.pitch = clamp(w.pitch - ly * sens, -1.45, 1.45);
    const l = this.on;
    w.floorY += clamp(input.forward, -1, 1) * SPEED * dt;
    if (w.floorY >= l.gap && input.forward > 0) { // av øverst bare når man klatrer opp
      // Øverst: opp i etasjen over og bakover ut på kanten (man ser fortsatt mot hullet).
      this.on = null;
      w.floorY = l.gap;
      this.s.enter(l.k + 1);
      [w.x, w.z] = [l.x + 0.5 + l.dir[0] * OFF_TOP, l.z + 0.5 + l.dir[1] * OFF_TOP];
      w.floorY = 0;
    } else if (w.floorY >= l.gap) {
      w.floorY = l.gap;
    } else if (w.floorY <= 0) {
      w.floorY = 0;
      if (input.forward < 0) this.on = null; // nederst: av stigen
    }
    w.applyToCamera(camera);
  }
}
