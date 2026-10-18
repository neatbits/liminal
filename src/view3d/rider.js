// Skliing: følger banen fra slidePath med fart fra helningen (tyngdekraft minus friksjon og
// luftmotstand). Kameraet sitter i rennen, ser framover, krenger i svingene og kan se seg
// litt rundt med musen. Ren logikk (kameraet er et hvilket som helst objekt med position/rotation).
import { frameAt } from '../world/slides.js';

const G = 9.81;
const FRICTION = 0.06;
const DRAG = 0.012;
const MIN_SPEED = 0.8;
const EYE = 0.75; // øyehøyde over bunnen av rennen (sittende)

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export class Rider {
  constructor() {
    this.path = null;
    this.s = 0;
    this.v = 0;
    this.lookYaw = 0;
    this.lookPitch = 0;
  }

  get active() {
    return this.path !== null;
  }

  start(path, speed = 0) {
    this.path = path;
    this.s = 0;
    this.v = Math.max(MIN_SPEED, speed);
    this.lookYaw = 0;
    this.lookPitch = 0;
  }

  /** Banepunktet ved buelengden s (lineært mellom punktene). */
  sample(s) {
    const pts = this.path.samples;
    let i = Math.min(pts.length - 2, Math.max(0, Math.floor(s / (pts[1].s - pts[0].s))));
    while (i < pts.length - 2 && pts[i + 1].s < s) i++;
    const [a, b] = [pts[i], pts[i + 1]];
    const f = clamp((s - a.s) / (b.s - a.s || 1), 0, 1);
    const mix = (u, v) => u + (v - u) * f;
    return {
      x: mix(a.x, b.x),
      y: mix(a.y, b.y),
      z: mix(a.z, b.z),
      t: [mix(a.t[0], b.t[0]), mix(a.t[1], b.t[1]), mix(a.t[2], b.t[2])],
      side: [mix(a.side[0], b.side[0]), mix(a.side[1], b.side[1])],
      bank: mix(a.bank, b.bank),
    };
  }

  /**
   * Ett steg. Returnerer null mens man sklir, og ved utløpet { x, z, vx, vz, speed }:
   * hvor man treffer vannet og med hvilken fart (vannrett).
   */
  update(dt, input) {
    const [lx, ly] = input.consumeLook();
    this.lookYaw = clamp(this.lookYaw - lx * 0.0022, -1.3, 1.3);
    this.lookPitch = clamp(this.lookPitch - ly * 0.0022, -0.7, 0.7);
    const p = this.sample(this.s);
    const down = clamp(-p.t[1], -1, 1); // sinus til helningen
    const a = G * (down - FRICTION * Math.sqrt(1 - down * down)) - DRAG * this.v * this.v;
    this.v = Math.max(MIN_SPEED, this.v + a * dt);
    this.s += this.v * dt;
    if (this.s < this.path.length) return null;
    const end = this.path.samples[this.path.samples.length - 1];
    const lh = Math.hypot(end.t[0], end.t[2]) || 1;
    const [dx, dz] = [end.t[0] / lh, end.t[2] / lh];
    this.path = null;
    return { x: end.x + dx * 0.4, z: end.z + dz * 0.4, vx: dx * this.v, vz: dz * this.v, speed: this.v };
  }

  applyToCamera(camera) {
    const p = this.sample(this.s);
    const f = frameAt(p);
    camera.position.set(p.x + f.up[0] * EYE, p.y + f.up[1] * EYE, p.z + f.up[2] * EYE);
    const yaw = Math.atan2(-p.t[0], -p.t[2]);
    const pitch = Math.asin(clamp(p.t[1], -1, 1)) * 0.7;
    camera.rotation.set(pitch + this.lookPitch, yaw + this.lookYaw, -p.bank, 'YXZ');
  }
}
