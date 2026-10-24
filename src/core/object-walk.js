// Gjenstander man kan gå på (katalogens `walk`, f.eks. stupebrettet): en stripe langs midten av
// gjenstanden, fra bakenden til tuppen, med et trinn bak (`climb` m der flaten stiger fra gulvet til
// `top`). Gange og kollisjon (world/collision.js, view3d/walker.js) bruker høyden herfra. Ren logikk.
import { OBJECTS } from './object-catalog.js';
import { FACING, poser } from './object-pose.js';

/** Stripene i rommet: { x, z, fx, fz, len, half, y, top, climb, spring } (midtpunkt, retning fram, …). */
function strips(level) {
  const out = [];
  let pose = null;
  for (const o of level.objects ?? []) {
    const walk = OBJECTS[o.id]?.walk;
    if (!walk) continue;
    pose ??= poser(level);
    const p = pose(o);
    const [fx, fz] = FACING[p.rot];
    out.push({ x: p.x, z: p.z, fx, fz, len: fx ? p.w : p.d, half: walk.width / 2, y: p.y, top: walk.top, climb: walk.climb ?? 0, spring: !!walk.spring });
  }
  return out;
}

/** Avstand fra bakenden langs stripen (u) og ut til siden (v) for punktet (x, z). */
function local(s, x, z) {
  const dx = x - s.x;
  const dz = z - s.z;
  return [dx * s.fx + dz * s.fz + s.len / 2, Math.abs(dx * s.fz - dz * s.fx)];
}

/** Høyden på stripen u meter fra bakenden (over gulvet gjenstanden står på). */
const heightAt = (s, u) => (u < s.climb ? (s.top * u) / s.climb : s.top);

/**
 * Den høyeste gangflaten under punktet (x, z) som ikke ligger høyere enn `reach`, som
 * { y, spring } – eller null. spring: et stupebrett (man hopper høyere fra det).
 */
export function objectGround(level, x, z, reach = Infinity) {
  let best = null;
  if (!level.objects?.length) return best;
  for (const s of strips(level)) {
    const [u, v] = local(s, x, z);
    if (u < 0 || u > s.len || v > s.half) continue;
    const y = s.y + heightAt(s, u);
    if (y <= reach && (!best || y > best.y)) best = { y, spring: s.spring };
  }
  return best;
}

/**
 * Bokser [x0, z0, x1, z1] for den delen av gangflatene i ruten (cx, cz) som ligger for høyt til å gå
 * rett opp på fra høyden base (mer enn stepUp over). Er man over flaten, eller den over hodet, er
 * den ingen hindring.
 */
export function walkBlockers(level, cx, cz, base, stepUp, body) {
  const out = [];
  if (!level.objects?.length) return out;
  for (const s of strips(level)) {
    if (s.y + s.top <= base + stepUp || s.y >= base + body) continue;
    const rise = base + stepUp - s.y; // høyeste del av trinnet man kommer opp på
    const u0 = rise <= 0 ? 0 : (s.climb * rise) / s.top;
    // Hjørnene i verden: bakenden + fram u, ± til siden.
    const px = -s.fz;
    const pz = s.fx;
    const at = (u, v) => [s.x + s.fx * (u - s.len / 2) + px * v, s.z + s.fz * (u - s.len / 2) + pz * v];
    const [ax, az] = at(u0, -s.half);
    const [bx, bz] = at(s.len, s.half);
    const box = [Math.min(ax, bx), Math.min(az, bz), Math.max(ax, bx), Math.max(az, bz)];
    if (box[0] < cx + 1 && box[2] > cx && box[1] < cz + 1 && box[3] > cz) out.push(box);
  }
  return out;
}
