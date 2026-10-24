// Fysikk i gåmodus (cannon-es) for de myke lekeklossene (soft) og lette gjenstander som
// plaststoler (loose): de står og ligger der de er stablet/satt, dyttes når man går inn i dem,
// velter, ramler ned og spretter litt. Spilleren er en kinematisk «kropp» (to kuler: hofte og
// skulder), så man kan dytte til både lave og høye ting. Vegger og søyler rundt er faste bokser;
// gulvet følger gulvhøydene (bassengbunn, opphøyde gulv). Ingen three.js.
import * as CANNON from 'cannon-es';
import { TILE } from '../core/level.js';
import { OBJECTS, poser } from '../core/objects.js';
import { floorAt, ceilingAt, stairSpan, pillarBottom } from '../core/heights.js';
import { pillarInfo } from '../core/pillars.js';
import { submergedPillar } from '../core/pillar-water.js';
import { getTheme } from '../core/themes.js';
import { pitBallSupport } from '../core/play-balls.js';
import { ballMaterial, addBallSupport, BALL_GROUP } from './ball-physics.js';
import { ObjectSplashes } from './object-splashes.js';
import { addSoftShape } from './soft-shapes.js';
import { halfWalls } from '../core/half-walls.js';

const DENSITY = 40; // kg/m³ – skumgummi
const PLAYER_R = 0.3;
const MARGIN = 8;
const GIVE = 0.14; // vegger med så mange ruter rundt klossene blir med i fysikken

export class SoftPhysics {
  constructor(level) {
    this.level = level;
    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
    world.allowSleep = true;
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.defaultContactMaterial.friction = 0.6;
    world.defaultContactMaterial.restitution = 0.08;
    this.world = world;
    this.blocks = [];
    const poseOf = poser(level);
    const roundMaterial = ballMaterial(world);
    let hasBalls = false;
    let x0 = Infinity;
    let z0 = Infinity;
    let x1 = -Infinity;
    let z1 = -Infinity;
    (level.objects ?? []).forEach((o, i) => {
      const def = OBJECTS[o.id];
      if (!def?.soft && !def?.loose) return;
      const p = poseOf(o);
      const radius = def.loose?.radius;
      hasBalls ||= !!radius;
      const [w, h, d] = def.size;
      // Kroppens origo er tyngdepunktet: midt i klossen, eller loose.com over gulvet.
      const com = def.loose ? def.loose.com : h / 2;
      const body = new CANNON.Body({
        mass: def.loose ? def.loose.mass : Math.max(2, w * h * d * DENSITY),
        position: new CANNON.Vec3(p.x, p.y + com, p.z),
        linearDamping: radius ? 0.18 : 0.25,
        angularDamping: radius ? 0.12 : 0.35,
        sleepSpeedLimit: 0.15,
        ...(radius ? { material: roundMaterial, collisionFilterGroup: BALL_GROUP } : {}),
      });
      if (radius) body.addShape(new CANNON.Sphere(radius));
      else if (def.loose) {
        for (const [x, y, z, hx, hy, hz] of def.loose.parts) body.addShape(new CANNON.Box(new CANNON.Vec3(hx, hy, hz)), new CANNON.Vec3(x, y - com, z));
      } else addSoftShape(body, def);
      body.quaternion.setFromEuler(0, (-p.rot * Math.PI) / 2, 0);
      body.addEventListener('collide', (e) => {
        const v = Math.abs(e.contact.getImpactVelocityAlongNormal());
        if (v > 1.2) this.onImpact?.(Math.min(1, v / 5) * (radius ? 0.12 : 1), body.position.x, body.position.z,
          def.soft ? 'rubber' : radius ? 'ball' : 'plastic');
      });
      world.addBody(body);
      // Lette ting er åpne (bein, sete): man kommer nærmere enn ytterkanten før man stoppes.
      this.blocks.push({ i, body, com, radius, give: def.loose ? GIVE : 0, start: body.position.clone() });
      x0 = Math.min(x0, o.x);
      z0 = Math.min(z0, o.z);
      x1 = Math.max(x1, o.x);
      z1 = Math.max(z1, o.z);
    });
    if (hasBalls) { x0 = 0; z0 = 0; x1 = level.w - 1; z1 = level.h - 1; }
    if (this.blocks.length) {
      for (const { box: [ax, az, bx, bz], bottom, top } of halfWalls(level)) {
        this.world.addBody(new CANNON.Body({ type: CANNON.Body.STATIC,
          shape: new CANNON.Box(new CANNON.Vec3((bx - ax) / 2, (top - bottom) / 2, (bz - az) / 2)),
          position: new CANNON.Vec3((ax + bx) / 2, (bottom + top) / 2, (az + bz) / 2) }));
      }
      this._walls(x0 - MARGIN, z0 - MARGIN, x1 + MARGIN, z1 + MARGIN);
      this._ground(x0 - MARGIN, z0 - MARGIN, x1 + MARGIN, z1 + MARGIN);
      if (hasBalls) addBallSupport(world, level, poseOf);
    }

    // Spilleren: kinematisk, flyttes dit gåeren er og får gåerens fart (så støtet blir riktig).
    // Den må aldri sove: en sovende kropp kolliderer ikke med sovende klosser, så etter et
    // sekund i ro kunne man ellers ikke lenger dytte til noe.
    this.player = new CANNON.Body({ type: CANNON.Body.KINEMATIC, mass: 0, allowSleep: false });
    this.player.addShape(new CANNON.Sphere(PLAYER_R), new CANNON.Vec3(0, 0.35, 0));
    this.player.addShape(new CANNON.Sphere(PLAYER_R), new CANNON.Vec3(0, 1.15, 0));
    this.player.position.set(-100, -100, -100);
    world.addBody(this.player);
    for (const body of world.bodies) body.material ??= world.defaultMaterial;
    const splashes = new ObjectSplashes(level, this.blocks);
    world.addEventListener('postStep', () => splashes.step(world.dt, this.onSplash));
  }

  _walls(x0, z0, x1, z1) {
    const { level } = this;
    const endX = Math.min(level.w - 1, x1);
    for (let z = Math.max(0, z0); z <= Math.min(level.h - 1, z1); z++) {
      for (let x = Math.max(0, x0); x <= endX; ) {
        const t = level.tiles[z * level.w + x];
        if (t !== TILE.WALL && t !== TILE.PILLAR) { x++; continue; }
        let end = x;
        if (t === TILE.WALL) while (end < endX && level.tiles[z * level.w + end + 1] === TILE.WALL) end++;
        const p = pillarInfo(level, x, z), bottom = p ? pillarBottom(level, x, z) : 0, height = p ? ceilingAt(level, x, z) - bottom : 4;
        const shape = p ? (p.round ? new CANNON.Cylinder(p.radius, p.radius, height, 32) : new CANNON.Box(new CANNON.Vec3(p.radius, height / 2, p.radius)))
          : new CANNON.Box(new CANNON.Vec3((end - x + 1) / 2, 2, .5));
        const body = new CANNON.Body({ type: CANNON.Body.STATIC, shape });
        body.position.set((x + end + 1) / 2, bottom+height/2, z + 0.5);
        this.world.addBody(body);
        x = end + 1;
      }
    }
  }

  /**
   * Gulvet: et plan i laveste høyde, og bokser opp til gulvet der det ligger høyere (rad for rad,
   * like høyder slått sammen). Bassenger har bunnen sin – i ballbinger ligger ballene øverst.
   */
  _ground(x0, z0, x1, z1) {
    const { level } = this;
    const balls = getTheme(level.theme).pit === 'balls';
    const height = (x, z) => {
      const t = level.tiles[z * level.w + x];
      if (t === TILE.WALL || t === TILE.PILLAR && !submergedPillar(level, x, z)) return null;
      if (t === TILE.WATER && balls) return -0.12;
      if (t === TILE.STAIRS) {
        const { bottom, top } = stairSpan(level, x, z);
        return (bottom + top) / 2;
      }
      return floorAt(level, x, z);
    };
    const [zs, ze, xs, xe] = [Math.max(0, z0), Math.min(level.h - 1, z1), Math.max(0, x0), Math.min(level.w - 1, x1)];
    let low = 0;
    for (let z = zs; z <= ze; z++) for (let x = xs; x <= xe; x++) low = Math.min(low, height(x, z) ?? 0);
    const plane = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() });
    plane.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    plane.position.y = low;
    this.world.addBody(plane);
    for (let z = zs; z <= ze; z++) {
      for (let x = xs; x <= xe; ) {
        const y = height(x, z);
        let end = x + 1;
        while (end <= xe && height(end, z) === y) end++;
        if (y !== null && y > low + 1e-3) {
          const box = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Box(new CANNON.Vec3((end - x) / 2, (y - low) / 2, 0.5)) });
          box.position.set((x + end) / 2, (y + low) / 2, z + 0.5);
          this.world.addBody(box);
        }
        x = end;
      }
    }
  }

  /** Ett steg. player = { x, y, z, vx, vz } (gåerens føtter og fart), eller null. */
  step(dt, player = null) {
    if (!this.blocks.length || dt <= 0) return;
    if (player) {
      this.player.position.set(player.x, player.y, player.z);
      this.player.velocity.set(player.vx, 0, player.vz);
    } else {
      this.player.position.set(-100, -100, -100);
    }
    this.world.step(1 / 60, Math.min(dt, 0.1), 4);
  }

  /** Har noe blitt flyttet (mer enn noen centimeter) fra der det stod? */
  moved() {
    return this.blocks.some(({ body, start }) => body.position.distanceTo(start) > 0.15);
  }

  /**
   * Stillingen til hver ting: { i, x, y, z, q: [x, y, z, w], low } – (x, y, z) er bunnen midt under
   * (slik gjenstanden står), low det laveste punktet (for skyggen).
   */
  poses() {
    return this.blocks.map(({ i, body, com, radius }) => {
      const q = body.quaternion;
      const down = q.vmult(new CANNON.Vec3(0, -com, 0));
      body.updateAABB();
      const x = body.position.x + down.x, z = body.position.z + down.z;
      const ground = radius ? (getTheme(this.level.theme).pit === 'balls' &&
        this.level.tiles[Math.floor(z) * this.level.w + Math.floor(x)] === TILE.WATER ? pitBallSupport(x, z) : floorAt(this.level, Math.floor(x), Math.floor(z))) : body.aabb.lowerBound.y;
      return { i, x, y: body.position.y + down.y, z, q: [q.x, q.y, q.z, q.w], low: ground };
    });
  }

  /**
   * Skyver spilleren (sirkel med radius r, føttene i høyden y) ut av klosser som står i veien –
   * lave klosser (under 0,45 m) kan man gå over. Returnerer [x, z].
   */
  pushOut(x, z, r, y) {
    for (const { body, give } of this.blocks) {
      body.updateAABB();
      const rr = r - give;
      const { lowerBound: lo, upperBound: hi } = body.aabb;
      if (hi.y < y + 0.45 || lo.y > y + 1.7) continue;
      const qx = Math.max(lo.x, Math.min(x, hi.x));
      const qz = Math.max(lo.z, Math.min(z, hi.z));
      const dx = x - qx;
      const dz = z - qz;
      const d = Math.hypot(dx, dz);
      if (d >= rr) continue;
      if (d < 1e-6) {
        // Midt inni klossen: ut langs korteste vei.
        const out = [[lo.x - rr - x, 0], [hi.x + rr - x, 0], [0, lo.z - rr - z], [0, hi.z + rr - z]].sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1]))[0];
        x += out[0];
        z += out[1];
        continue;
      }
      x = qx + (dx / d) * rr;
      z = qz + (dz / d) * rr;
    }
    return [x, z];
  }
}
