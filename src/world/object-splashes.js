// Vannkontakt for fysikkgjenstander. Prøver selve kollisjonsdelene, ikke stolens tomme
// ytterboks. Lokale prøvepunkter lages én gang; ingen three.js eller egne fysikksteg.
import { Body, Vec3 } from 'cannon-es';
import { getTile, TILE, WATER_SURFACE } from '../core/level.js';
import { getTheme } from '../core/themes.js';

function samples(body) {
  const points = [];
  body.shapes.forEach((shape, i) => {
    const add = (x, y, z) => {
      const p = new Vec3(x, y, z);
      body.shapeOrientations[i].vmult(p, p);
      p.vadd(body.shapeOffsets[i], p);
      points.push(p);
    };
    if (shape.radius) { add(0, -shape.radius, 0); return; }
    if (!shape.halfExtents) return;
    const { x, y, z } = shape.halfExtents;
    const counts = [x, y, z].map((h) => Math.max(1, Math.ceil(2 * h / 0.25)));
    for (let ix = 0; ix <= counts[0]; ix++) for (let iy = 0; iy <= counts[1]; iy++) for (let iz = 0; iz <= counts[2]; iz++) {
      if (ix && ix < counts[0] && iy && iy < counts[1] && iz && iz < counts[2]) continue;
      add(x * (2 * ix / counts[0] - 1), y * (2 * iy / counts[1] - 1), z * (2 * iz / counts[2] - 1));
    }
  });
  return points;
}

export class ObjectSplashes {
  constructor(level, blocks) {
    this.level = level;
    this.point = new Vec3();
    this.velocity = new Vec3();
    const water = getTheme(level.theme).pit !== 'balls' && level.tiles.includes(TILE.WATER);
    this.bodies = water ? blocks.map(({ body }) => {
      const state = { body, samples: samples(body), wet: false, dry: 0, cooldown: 0 };
      state.wet = !!this.contact(state); // Reset og gjenstander som starter neddykket er stille.
      return state;
    }) : [];
  }

  contact(state) {
    const { body } = state;
    for (const local of state.samples) {
      // Kuler er rotasjonssymmetriske: nederste punkt skal alltid peke nedover.
      if (body.shapes.length === 1 && body.shapes[0].radius) this.point.set(0, -body.shapes[0].radius, 0);
      else body.quaternion.vmult(local, this.point);
      this.point.vadd(body.position, this.point);
      const { x, y, z } = this.point;
      if (y >= WATER_SURFACE - 0.003 || getTile(this.level, Math.floor(x), Math.floor(z)) !== TILE.WATER) continue;
      body.getVelocityAtWorldPoint(this.point, this.velocity);
      const speed = Math.max(0, -this.velocity.y) + Math.hypot(this.velocity.x, this.velocity.z) * 0.15;
      const strength = Math.min(5, Math.max(0.2, (0.35 + speed * 0.65) * Math.sqrt(body.mass / 2.5)));
      return { x, z, strength };
    }
    return null;
  }

  step(dt, onSplash) {
    for (const state of this.bodies) {
      state.cooldown = Math.max(0, state.cooldown - dt);
      if (state.body.sleepState === Body.SLEEPING) continue;
      const hit = this.contact(state);
      if (!hit) {
        state.dry += dt;
        if (state.dry >= 0.08) state.wet = false;
        continue;
      }
      state.dry = 0;
      if (!state.wet && state.cooldown === 0) {
        state.cooldown = 0.45;
        onSplash?.(hit.x, hit.z, hit.strength);
      }
      state.wet = true;
    }
  }
}
