// Monsteret i Scary mode. I lyset viser det seg langt unna og forsvinner når man nærmer seg;
// når lyset går, kommer det etter en – rundt vegger, men ikke gjennom lukkede dører – og
// forsvinner når lyset kommer tilbake. Tar det en igjen, «noclipper» man videre. Med gentle
// («no jumpscares») tar det en aldri: det trekker seg unna når det kommer for nær. Ren logikk.
import { TILE, getTile } from '../core/level.js';
import { groundAt } from '../core/heights.js';
import { DOOR, doorInfo } from '../core/doors.js';
import { lineOfSight } from './lighting.js';

export const MONSTER = {
  SPEED: 2.0, // m/s i mørket – raskere enn å gå (1,55), saktere enn å løpe (3,1)
  CATCH: 0.8, // så nær det må komme
  VANISH_NEAR: 6.5, // i lyset forsvinner det når man kommer nærmere enn dette
  GENTLE_NEAR: 3, // gentle: så nær det kommer før det trekker seg unna
  LURK: [7, 14], // avstand når det viser seg i lyset
  HUNT: [12, 24], // veilengde unna der det dukker opp når lyset går
};

const between = (rand, [a, b]) => a + rand() * (b - a);
const NEIGHBOURS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/** Kan monsteret gå gjennom ruten? Ikke vegg, søyle eller lukket dør. */
export function passable(level, x, z) {
  const t = getTile(level, x, z);
  if (t === TILE.WALL || t === TILE.PILLAR) return false;
  if (t === TILE.DOOR) return doorInfo(level, x, z)?.state !== DOOR.CLOSED;
  return true;
}

/** Veilengde (antall steg, diagonalt teller som 1,4) fra (x, z) til alle ruter: Float32Array. */
export function distanceMap(level, x, z) {
  const { w, h } = level;
  const dist = new Float32Array(w * h).fill(Infinity);
  if (!passable(level, x, z)) return dist;
  // Enkel Dijkstra med en liten «bøttekø» (avstandene er 1 eller 1,4).
  dist[z * w + x] = 0;
  let frontier = [z * w + x];
  while (frontier.length) {
    const next = [];
    for (const i of frontier) {
      const cx = i % w;
      const cz = (i / w) | 0;
      for (const [dx, dz] of NEIGHBOURS) {
        const nx = cx + dx;
        const nz = cz + dz;
        if (!passable(level, nx, nz)) continue;
        if (dx && dz && (!passable(level, cx + dx, cz) || !passable(level, cx, cz + dz))) continue;
        const d = dist[i] + (dx && dz ? 1.4 : 1);
        const j = nz * w + nx;
        if (d < dist[j] - 1e-6) {
          dist[j] = d;
          next.push(j);
        }
      }
    }
    frontier = next;
  }
  return dist;
}

export class MonsterAI {
  constructor(level, rand = Math.random) {
    this.level = level;
    this.rand = rand;
    this.state = 'hidden'; // 'hidden' | 'lurk' | 'hunt'
    this.gentle = false; // «no jumpscares»: tar deg aldri
    this.x = this.z = this.y = 0;
    this.t = 0;
    this.lurkIn = between(rand, [25, 50]);
    this._map = null;
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

  _distances(player) {
    const cell = Math.floor(player.z) * this.level.w + Math.floor(player.x);
    if (cell !== this._mapCell) {
      this._map = distanceMap(this.level, Math.floor(player.x), Math.floor(player.z));
      this._mapCell = cell;
    }
    return this._map;
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
    return true;
  }

  _hunt(player) {
    let cells = this._cellsAround(player, MONSTER.HUNT, true);
    if (!cells.length) cells = this._cellsAround(player, [6, Infinity], true);
    if (!cells.length) return false;
    this._place(cells[Math.floor(this.rand() * cells.length)]);
    this.state = 'hunt';
    return true;
  }

  _vanish() {
    this.state = 'hidden';
    this.lurkIn = between(this.rand, [30, 70]);
    return 'vanish';
  }

  /** Mot spilleren langs korteste vei (nedover i avstandskartet). */
  _move(dt, player) {
    const map = this._distances(player);
    const { w } = this.level;
    const cx = Math.floor(this.x);
    const cz = Math.floor(this.z);
    let tx = player.x;
    let tz = player.z;
    // Ingen vei (lukket dør imellom): blir stående og venter.
    if (map[cz * w + cx] === Infinity) return;
    if (cx !== Math.floor(player.x) || cz !== Math.floor(player.z)) {
      let best = map[cz * w + cx];
      for (const [dx, dz] of NEIGHBOURS) {
        const j = (cz + dz) * w + cx + dx;
        if (map[j] < best - 1e-6) {
          best = map[j];
          tx = cx + dx + 0.5;
          tz = cz + dz + 0.5;
        }
      }
    }
    const dx = tx - this.x;
    const dz = tz - this.z;
    const d = Math.hypot(dx, dz);
    const step = Math.min(d, MONSTER.SPEED * dt);
    if (d > 1e-6) {
      this.x += (dx / d) * step;
      this.z += (dz / d) * step;
    }
    this.y += (groundAt(this.level, this.x, this.z, this.y) - this.y) * Math.min(1, dt * 6);
  }

  /**
   * @param player { x, z, y, yaw } · dark: lyset er borte (strømbrudd)
   * @returns {'appear' | 'hunt' | 'vanish' | 'caught' | null}
   */
  update(dt, player, dark) {
    const dist = () => Math.hypot(this.x - player.x, this.z - player.z);
    if (dark && this.state !== 'hunt') return this._hunt(player) ? 'hunt' : null;
    if (!dark && this.state === 'hunt') return this._vanish();
    if (this.state === 'hunt') {
      this._move(dt, player);
      if (this.gentle && dist() < MONSTER.GENTLE_NEAR) return this._vanish();
      if (dist() < MONSTER.CATCH && Math.abs(this.y - player.y) < 1.6) {
        this._vanish();
        return 'caught';
      }
      return null;
    }
    if (this.state === 'lurk') {
      this.t -= dt;
      return this.t <= 0 || dist() < MONSTER.VANISH_NEAR ? this._vanish() : null;
    }
    this.lurkIn -= dt;
    if (this.lurkIn > 0) return null;
    if (this._lurk(player)) return 'appear';
    this.lurkIn = 5; // ingen fri sikt nå – prøv igjen litt senere
    return null;
  }
}
