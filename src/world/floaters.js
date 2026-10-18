// Flytende gjenstander (badeender) i gåmodus: de duver på vannet, dyttes når man vasser eller
// svømmer inn i dem, glir videre med vannmotstand, snurrer litt og spretter av bassengkanten.
// Bare i gåmodus – rommet endres ikke. Ren logikk (ingen three.js).
import { TILE, getTile, WATER_SURFACE } from '../core/level.js';
import { OBJECTS, objectPose } from '../core/objects.js';

const RADIUS = 0.14; // en ands «radius» sett ovenfra
const DRAG = 0.6; // vannmotstand (1/s)
const SPIN_DRAG = 1.2;
const PUSH = 1.2; // hvor mye av spillerens fart anden får
const BOUNCE = 0.4;
const FLOAT = 0.06; // samme som FLOAT_DEPTH i core/objects.js

export class Floaters {
  constructor(level) {
    this.level = level;
    this.time = 0;
    this.bodies = [];
    (level.objects ?? []).forEach((o, i) => {
      if (!OBJECTS[o.id]?.floats || getTile(level, o.x, o.z) !== TILE.WATER) return;
      const p = objectPose(level, o);
      this.bodies.push({ i, x: p.x, z: p.z, vx: 0, vz: 0, yaw: (-p.rot * Math.PI) / 2, spin: 0, phase: i * 1.7 });
    });
  }

  _water(x, z) {
    return getTile(this.level, Math.floor(x), Math.floor(z)) === TILE.WATER;
  }

  /** Dytter alt innenfor `radius` fra (x, z) utover, f.eks. når man plasker ned fra sklien. */
  splash(x, z, strength = 1, radius = 1.5) {
    for (const b of this.bodies) {
      const dx = b.x - x;
      const dz = b.z - z;
      const d = Math.hypot(dx, dz);
      if (d > radius || d < 1e-6) continue;
      const f = strength * (1 - d / radius);
      b.vx += (dx / d) * f;
      b.vz += (dz / d) * f;
      b.spin += (Math.random() - 0.5) * 4 * f;
    }
  }

  /**
   * Ett steg. player = { x, z, vx, vz, r } (spilleren som en sirkel), eller null.
   */
  step(dt, player = null) {
    this.time += dt;
    for (const b of this.bodies) {
      if (player) this._push(b, player);
      // Langs hver akse for seg: spretter av kanten når neste posisjon ikke er vann.
      const nx = b.x + b.vx * dt;
      if (this._water(nx + Math.sign(b.vx) * RADIUS, b.z)) b.x = nx;
      else b.vx = -b.vx * BOUNCE;
      const nz = b.z + b.vz * dt;
      if (this._water(b.x, nz + Math.sign(b.vz) * RADIUS)) b.z = nz;
      else b.vz = -b.vz * BOUNCE;
      const k = Math.exp(-dt * DRAG);
      b.vx *= k;
      b.vz *= k;
      b.yaw += b.spin * dt;
      b.spin *= Math.exp(-dt * SPIN_DRAG);
    }
    this._separate();
  }

  _push(b, p) {
    const dx = b.x - p.x;
    const dz = b.z - p.z;
    const d = Math.hypot(dx, dz);
    const min = p.r + RADIUS;
    if (d >= min) return;
    const [nx, nz] = d > 1e-6 ? [dx / d, dz / d] : [1, 0];
    // Skyv anden ut av spilleren, og gi den farten spilleren har inn mot den.
    if (this._water(p.x + nx * min, p.z + nz * min)) {
      b.x = p.x + nx * min;
      b.z = p.z + nz * min;
    }
    const vn = (p.vx - b.vx) * nx + (p.vz - b.vz) * nz;
    if (vn > 0) {
      b.vx += nx * vn * PUSH;
      b.vz += nz * vn * PUSH;
      b.spin += (nx * p.vz - nz * p.vx) * 2;
    }
  }

  /** Ender som støter borti hverandre, skyves fra hverandre og bytter fart langs støtet. */
  _separate() {
    const list = this.bodies;
    for (let a = 0; a < list.length; a++) {
      for (let c = a + 1; c < list.length; c++) {
        const A = list[a];
        const B = list[c];
        const dx = B.x - A.x;
        const dz = B.z - A.z;
        const d = Math.hypot(dx, dz);
        if (d >= 2 * RADIUS || d < 1e-6) continue;
        const nx = dx / d;
        const nz = dz / d;
        const overlap = (2 * RADIUS - d) / 2;
        A.x -= nx * overlap;
        A.z -= nz * overlap;
        B.x += nx * overlap;
        B.z += nz * overlap;
        const vn = (A.vx - B.vx) * nx + (A.vz - B.vz) * nz;
        if (vn > 0) {
          A.vx -= nx * vn;
          A.vz -= nz * vn;
          B.vx += nx * vn;
          B.vz += nz * vn;
        }
      }
    }
  }

  /** Stillingen til hver and: { i, x, y, z, yaw, tilt } – duving og helling etter farten. */
  poses() {
    return this.bodies.map((b) => {
      const speed = Math.hypot(b.vx, b.vz);
      return {
        i: b.i,
        x: b.x,
        y: WATER_SURFACE - FLOAT + Math.sin(this.time * 1.7 + b.phase) * 0.012,
        z: b.z,
        yaw: b.yaw,
        tilt: Math.min(0.25, speed * 0.12) + Math.sin(this.time * 1.3 + b.phase) * 0.04,
      };
    });
  }
}
