// Førstepersons gange: bevegelse med treghet, kollisjon, hodebevegelse og fottrinn.
// I dypt vann flyter man i overflaten i stedet for å gå på bunnen. Mellomrom hopper (høyere fra et
// stupebrett), og går man utfor en kant, faller man – ned i vannet med et plask (splash).
import { TILE, getTile, WATER_SURFACE } from '../core/level.js';
import { waterCell } from '../core/pillar-water.js';
import { groundAt, headAt } from '../core/heights.js';
import { escalatorVelocity } from '../core/escalators.js';
import { objectGround } from '../core/objects.js';
import { moveCircle, resolveCircle, STEP_UP } from '../world/collision.js';
import { SHOP_INTERIORS, shopInteriorMap } from '../core/shop-interiors.js';
import { FINISHES } from '../core/finishes.js';

export const EYE = 1.62;
export const SWIM_EYE = 0.3; // øyehøyde over vannflaten når man svømmer
const RADIUS = 0.28;
const WALK = 1.55;
const RUN = 3.1;
const STEP = 0.72; // meter per fottrinn
const GRAVITY = 9.8;
const JUMP = 3.4; // m/s opp (ca. 0,6 m hopp)
const SPRING = 5.4; // fra et stupebrett (ca. 1,5 m)
const DROP = 0.5; // så mye lavere bakken må være før man faller i stedet for å gå ned
const MAX_LAG = 0.12; // så langt føttene kan henge etter bakken på vei opp (utjevningen av kameraet)
const BODY = 1.75;

/** Underlaget for fottrinn. finish = belegget i ruten: fliser (eller temaets eget belegg, tiles.step). */
export function surfaceFor(theme, tile, finish = 0, shopStyle = 0) {
  if (tile === TILE.WATER) return theme.pit === 'balls' ? 'balls' : 'water';
  if (finish) return SHOP_INTERIORS[FINISHES[finish]?.style ?? shopStyle - 1]?.step ?? theme.tiles?.step ?? 'tile';
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
    this.bobScale = 1; // hodebevegelse (mindre under drømmegange)
    this.vy = 0; // fart opp/ned i et hopp eller fall
    this.splash = 0; // farten man traff vannet med denne rammen (walkmode lager plasket), ellers 0
    this._jumpHeld = false;
  }

  /** Bakken under føttene: gulvet, eller en gjenstand man kan gå på (stupebrettet). */
  ground(level) {
    const g = groundAt(level, this.x, this.z, this.floorY);
    const on = objectGround(level, this.x, this.z, this.floorY + STEP_UP);
    return on && on.y > g ? { ...on, object: true } : { y: g, spring: false, object: false };
  }

  /** Høyden: går ned trapper og kanter, faller (tyngdekraft) og hopper; plask når man treffer vannet. */
  _vertical(dt, input, level, here) {
    const ground = this.ground(level);
    const jump = input.jumping && !this._jumpHeld;
    this._jumpHeld = !!input.jumping;
    if (this.vy === 0 && ground.y >= this.floorY - DROP) {
      this.floorY += (ground.y - this.floorY) * Math.min(1, dt * 6);
      // Bratte trapper stiger fortere enn utjevningen. Hang føttene langt etter, ville etasjen under
      // et dekke blitt valgt (groundAt med y, DECK_SNAP) – man falt gjennom galleriet og satt fast.
      this.floorY = Math.max(this.floorY, ground.y - MAX_LAG);
      if (jump && (ground.object || here !== TILE.WATER)) this.vy = ground.spring ? SPRING : JUMP; // ikke fra bunnen av bassenget
      return;
    }
    const before = this.floorY;
    this.vy -= GRAVITY * dt;
    this.floorY += this.vy * dt;
    if (this.vy > 0 && this.floorY + BODY > headAt(level, Math.floor(this.x), Math.floor(this.z), before)) this.vy = 0; // taket
    if (here === TILE.WATER && before > WATER_SURFACE && this.floorY <= WATER_SURFACE) {
      this.splash = Math.max(0.5, -this.vy);
      this.dip = Math.min(1.1, 0.25 + this.splash * 0.12);
      this.vy *= 0.3; // vannet bremser
    }
    if (this.floorY <= ground.y) {
      this.floorY = ground.y;
      this.vy = 0;
    }
  }

  reset(level, spawn) {
    this.shopSurfaces = shopInteriorMap(level);
    this.x = spawn.x;
    this.z = spawn.z;
    this.yaw = spawn.a;
    this.pitch = 0;
    this.vx = this.vz = this.vy = 0;
    this.distance = 0;
    this.stepPhase = 0;
    this.floorY = groundAt(level, this.x, this.z);
    this.floorY = Math.max(this.floorY, objectGround(level, this.x, this.z)?.y ?? -Infinity); // start oppå stupebrettet
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
    this.vy = 0;
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
    const tile = waterCell(level, Math.floor(this.x), Math.floor(this.z)) ? TILE.WATER : getTile(level, Math.floor(this.x), Math.floor(this.z));
    // Vasser man (ikke står over vannet på stupebrettet), går det tregere.
    const wading = tile === TILE.WATER && this.floorY < WATER_SURFACE;
    const slow = isSwimming(this.floorY) ? 0.45 : wading ? 0.6 : 1;
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

    const [ex, ez] = escalatorVelocity(level, this.x, this.z, this.floorY, this.vy);
    // Transport gir verken fottrinn eller hodevugging; kollisjon og vern gjelder fortsatt.
    if (ex || ez) [this.x, this.z] = moveCircle(level, this.x, this.z, ex * dt, ez * dt, RADIUS, true, this.floorY);

    const here = waterCell(level,Math.floor(this.x),Math.floor(this.z))?TILE.WATER:getTile(level,Math.floor(this.x),Math.floor(this.z));
    // Etter dekket man står på; går man utfor kanten, faller man ned i etasjen under.
    this._vertical(dt, input, level, here);
    if (this.visited) {
      const i = Math.floor(this.z) * level.w + Math.floor(this.x);
      if (i >= 0 && i < this.visited.length) this.visited[i] = 1;
    }

    const before = Math.floor(this.stepPhase);
    this.stepPhase += moved / STEP;
    if (Math.floor(this.stepPhase) === before || this.vy !== 0) return null; // ingen fottrinn i lufta
    const cell = Math.floor(this.z) * level.w + Math.floor(this.x);
    // Oppe på stupebrettet over vannet: harde trinn, ikke plask.
    if (here === TILE.WATER && this.floorY > WATER_SURFACE) return surfaceFor(theme, TILE.FLOOR, 1);
    return surfaceFor(theme, here, level.finish?.[cell] ?? 0, this.shopSurfaces?.[cell] ?? 0);
  }

  applyToCamera(camera) {
    const speed = Math.hypot(this.vx, this.vz);
    const amp = 0.035 * Math.min(1.4, speed / WALK) * (isSwimming(this.floorY) ? 0.5 : 1) * this.bobScale;
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
