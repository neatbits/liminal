// Førstepersons gange: bevegelse med treghet, kollisjon, hodebevegelse og fottrinn.
// I dypt vann flyter man i overflaten i stedet for å gå på bunnen.
import { TILE, getTile, WATER_SURFACE } from '../core/level.js';
import { groundAt } from '../core/heights.js';
import { moveCircle, resolveCircle } from '../world/collision.js';

export const EYE = 1.62;
export const SWIM_EYE = 0.3; // øyehøyde over vannflaten når man svømmer
const RADIUS = 0.28;
const WALK = 1.55;
const RUN = 3.1;
const STEP = 0.72; // meter per fottrinn

export function surfaceFor(theme, tile) {
  if (tile === TILE.WATER) return theme.pit === 'balls' ? 'balls' : 'water';
  return theme.sound.step;
}

/** Svømmer man over en bunn i høyde floorY? (Vannet når over haken.) */
export function isSwimming(floorY) {
  return floorY + EYE < WATER_SURFACE + SWIM_EYE;
}

/** Øyehøyden over en bunn: man vasser til vannet blir for dypt, så flyter man. */
export function eyeHeight(floorY) {
  return Math.max(floorY + EYE, WATER_SURFACE + SWIM_EYE);
}

export class Walker {
  constructor() {
    this.x = 0;
    this.z = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.vx = 0;
    this.vz = 0;
    this.floorY = 0;
    this.distance = 0;
    this.stepPhase = 0;
    this.sensitivity = 1;
    this.visited = null;
    this.dip = 0; // hvor dypt hodet er dukket etter et plask (m), avtar raskt
  }

  reset(level, spawn) {
    this.x = spawn.x;
    this.z = spawn.z;
    this.yaw = spawn.a;
    this.pitch = 0;
    this.vx = this.vz = 0;
    this.distance = 0;
    this.stepPhase = 0;
    this.floorY = groundAt(level, this.x, this.z);
    this.visited = new Uint8Array(level.w * level.h);
  }

  /** Lander i vannet etter en sklietur (se Rider.update): fart, retning og et dukk. */
  land(level, { x, z, vx, vz, speed }) {
    [this.x, this.z] = resolveCircle(level, x, z, RADIUS);
    this.vx = vx * 0.5;
    this.vz = vz * 0.5;
    this.yaw = Math.atan2(-vx, -vz);
    this.pitch = 0;
    this.floorY = groundAt(level, this.x, this.z);
    this.dip = Math.min(0.9, 0.3 + speed * 0.08);
  }

  /** Etter at rommet er endret: skyv ut av eventuelle nye vegger. */
  settle(level) {
    [this.x, this.z] = resolveCircle(level, this.x, this.z, RADIUS);
    if (!this.visited || this.visited.length !== level.w * level.h) this.visited = new Uint8Array(level.w * level.h);
  }

  /**
   * @returns {string|null} underlag hvis et fottrinn skjedde denne rammen
   */
  update(dt, input, level, theme) {
    const [lx, ly] = input.consumeLook();
    const sens = 0.0022 * this.sensitivity;
    this.yaw -= lx * sens;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch - ly * sens));
    this.dip *= Math.exp(-dt * 2.5);

    let f = input.forward;
    let s = input.strafe;
    const len = Math.hypot(f, s);
    if (len > 1) {
      f /= len;
      s /= len;
    }
    const tile = getTile(level, Math.floor(this.x), Math.floor(this.z));
    const slow = isSwimming(this.floorY) ? 0.45 : tile === TILE.WATER ? 0.6 : 1;
    const speed = (input.running ? RUN : WALK) * slow;
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    const tx = (-sin * f + cos * s) * speed;
    const tz = (-cos * f - sin * s) * speed;
    const k = Math.min(1, dt * 8);
    this.vx += (tx - this.vx) * k;
    this.vz += (tz - this.vz) * k;

    const px = this.x;
    const pz = this.z;
    [this.x, this.z] = moveCircle(level, this.x, this.z, this.vx * dt, this.vz * dt, RADIUS, true, this.floorY);
    const moved = Math.hypot(this.x - px, this.z - pz);
    this.distance += moved;

    const here = getTile(level, Math.floor(this.x), Math.floor(this.z));
    // Etter dekket man står på; går man utfor kanten, faller man ned i etasjen under.
    this.floorY += (groundAt(level, this.x, this.z, this.floorY) - this.floorY) * Math.min(1, dt * 6);
    if (this.visited) {
      const i = Math.floor(this.z) * level.w + Math.floor(this.x);
      if (i >= 0 && i < this.visited.length) this.visited[i] = 1;
    }

    const before = Math.floor(this.stepPhase);
    this.stepPhase += moved / STEP;
    return Math.floor(this.stepPhase) !== before ? surfaceFor(theme, here) : null;
  }

  applyToCamera(camera) {
    const speed = Math.hypot(this.vx, this.vz);
    const amp = 0.035 * Math.min(1.4, speed / WALK) * (isSwimming(this.floorY) ? 0.5 : 1);
    const phase = this.stepPhase * Math.PI;
    const bob = (Math.abs(Math.sin(phase)) - 0.5) * amp;
    const sway = Math.cos(phase) * amp * 0.4;
    camera.position.set(
      this.x + Math.cos(this.yaw) * sway,
      eyeHeight(this.floorY) + bob - this.dip,
      this.z - Math.sin(this.yaw) * sway,
    );
    camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  /** Andel av gangbare ruter man har vært innom (0..1). */
  explored(level) {
    if (!this.visited) return 0;
    let open = 0;
    let seen = 0;
    for (let i = 0; i < level.tiles.length; i++) {
      if (level.tiles[i] === TILE.WALL || level.tiles[i] === TILE.PILLAR) continue;
      open++;
      if (this.visited[i]) seen++;
    }
    return open ? seen / open : 0;
  }
}
