// Hendelser som reagerer på spilleren i gåmodus: når man ikke ser etter, endrer rommet seg litt.
// En dør man har gått gjennom er blitt vegg, et lys man gikk under har sluknet, en gjenstand har
// snudd seg mot en, en dør som stod åpen er lukket. Endringene skjer bare bak ryggen på spilleren,
// et stykke unna, og aldri slik at man blir stengt inne. Stemningen (gen/moods.js, `shifts`)
// bestemmer hvor ofte. Ren logikk – view3d/shifts.js bygger verdenen på nytt med endringen.
import { TILE, LIGHT } from '../core/level.js';
import { floodRegion } from '../core/ops.js';
import { DOOR, doorInfo, doorFronts } from '../core/doors.js';
import { OBJECTS, FACING, objectFits, objectPose } from '../core/objects.js';

const MEMORY = 90; // sekunder: hvor lenge man «husker» en dør man gikk gjennom eller et lys man gikk under
const BEHIND = Math.cos((100 * Math.PI) / 180); // utenfor ±100° fra blikket

/** Ligger punktet bak spilleren (utenfor synsfeltet) og innenfor [near, far] meter? yaw 0 = mot −z. */
export function behind(view, x, z, near = 3, far = 12) {
  const dx = x - view.x;
  const dz = z - view.z;
  const d = Math.hypot(dx, dz);
  if (d < near || d > far) return false;
  return (-Math.sin(view.yaw) * dx - Math.cos(view.yaw) * dz) / d < BEHIND;
}

/** Henger rutene på begge sider av døren fortsatt sammen om døren blir vegg? */
function staysConnected(level, info) {
  const [[ax, az], [bx, bz]] = doorFronts(info);
  const i = info.z * level.w + info.x;
  const region = floodRegion(level, ax, az, (t, k) => k !== i && t !== TILE.WALL && t !== TILE.PILLAR);
  return region.includes(bz * level.w + bx);
}

// Endringene: kandidater ({ i, x, z }) i rommet, og hvordan de settes inn i en kopi av rommet.
const KINDS = {
  doorWall: {
    weight: 3,
    find(level, view, seen) {
      const out = [];
      for (const [i, t] of seen.doors) {
        const info = doorInfo(level, i % level.w, Math.floor(i / level.w));
        if (!info || info.oneSided || view.time - t > MEMORY) continue;
        if (behind(view, info.x + 0.5, info.z + 0.5, 4, 14) && staysConnected(level, info)) out.push({ i, x: info.x, z: info.z });
      }
      return out;
    },
    apply(level, c) {
      level.tiles[c.i] = TILE.WALL;
      level.meta[c.i] = 0;
      level.lights[c.i] = LIGHT.NONE;
    },
  },
  lightOut: {
    weight: 3,
    find(level, view, seen) {
      const out = [];
      for (const [i, t] of seen.lights) {
        const [x, z] = [i % level.w, Math.floor(i / level.w)];
        if (level.lights[i] === LIGHT.ON && view.time - t <= MEMORY && behind(view, x + 0.5, z + 0.5, 3, 12)) out.push({ i, x, z });
      }
      return out;
    },
    apply(level, c) {
      level.lights[c.i] = LIGHT.BROKEN;
    },
  },
  objectTurn: {
    weight: 2,
    find(level, view) {
      const out = [];
      (level.objects ?? []).forEach((o, i) => {
        const def = OBJECTS[o.id];
        if (!def || def.soft || def.loose || def.mount || def.floats || def.surface) return;
        const p = objectPose(level, o);
        if (!behind(view, p.x, p.z, 2.5, 10)) return;
        const rot = facingRot(view.x - p.x, view.z - p.z);
        const turned = { ...o, rot };
        const objects = level.objects.map((q, k) => (k === i ? turned : q));
        if (rot !== o.rot && objectFits({ ...level, objects }, turned, objects)) out.push({ i, x: o.x, z: o.z, rot });
      });
      return out;
    },
    apply(level, c) {
      level.objects = level.objects.map((o, k) => (k === c.i ? { ...o, rot: c.rot } : o));
    },
  },
  doorClose: {
    weight: 2,
    find(level, view) {
      const out = [];
      for (let i = 0; i < level.tiles.length; i++) {
        if (level.tiles[i] !== TILE.DOOR) continue;
        const info = doorInfo(level, i % level.w, Math.floor(i / level.w));
        if (!info || info.oneSided || info.state === DOOR.NONE || info.state === DOOR.CLOSED) continue;
        if (behind(view, info.x + 0.5, info.z + 0.5, 3, 12)) out.push({ i, x: info.x, z: info.z });
      }
      return out;
    },
    apply(level, c) {
      level.meta[c.i] = (level.meta[c.i] & ~3) | DOOR.CLOSED;
    },
  },
};

export const SHIFT_KINDS = Object.keys(KINDS);

/** Retningen (rot 0–3) som peker mest mot (dx, dz). */
export function facingRot(dx, dz) {
  let best = 0;
  for (let r = 1; r < 4; r++) if (FACING[r][0] * dx + FACING[r][1] * dz > FACING[best][0] * dx + FACING[best][1] * dz) best = r;
  return best;
}

export class Shifts {
  /** @param every [min, max] sekunder mellom endringene, eller null (aldri) */
  constructor(rand, every) {
    this.rand = rand;
    this.every = every;
    this.wait = every ? this._next() * 0.7 : Infinity;
    this.time = 0;
    this.doors = new Map(); // døråpninger man har gått gjennom: indeks → tid
    this.lights = new Map(); // lys man har gått under: indeks → tid
    this.cell = -1;
  }

  _next() {
    const [a, b] = this.every;
    return a + this.rand() * (b - a);
  }

  /** Hver ramme: hvor spilleren er. */
  observe(level, x, z, dt) {
    this.time += dt;
    this.wait -= dt;
    const i = Math.floor(z) * level.w + Math.floor(x);
    if (i === this.cell || i < 0 || i >= level.tiles.length) return;
    this.cell = i;
    if (level.tiles[i] === TILE.DOOR) this.doors.set(i, this.time);
    if (level.lights[i] === LIGHT.ON) this.lights.set(i, this.time);
  }

  /**
   * Er det tid, og finnes det noe å endre bak ryggen på spilleren? Returnerer { kind, c, apply }
   * (apply(kopi) setter endringen inn), eller null. view = { x, z, yaw }.
   */
  pick(level, view) {
    if (this.wait > 0) return null;
    const v = { ...view, time: this.time };
    const seen = { doors: this.doors, lights: this.lights };
    const options = SHIFT_KINDS.map((kind) => ({ kind, list: KINDS[kind].find(level, v, seen) })).filter((o) => o.list.length);
    if (!options.length) {
      this.wait = 3; // prøv igjen om litt
      return null;
    }
    const total = options.reduce((s, o) => s + KINDS[o.kind].weight, 0);
    let r = this.rand() * total;
    const o = options.find((q) => (r -= KINDS[q.kind].weight) < 0) ?? options[0];
    const c = o.list[Math.floor(this.rand() * o.list.length)];
    this.wait = this._next();
    if (o.kind === 'doorWall') this.doors.delete(c.i);
    if (o.kind === 'lightOut') this.lights.delete(c.i);
    return { kind: o.kind, c, apply: (copy) => KINDS[o.kind].apply(copy, c) };
  }
}
