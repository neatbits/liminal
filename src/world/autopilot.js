// Drømmegange: en autopilot som glir sakte gjennom rommet. Den velger lange etapper mot steder
// den ikke har vært ennå, følger korteste vei rundt vegger (ikke gjennom vann eller lukkede
// dører), og etter noen etapper går den mot en dør til ingensteds og videre til neste nivå.
// Ren logikk – view3d/drift.js gjør styringen om til gange.
import { TILE, getTile } from '../core/level.js';
import { DOOR, doorInfo } from '../core/doors.js';
import { NEIGHBOURS, distanceMap, canStep } from './paths.js';

export const DRIFT = {
  SPEED: 0.6, // andel av gangfarten (≈ 0,9 m/s)
  ARRIVE: 0.7, // så nær målet regnes som framme
  LEG: [8, 40], // ønsket etappelengde (veilengde)
  STUCK: 3, // sekunder uten å komme noen vei før den velger nytt mål
};

/** Dører til ingensteds man kan gå gjennom: { x, z, fx, fz, yaw } (fx, fz = ruten foran). */
export function exitSpots(level) {
  const out = [];
  for (let z = 0; z < level.h; z++) {
    for (let x = 0; x < level.w; x++) {
      const d = doorInfo(level, x, z);
      if (!d?.oneSided || d.state === DOOR.NONE) continue;
      const [fx, fz] = d.pz ? [x, z + d.side] : [x + d.side, z];
      if (getTile(level, fx, fz) !== TILE.FLOOR) continue;
      out.push({ x, z, fx, fz, yaw: Math.atan2(-(x - fx), -(z - fz)) });
    }
  }
  return out;
}

export class Autopilot {
  constructor(level, rand = Math.random) {
    this.level = level;
    this.rand = rand;
    this.visits = new Uint8Array(level.w * level.h);
    this.target = null;
    this.map = null;
    this.legs = 0;
    this.exitAfter = 3 + Math.floor(rand() * 4);
    this.stuck = 0;
    this.last = null;
  }

  _plan(x, z) {
    const { w } = this.level;
    const from = distanceMap(this.level, Math.floor(x), Math.floor(z), true);
    const exits = exitSpots(this.level).filter((e) => from[e.fz * w + e.fx] < Infinity);
    this.legs++;
    if (this.legs > this.exitAfter && exits.length) {
      const e = exits[Math.floor(this.rand() * exits.length)];
      this.target = { x: e.fx + 0.5, z: e.fz + 0.5, exit: e };
    } else {
      // Blant tilfeldige ruter et passe stykke unna: helst langt borte og der den ikke har vært.
      let best = null;
      let bestScore = -1;
      for (let k = 0; k < 80; k++) {
        const i = Math.floor(this.rand() * from.length);
        const d = from[i];
        if (d === Infinity || getTile(this.level, i % w, (i / w) | 0) !== TILE.FLOOR) continue;
        const inRange = d >= DRIFT.LEG[0] && d <= DRIFT.LEG[1];
        const score = (inRange ? 2 : 0.5) * d * (0.6 + this.rand() * 0.8) / (1 + this.visits[i] * 3);
        if (score > bestScore) {
          bestScore = score;
          best = i;
        }
      }
      if (best === null) {
        this.target = null;
        return;
      }
      this.target = { x: (best % w) + 0.5, z: ((best / w) | 0) + 0.5, exit: null };
    }
    this.map = distanceMap(this.level, Math.floor(this.target.x), Math.floor(this.target.z), true);
  }

  /**
   * Punktet å styre mot: midten av neste rute nedover avstandskartet (ett steg – lenger fram
   * ville skjært hjørner og havnet i bassenget). Svingene glattes av view3d/drift.js.
   */
  _aim(x, z) {
    const { w } = this.level;
    let cx = Math.floor(x);
    let cz = Math.floor(z);
    if (this.map[cz * w + cx] === Infinity) return null;
    for (let step = 0; step < 1; step++) {
      let best = this.map[cz * w + cx];
      let next = null;
      for (const [dx, dz] of NEIGHBOURS) {
        const j = (cz + dz) * w + cx + dx;
        if (this.map[j] < best - 1e-6 && canStep(this.level, cx, cz, dx, dz, true)) {
          best = this.map[j];
          next = [cx + dx, cz + dz];
        }
      }
      if (!next) break;
      [cx, cz] = next;
    }
    const tx = cx === Math.floor(this.target.x) && cz === Math.floor(this.target.z) ? this.target.x : cx + 0.5;
    const tz = cx === Math.floor(this.target.x) && cz === Math.floor(this.target.z) ? this.target.z : cz + 0.5;
    return [tx, tz];
  }

  /**
   * @param walker { x, z } der man står nå
   * @returns {{ forward, yaw } | { exit } | null} fart og retning, en utgang å gå gjennom,
   *          eller null når det ikke finnes noe sted å gå
   */
  update(dt, walker) {
    const { w, h } = this.level;
    const cx = Math.floor(walker.x);
    const cz = Math.floor(walker.z);
    for (let z = cz - 2; z <= cz + 2; z++) {
      for (let x = cx - 2; x <= cx + 2; x++) if (x >= 0 && z >= 0 && x < w && z < h) this.visits[z * w + x] = Math.min(255, this.visits[z * w + x] + 1);
    }
    // Står den fast (hevet gulv, en gjenstand), velges et nytt mål.
    if (this.last) {
      const moved = Math.hypot(walker.x - this.last.x, walker.z - this.last.z);
      this.stuck = moved < 0.2 * dt ? this.stuck + dt : 0;
    }
    this.last = { x: walker.x, z: walker.z };
    if (!this.target || this.stuck > DRIFT.STUCK) {
      this.stuck = 0;
      this._plan(walker.x, walker.z);
      if (!this.target) return null;
    }
    if (Math.hypot(this.target.x - walker.x, this.target.z - walker.z) < DRIFT.ARRIVE) {
      if (this.target.exit) return { exit: this.target.exit };
      this._plan(walker.x, walker.z);
      if (!this.target) return null;
    }
    const aim = this._aim(walker.x, walker.z);
    if (!aim) {
      this._plan(walker.x, walker.z);
      return this.target ? { forward: 0, yaw: null } : null;
    }
    return { forward: DRIFT.SPEED, yaw: Math.atan2(-(aim[0] - walker.x), -(aim[1] - walker.z)) };
  }
}
