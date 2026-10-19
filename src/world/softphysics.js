// Fysikk for de myke lekeklossene i gåmodus (cannon-es): klossene står og ligger der de er
// stablet, dyttes når man går inn i dem, velter, ramler ned og spretter litt. Spilleren er en
// kinematisk «kropp» (to kuler: hofte og skulder), så man kan dytte til både lave og høye klosser.
// Vegger og søyler rundt klossene er faste bokser; gulvet er et plan. Ingen three.js.
import * as CANNON from 'cannon-es';
import { TILE } from '../core/level.js';
import { OBJECTS, objectPose } from '../core/objects.js';

const DENSITY = 40; // kg/m³ – skumgummi
const PLAYER_R = 0.3;
const MARGIN = 8; // vegger med så mange ruter rundt klossene blir med i fysikken

export class SoftPhysics {
  constructor(level) {
    this.level = level;
    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
    world.allowSleep = true;
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.defaultContactMaterial.friction = 0.6;
    world.defaultContactMaterial.restitution = 0.08;
    this.world = world;
    const ground = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() });
    ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(ground);

    this.blocks = [];
    let x0 = Infinity;
    let z0 = Infinity;
    let x1 = -Infinity;
    let z1 = -Infinity;
    (level.objects ?? []).forEach((o, i) => {
      const def = OBJECTS[o.id];
      if (!def?.soft) return;
      const p = objectPose(level, o);
      const [w, h, d] = def.size;
      const body = new CANNON.Body({
        mass: Math.max(2, w * h * d * DENSITY),
        shape: new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)),
        position: new CANNON.Vec3(p.x, p.y + h / 2, p.z),
        linearDamping: 0.25,
        angularDamping: 0.35,
        sleepSpeedLimit: 0.15,
      });
      body.quaternion.setFromEuler(0, (-p.rot * Math.PI) / 2, 0);
      body.addEventListener('collide', (e) => {
        const v = Math.abs(e.contact.getImpactVelocityAlongNormal());
        if (v > 1.2) this.onImpact?.(Math.min(1, v / 5), body.position.x, body.position.z);
      });
      world.addBody(body);
      this.blocks.push({ i, body, h });
      x0 = Math.min(x0, o.x);
      z0 = Math.min(z0, o.z);
      x1 = Math.max(x1, o.x);
      z1 = Math.max(z1, o.z);
    });
    if (this.blocks.length) this._walls(x0 - MARGIN, z0 - MARGIN, x1 + MARGIN, z1 + MARGIN);

    // Spilleren: kinematisk, flyttes dit gåeren er og får gåerens fart (så støtet blir riktig).
    this.player = new CANNON.Body({ type: CANNON.Body.KINEMATIC, mass: 0 });
    this.player.addShape(new CANNON.Sphere(PLAYER_R), new CANNON.Vec3(0, 0.35, 0));
    this.player.addShape(new CANNON.Sphere(PLAYER_R), new CANNON.Vec3(0, 1.15, 0));
    this.player.position.set(-100, -100, -100);
    world.addBody(this.player);
  }

  _walls(x0, z0, x1, z1) {
    const { level } = this;
    const wall = new CANNON.Box(new CANNON.Vec3(0.5, 2, 0.5));
    const pillar = new CANNON.Box(new CANNON.Vec3(0.25, 2, 0.25));
    for (let z = Math.max(0, z0); z <= Math.min(level.h - 1, z1); z++) {
      for (let x = Math.max(0, x0); x <= Math.min(level.w - 1, x1); x++) {
        const t = level.tiles[z * level.w + x];
        if (t !== TILE.WALL && t !== TILE.PILLAR) continue;
        const body = new CANNON.Body({ type: CANNON.Body.STATIC, shape: t === TILE.WALL ? wall : pillar });
        body.position.set(x + 0.5, 2, z + 0.5);
        this.world.addBody(body);
      }
    }
  }

  /** Ett steg. player = { x, y, z, vx, vz } (gåerens føtter og fart), eller null. */
  step(dt, player = null) {
    if (!this.blocks.length) return;
    if (player) {
      this.player.position.set(player.x, player.y, player.z);
      this.player.velocity.set(player.vx, 0, player.vz);
    } else {
      this.player.position.set(-100, -100, -100);
    }
    this.world.step(1 / 60, Math.min(dt, 0.1), 4);
  }

  /** Stillingen til hver kloss: { i, x, y, z, q: [x, y, z, w] } – (x, y, z) er bunnen midt under. */
  poses() {
    return this.blocks.map(({ i, body, h }) => {
      const q = body.quaternion;
      const down = q.vmult(new CANNON.Vec3(0, -h / 2, 0));
      return { i, x: body.position.x + down.x, y: body.position.y + down.y, z: body.position.z + down.z, q: [q.x, q.y, q.z, q.w] };
    });
  }

  /**
   * Skyver spilleren (sirkel med radius r, føttene i høyden y) ut av klosser som står i veien –
   * lave klosser (under 0,45 m) kan man gå over. Returnerer [x, z].
   */
  pushOut(x, z, r, y) {
    for (const { body } of this.blocks) {
      body.updateAABB();
      const { lowerBound: lo, upperBound: hi } = body.aabb;
      if (hi.y < y + 0.45 || lo.y > y + 1.7) continue;
      const qx = Math.max(lo.x, Math.min(x, hi.x));
      const qz = Math.max(lo.z, Math.min(z, hi.z));
      const dx = x - qx;
      const dz = z - qz;
      const d = Math.hypot(dx, dz);
      if (d >= r) continue;
      if (d < 1e-6) {
        // Midt inni klossen: ut langs korteste vei.
        const out = [[lo.x - r - x, 0], [hi.x + r - x, 0], [0, lo.z - r - z], [0, hi.z + r - z]].sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1]))[0];
        x += out[0];
        z += out[1];
        continue;
      }
      x = qx + (dx / d) * r;
      z = qz + (dz / d) * r;
    }
    return [x, z];
  }
}
