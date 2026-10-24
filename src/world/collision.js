// Kollisjon for en sirkel (spilleren sett ovenfra) mot vegger, søyler, lukkede dører,
// rekkverk, vannsklier og gulv som ligger for høyt til å gå rett opp på.
import { TILE, getTile } from '../core/level.js';
import { pillarContains } from '../core/pillars.js';
import { pushFromPillars } from './pillar-collision.js';
import { waterCell } from '../core/pillar-water.js';
import { groundAt, headAt } from '../core/heights.js';
import { guardBoxes } from '../core/railings.js';
import { slideColliders } from '../core/slides.js';
import { objectColliders, objectGround, walkBlockers } from '../core/objects.js';
import { doorInfo } from '../core/doors.js';
import { closedLeafBox } from './doors.js';
import { cornerShape, pointInPolygon } from '../core/corners.js';
import { halfWallContains } from '../core/half-walls.js';

function solidBox(level, cx, cz) {
  const t = getTile(level, cx, cz);
  if (t === TILE.WALL) return cornerShape(level, cx, cz) ? null : [cx, cz, cx + 1, cz + 1]; // åpnet hjørne: se pushFromShape
  if (t === TILE.DOOR) return closedLeafBox(doorInfo(level, cx, cz));
  return null;
}

export const STEP_UP = 0.45; // høyeste kant man går rett opp på (trapper stiger jevnt)
const BODY = 1.75; // kroppshøyde: sklier høyere enn dette kan man gå under

const RING = Array.from({ length: 8 }, (_, k) => [Math.cos((k * Math.PI) / 4), Math.sin((k * Math.PI) / 4)]);

/**
 * Høyden man klatrer fra: høyeste bakke under fotavtrykket (radius r), så kanten man nettopp
 * har gått ned fra ikke skyver en videre – men i basseng vannkanten, så man alltid kommer opp.
 * y er høyden man står i (velger etasje der det er dekke).
 */
export function climbBase(level, x, z, r = 0, y = null) {
  let g = groundAt(level, x, z, y);
  for (const [cx, cz] of RING) g = Math.max(g, groundAt(level, x + cx * r * 0.95, z + cz * r * 0.95, y));
  // Står man på en gjenstand man kan gå på (stupebrettet), klatrer man derfra.
  const on = level.objects?.length ? objectGround(level, x, z, (y ?? g) + STEP_UP) : null;
  if (on) g = Math.max(g, on.y);
  return waterCell(level, Math.floor(x), Math.floor(z)) ? Math.max(g, 0) : g;
}

/**
 * En åpen rute er en hindring når bakken der man ville gått inn ligger for høyt, eller taket i
 * den høyden er for lavt (over en døråpning eller under et dekke når man går i etasjen over).
 */
function tooHigh(level, cx, cz, x, z, base) {
  if (base === null || getTile(level, cx, cz) === TILE.WALL) return null;
  const gx = Math.max(cx + 1e-4, Math.min(x, cx + 1 - 1e-4));
  const gz = Math.max(cz + 1e-4, Math.min(z, cz + 1 - 1e-4));
  const ground = groundAt(level, gx, gz, base);
  const low = headAt(level, cx, cz, base) < Math.max(ground, base) + BODY;
  return ground > base + STEP_UP || low ? [cx, cz, cx + 1, cz + 1] : null;
}

/**
 * Skyver punktet (x, z) ut av alle hindringer innenfor radius r.
 * @param base klatrehøyden (climbBase), eller null for å se bort fra gulvhøyder
 */
export function resolveCircle(level, x, z, r, base = null) {
  for (let iter = 0; iter < 3; iter++) {
    let moved = false;
    const pushed = pushFromPillars(level, x, z, r);
    moved = pushed[0] !== x || pushed[1] !== z;
    [x, z] = pushed;
    for (let cz = Math.floor(z - r); cz <= Math.floor(z + r); cz++) {
      for (let cx = Math.floor(x - r); cx <= Math.floor(x + r); cx++) {
        const boxes = guardBoxes(level, cx, cz, base);
        const solid = solidBox(level, cx, cz) ?? tooHigh(level, cx, cz, x, z, base);
        if (solid) boxes.push(solid);
        // Gjenstander i ruten som står i kroppshøyde (ikke dem i etasjen under eller over).
        for (const o of level.objects?.length ? objectColliders(level, cx, cz) : []) {
          if (base === null || (o.top > base + 0.05 && o.bottom < base + BODY)) boxes.push(o.box);
        }
        if (base !== null && level.objects?.length) boxes.push(...walkBlockers(level, cx, cz, base, STEP_UP, BODY));
        for (const box of boxes) {
          const qx = Math.max(box[0], Math.min(x, box[2]));
          const qz = Math.max(box[1], Math.min(z, box[3]));
          const dx = x - qx;
          const dz = z - qz;
          const d2 = dx * dx + dz * dz;
          if (d2 >= r * r) continue;
          moved = true;
          if (d2 > 1e-12) {
            const d = Math.sqrt(d2);
            x += (dx / d) * (r - d);
            z += (dz / d) * (r - d);
          } else {
            // Midtpunktet er inne i boksen: skyv ut langs korteste akse.
            const pushes = [
              [box[0] - r - x, 0],
              [box[2] + r - x, 0],
              [0, box[1] - r - z],
              [0, box[3] + r - z],
            ];
            pushes.sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1]));
            x += pushes[0][0];
            z += pushes[0][1];
          }
        }
      }
    }
    for (let cz = Math.floor(z - r); cz <= Math.floor(z + r); cz++) {
      for (let cx = Math.floor(x - r); cx <= Math.floor(x + r); cx++) {
        const shape = cornerShape(level, cx, cz);
        if (!shape) continue;
        const pushed = pushFromPolygon(x, z, r, shape.solid);
        moved ||= pushed[0] !== x || pushed[1] !== z;
        [x, z] = pushed;
      }
    }
    if (base !== null && level.slides?.length) {
      const pushed = pushFromSlides(level, x, z, r, base);
      moved ||= pushed[0] !== x || pushed[1] !== z;
      [x, z] = pushed;
    }
    if (!moved) break;
  }
  return [x, z];
}

/** Skyver sirkelen (x, z, r) ut av polygonet (den massive delen av et skrått eller avrundet hjørne). */
export function pushFromPolygon(x, z, r, poly) {
  let best = null;
  let dist = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, az] = poly[j];
    const [bx, bz] = poly[i];
    const ex = bx - ax;
    const ez = bz - az;
    const f = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez || 1)));
    const qx = ax + ex * f;
    const qz = az + ez * f;
    const d = Math.hypot(x - qx, z - qz);
    if (d < dist) [best, dist] = [[qx, qz], d];
  }
  const inside = pointInPolygon(poly, x, z);
  if (!inside && dist >= r) return [x, z];
  if (dist < 1e-9) return [x, z];
  // Ut av polygonet: fra nærmeste punkt på kanten og r videre ut.
  const s = inside ? -1 : 1;
  return [best[0] + ((x - best[0]) / dist) * r * s, best[1] + ((z - best[1]) / dist) * r * s];
}

/** Skyver sirkelen bort fra sklierenner og støtteben som er i kroppshøyde. */
function pushFromSlides(level, x, z, r, base) {
  const head = base + BODY;
  for (const c of slideColliders(level)) {
    if (c.bottom >= head || c.top <= base + 0.1) continue;
    const ex = c.bx - c.ax;
    const ez = c.bz - c.az;
    const l2 = ex * ex + ez * ez;
    const f = l2 > 0 ? Math.max(0, Math.min(1, ((x - c.ax) * ex + (z - c.az) * ez) / l2)) : 0;
    const dx = x - (c.ax + ex * f);
    const dz = z - (c.az + ez * f);
    const d = Math.hypot(dx, dz);
    const min = r + c.hw;
    if (d >= min) continue;
    // Midt i rennen: skyv ut til siden (vinkelrett på rennen).
    const [nx, nz] = d > 1e-9 ? [dx / d, dz / d] : l2 > 0 ? [-ez / Math.sqrt(l2), ex / Math.sqrt(l2)] : [1, 0];
    x += nx * (min - d);
    z += nz * (min - d);
  }
  return [x, z];
}

/**
 * Flytter med delsteg så man ikke kan «tunnelere» gjennom tynne hindringer.
 * @param climb true: man kommer ikke opp på kanter høyere enn STEP_UP (bare via trapper)
 * @param y høyden man står i (etasjen der det er dekke)
 */
export function moveCircle(level, x, z, dx, dz, r, climb = false, y = null) {
  const len = Math.hypot(dx, dz);
  const steps = Math.max(1, Math.ceil(len / (r * 0.5)));
  for (let i = 0; i < steps; i++) {
    const base = climb ? climbBase(level, x, z, r, y) : null;
    [x, z] = resolveCircle(level, x + dx / steps, z + dz / steps, r, base);
  }
  return [x, z];
}

/** Avstand til første vegg langs en retning (for autopilot/kamera). */
export function rayDistance(level, x, z, dirX, dirZ, max = 20, step = 0.1) {
  for (let d = 0; d <= max; d += step) {
    const px = x + dirX * d, pz = z + dirZ * d;
    if (solidBox(level, Math.floor(px), Math.floor(pz)) || pillarContains(level, px, pz) || halfWallContains(level, px, pz)) return d;
  }
  return max;
}
