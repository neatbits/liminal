// Den sorte skikkelsen. I lyset lister den seg gjennom bakgrunnen, langt unna, til et sted man ikke
// ser, og den er rask bort når man kommer nær. Når lyset går, kommer den etter en – rundt vegger, men
// ikke gjennom lukkede dører: langsomt på avstand, og med korte, raske utfall når den er nær og ser
// en. Den forsvinner når lyset kommer tilbake. Tar den en igjen, «noclipper» man videre. Med gentle
// («no jumpscares») tar den en aldri: den trekker seg unna når den kommer for nær. I krypeganger kommer
// den ikke inn: den går til åpningen, blir stående en stund, og er så borte. Ren logikk.
import { TILE, getTile } from '../core/level.js';
import { groundAt } from '../core/heights.js';
import { lineOfSight } from './lighting.js';
import { NEIGHBOURS, distanceMap, canStep } from './paths.js';
import { Trail } from './monster-trail.js';

export { passable, distanceMap } from './paths.js';

export const MONSTER = {
  SPEED: 1.3, // m/s i mørket på avstand – saktere enn å gå (1,55)
  RUSH: 3.4, // m/s i et utfall – raskere enn å løpe (3,1)
  RUSH_NEAR: 6, // så nær (fri sikt) før et utfall
  RUSH_TIME: 2, // s: et utfall varer så lenge
  RUSH_REST: 3, // s før det neste
  SLINK: 0.9, // m/s i lyset, gjennom bakgrunnen
  DART: 4.5, // m/s bort når man kommer nær i lyset
  HIDE: [3, 12], // veilengde til skjulet den lister seg mot i lyset
  CATCH: 0.8, // så nær det må komme
  VANISH_NEAR: 6.5, // i lyset er det rask bort når man kommer nærmere enn dette
  GENTLE_NEAR: 3, // gentle: så nær det kommer før det trekker seg unna
  LURK: [7, 14], // avstand når det viser seg i lyset
  HUNT: [12, 24], // veilengde unna der det dukker opp når lyset går
  PATIENCE: 10, // s den står ved åpningen til en krypegang man er inne i
  AWAY: [12, 25], // s før den kommer igjen etter det
};

const between = (rand, [a, b]) => a + rand() * (b - a);

/** Hvor en lyd fra (x, z) høres for spilleren: pan −1 (venstre) … 1 (høyre) og avstanden i meter. */
export function heardFrom(x, z, player) {
  const dx = x - player.x;
  const dz = z - player.z;
  const dist = Math.hypot(dx, dz);
  // Høyre for blikket: (cos yaw, −sin yaw), se Walker.update.
  return { pan: dist > 1e-6 ? (dx * Math.cos(player.yaw) - dz * Math.sin(player.yaw)) / dist : 0, dist };
}

export class MonsterAI {
  constructor(level, rand = Math.random) {
    this.level = level;
    this.rand = rand;
    this.state = 'hidden'; // 'hidden' | 'lurk' | 'hunt'
    this.gentle = false; // «no jumpscares»: tar deg aldri
    this.chase = {}; // stemningens chase (gen/moods.js): speed, rush og near overstyrer MONSTER
    this.x = this.z = this.y = 0;
    this.t = 0;
    this.rush = 0; // s igjen av utfallet
    this.rest = 0; // s før neste utfall
    this.fast = false; // i et utfall, eller på vei bort: kroppen blir mer utvisket (view3d/monster.js)
    this.goal = null; // skjulet i lyset: { x, z, way, map }
    this.trail = new Trail(); // der det tror du er
    this.lurkIn = between(rand, [25, 50]);
    this.waited = 0; // s ved åpningen til en krypegang
    this.away = 0; // s før den kan jakte igjen etter å ha gitt opp
    this._map = null;
    this._open = null;
    this._mapCell = -1;
  }

  get visible() {
    return this.state !== 'hidden';
  }

  _cellsAround(player, [lo, hi], useMap) {
    const { w, h } = this.level;
    const out = [];
    const map = useMap ? this._distances(player) : null;
    for (let z = 0; z < h; z++) {
      for (let x = 0; x < w; x++) {
        if (getTile(this.level, x, z) !== TILE.FLOOR) continue;
        const d = map ? map[z * w + x] : Math.hypot(x + 0.5 - player.x, z + 0.5 - player.z);
        if (d >= lo && d <= hi) out.push([x, z]);
      }
    }
    return out;
  }

  /** Veilengde til spilleren. Bak en krypegang teller veien gjennom den, så den finner åpningen. */
  _distances(player) {
    const { w } = this.level;
    const [px, pz] = [Math.floor(player.x), Math.floor(player.z)];
    if (pz * w + px !== this._mapCell) {
      this._map = distanceMap(this.level, px, pz, false, true);
      this._open = null;
      this._mapCell = pz * w + px;
    }
    if (this._map[Math.floor(this.z) * w + Math.floor(this.x)] < Infinity) return this._map;
    return (this._open ??= distanceMap(this.level, px, pz));
  }

  _place([x, z]) {
    this.x = x + 0.5;
    this.z = z + 0.5;
    this.y = groundAt(this.level, this.x, this.z);
  }

  /** Viser seg i lyset: et sted man ser rett fram, et stykke unna. */
  _lurk(player) {
    const fx = -Math.sin(player.yaw);
    const fz = -Math.cos(player.yaw);
    const seen = this._cellsAround(player, MONSTER.LURK, false).filter(([x, z]) => {
      const dx = x + 0.5 - player.x;
      const dz = z + 0.5 - player.z;
      const d = Math.hypot(dx, dz);
      return (dx * fx + dz * fz) / d > 0.75 && lineOfSight(this.level, player.x, player.z, x + 0.5, z + 0.5);
    });
    if (!seen.length) return false;
    this._place(seen[Math.floor(this.rand() * seen.length)]);
    this.state = 'lurk';
    this.t = between(this.rand, [5, 9]);
    this.goal = this._hideout(player);
    if (this.goal) this.t = this.goal.way / MONSTER.SLINK + 2; // tid nok til å nå fram
    return true;
  }

  /** Et sted i nærheten man ikke ser fra der man står: dit lister den seg. */
  _hideout(player) {
    const { w, h } = this.level;
    const map = distanceMap(this.level, Math.floor(this.x), Math.floor(this.z), false, true);
    const [lo, hi] = MONSTER.HIDE;
    const spots = [];
    for (let z = 0; z < h; z++) {
      for (let x = 0; x < w; x++) {
        const d = map[z * w + x];
        if (d < lo || d > hi || getTile(this.level, x, z) !== TILE.FLOOR) continue;
        if (!lineOfSight(this.level, player.x, player.z, x + 0.5, z + 0.5)) spots.push([x, z]);
      }
    }
    if (!spots.length) return null;
    const [x, z] = spots[Math.floor(this.rand() * spots.length)];
    return { x: x + 0.5, z: z + 0.5, way: map[z * w + x], map: distanceMap(this.level, x, z, false, true) };
  }

  _hunt(player) {
    let cells = this._cellsAround(player, this.chase.near ?? MONSTER.HUNT, true);
    if (!cells.length) cells = this._cellsAround(player, [6, Infinity], true);
    if (!cells.length) return false;
    this._place(cells[Math.floor(this.rand() * cells.length)]);
    this.state = 'hunt';
    return true;
  }

  _vanish() {
    this.state = 'hidden';
    this.fast = false;
    this.rush = this.rest = this.waited = 0;
    this.goal = null;
    this.trail.clear();
    this.lurkIn = between(this.rand, [30, 70]);
    return 'vanish';
  }

  /** Farten i mørket: lister seg på avstand, utfall når den er nær og ser en, og så en pause. */
  _pace(dt, player) {
    this.rest = Math.max(0, this.rest - dt);
    if (this.rush > 0) {
      this.rush -= dt;
      if (this.rush <= 0) this.rest = this.chase.rest ?? MONSTER.RUSH_REST;
    } else if (!this.rest && Math.hypot(this.x - player.x, this.z - player.z) < MONSTER.RUSH_NEAR && lineOfSight(this.level, this.x, this.z, player.x, player.z)) {
      this.rush = MONSTER.RUSH_TIME;
    }
    this.fast = this.rush > 0;
    return this.fast ? this.chase.rush ?? MONSTER.RUSH : this.chase.speed ?? MONSTER.SPEED;
  }

  /** Mot (gx, gz) langs korteste vei (nedover i avstandskartet fra dit). Returnerer om den kom noen vei. */
  _move(dt, map, gx, gz, speed) {
    const { w } = this.level;
    const cx = Math.floor(this.x);
    const cz = Math.floor(this.z);
    let tx = gx;
    let tz = gz;
    // Ingen vei (lukket dør imellom): blir stående og venter.
    if (map[cz * w + cx] === Infinity) return false;
    if (cx !== Math.floor(gx) || cz !== Math.floor(gz)) {
      let best = map[cz * w + cx];
      let found = false;
      for (const [dx, dz] of NEIGHBOURS) {
        const j = (cz + dz) * w + cx + dx;
        if (map[j] < best - 1e-6 && canStep(this.level, cx, cz, dx, dz, false, true)) {
          best = map[j];
          tx = cx + dx + 0.5;
          tz = cz + dz + 0.5;
          found = true;
        }
      }
      if (!found) return false; // ved åpningen til en krypegang
    }
    const dx = tx - this.x;
    const dz = tz - this.z;
    const d = Math.hypot(dx, dz);
    const step = Math.min(d, speed * dt);
    if (d > 1e-6) {
      this.x += (dx / d) * step;
      this.z += (dz / d) * step;
    }
    this.y += (groundAt(this.level, this.x, this.z, this.y) - this.y) * Math.min(1, dt * 6);
    return true;
  }

  /** Står den ved en krypegang man er inne i, gir den opp etter en stund. */
  _wait(dt, moved, map) {
    this.waited = !moved && map === this._open ? this.waited + dt : 0;
    if (this.waited < MONSTER.PATIENCE) return false;
    this.away = between(this.rand, MONSTER.AWAY);
    return true;
  }

  /**
   * @param player { x, z, y, yaw } · dark: lyset er borte (strømbrudd)
   * @returns {'appear' | 'hunt' | 'vanish' | 'caught' | null}
   */
  update(dt, player, dark) {
    const dist = () => Math.hypot(this.x - player.x, this.z - player.z);
    this.away = Math.max(0, this.away - dt);
    if (dark && this.state !== 'hunt') return !this.away && this._hunt(player) ? 'hunt' : null;
    if (!dark && this.state === 'hunt') return this._vanish();
    if (this.state === 'hunt') {
      const prey = this.trail.follow(dt, this.level, this, player, this.chase);
      const map = this._distances(prey);
      if (this._wait(dt, this._move(dt, map, prey.x, prey.z, this._pace(dt, player)), map)) return this._vanish();
      if (this.gentle && dist() < MONSTER.GENTLE_NEAR) return this._vanish();
      if (dist() < MONSTER.CATCH && Math.abs(this.y - player.y) < 1.6) {
        this._vanish();
        return 'caught';
      }
      return null;
    }
    if (this.state === 'lurk') {
      this.t -= dt;
      const near = dist() < MONSTER.VANISH_NEAR;
      const { goal } = this;
      if (!goal) return this.t <= 0 || near ? this._vanish() : null;
      this.fast ||= near; // først rask, så helt bort
      this._move(dt, goal.map, goal.x, goal.z, this.fast ? MONSTER.DART : MONSTER.SLINK);
      return this.t <= 0 || Math.hypot(this.x - goal.x, this.z - goal.z) < 0.3 ? this._vanish() : null;
    }
    this.lurkIn -= dt;
    if (this.lurkIn > 0) return null;
    if (this._lurk(player)) return 'appear';
    this.lurkIn = 5; // ingen fri sikt nå – prøv igjen litt senere
    return null;
  }
}
