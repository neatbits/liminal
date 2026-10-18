// Vannsklier: objekter oppå rutenettet. En sklie er { points: [[x, z], …], tube, color } – ruter fra
// toppen (på et hevet gulv) til bunnen (over vann). Banen glattes med Catmull-Rom gjennom
// rutemidtene, og høyden faller jevnt fra startgulvet til litt over vannflaten.
// Sklier endres aldri på stedet: legg til / fjern ved å lage en ny liste (angre sammenligner
// referanser). Ren logikk.
import { TILE, getTile, WATER_SURFACE, HEIGHT_MAX } from './level.js';
import { topFloorAt, ceilingAt, groundAt } from './heights.js';

export const SLIDE = Object.freeze({
  RADIUS: 0.45, // rennens indre radius
  EXIT: WATER_SURFACE + 0.3, // bunnen av rennen ved utløpet
  MIN_START: 1, // laveste startgulv
  STEP: 0.2, // avstand mellom punktene langs banen
  ENTRY: 1, // de første metrene er inngang (ingen kollisjon der)
  CLEARANCE: 1.5, // takhøyde over bunnen av rennen
  SUPPORT_EVERY: 2.5,
  MAX_SLIDES: 32,
  MAX_POINTS: 400,
});
const MIN_SLOPE = 0.05;

/** Fargene en sklie kan ha: utside, innside (glitrer som vannfilm) og farge i skissen. */
export const SLIDE_COLORS = {
  blue: { outer: '#2f7fc0', inner: '#7ab8e6', plan: '#2f7fc0' },
  red: { outer: '#c8443a', inner: '#ea8378', plan: '#c8443a' },
  green: { outer: '#3c9a58', inner: '#7acb93', plan: '#3c9a58' },
  white: { outer: '#f2f2ee', inner: '#d9eef2', plan: '#7fb6c8' },
};
export const DEFAULT_SLIDE_COLOR = 'blue';
const colorOf = (c) => (SLIDE_COLORS[c] ? c : DEFAULT_SLIDE_COLOR);

/** Hva som er galt med en sklie langs `points` (engelsk tekst for brukeren), eller null. */
export function slideProblem(level, points) {
  if (points.length < 2) return 'Drag from a raised floor down to the water.';
  for (const [x, z] of points) {
    const t = getTile(level, x, z);
    if (t === TILE.WALL || t === TILE.PILLAR || t === TILE.DOOR) return 'A wall, pillar or door is in the way.';
  }
  const [sx, sz] = points[0];
  const [ex, ez] = points[points.length - 1];
  if (getTile(level, sx, sz) === TILE.WATER || topFloorAt(level, sx, sz) < SLIDE.MIN_START) return 'A slide must start on a floor raised at least 1 m.';
  if (getTile(level, ex, ez) !== TILE.WATER) return 'A slide must end over water.';
  return null;
}

/** Tett polylinje gjennom rutemidtene (uniform Catmull-Rom, endene doblet). */
function smooth(points) {
  const c = points.map(([x, z]) => [x + 0.5, z + 0.5]);
  const P = (i) => c[Math.max(0, Math.min(c.length - 1, i))];
  const out = [];
  for (let i = 0; i < c.length - 1; i++) {
    const [p0, p1, p2, p3] = [P(i - 1), P(i), P(i + 1), P(i + 2)];
    for (let k = 0; k < 8; k++) {
      const t = k / 8;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a, b, cc, d) => 0.5 * (2 * b + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - d) * t2 + (-a + 3 * b - 3 * cc + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(c[c.length - 1]);
  return out;
}

/** Punkter med fast avstand langs polylinjen: [[x, z, s], …]. */
function resample(line, step) {
  const out = [[line[0][0], line[0][1], 0]];
  let s = 0;
  let next = step;
  for (let i = 1; i < line.length; i++) {
    const [ax, az] = line[i - 1];
    const [bx, bz] = line[i];
    const d = Math.hypot(bx - ax, bz - az);
    while (d > 0 && next <= s + d) {
      const f = (next - s) / d;
      out.push([ax + (bx - ax) * f, az + (bz - az) * f, next]);
      next += step;
    }
    s += d;
  }
  const last = line[line.length - 1];
  if (s - out[out.length - 1][2] > 1e-3) out.push([last[0], last[1], s]);
  return out;
}

/** Jevner ut knekker (f.eks. fra diagonale ruter) ved å trekke hvert punkt mot naboene; endene står fast. */
function relax(pts, passes) {
  let p = pts.map(([x, z]) => [x, z]);
  for (let k = 0; k < passes; k++) {
    const q = p.map((v) => v.slice());
    for (let i = 1; i < p.length - 1; i++) {
      q[i][0] = (p[i - 1][0] + 2 * p[i][0] + p[i + 1][0]) / 4;
      q[i][1] = (p[i - 1][1] + 2 * p[i][1] + p[i + 1][1]) / 4;
    }
    p = q;
  }
  return p;
}

/** Glidende gjennomsnitt over ±r punkter (for krengingen). */
function blur(values, r) {
  return values.map((_, i) => {
    let sum = 0;
    let n = 0;
    for (let k = Math.max(0, i - r); k <= Math.min(values.length - 1, i + r); k++, n++) sum += values[k];
    return sum / n;
  });
}

const cache = new WeakMap();

/**
 * Banen til en sklie: { problem, length, h0, h1, tube, color, samples, supports }.
 * samples[i] = { x, y, z, s, t: [tx, ty, tz] (enhetstangent), side: [nx, nz] (venstre, vannrett), bank }
 * y er bunnen av rennen. supports = [{ x, z, y0, y1 }] (støtteben fra bakken opp til rennen).
 */
export function slidePath(level, slide) {
  let problem = slideProblem(level, slide.points);
  const [sx, sz] = slide.points[0];
  const h0 = topFloorAt(level, sx, sz);
  const key = `${h0}|${problem}`;
  const hit = cache.get(slide);
  if (hit && hit.key === key) return hit.path;
  const h1 = SLIDE.EXIT;
  const pts = resample(relax(resample(smooth(slide.points), SLIDE.STEP), 30), SLIDE.STEP);
  const length = pts[pts.length - 1][2];
  if (!problem && (h0 - h1) / Math.max(length, 1e-6) < MIN_SLOPE) problem = 'The slide is too long for its height.';
  const yAt = (s) => h1 + (h0 - h1) * Math.pow(1 - s / length, 1.25);
  const samples = pts.map(([x, z, s], i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const dy = yAt(b[2]) - yAt(a[2]);
    const len = Math.hypot(dx, dy, dz) || 1;
    const lh = Math.hypot(dx, dz) || 1;
    return { x, y: yAt(s), z, s, t: [dx / len, dy / len, dz / len], side: [dz / lh, -dx / lh], bank: 0 };
  });
  // Krenging i svingene: etter hvor fort retningen endrer seg, jevnet ut over ca. 2 m så
  // rennen ikke vrir seg fram og tilbake.
  const raw = samples.map((_, i) => {
    if (i === 0 || i === samples.length - 1) return 0;
    const [a, b] = [samples[i - 1].side, samples[i + 1].side];
    return Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]) / (2 * SLIDE.STEP);
  });
  blur(blur(raw, 5), 5).forEach((k, i) => (samples[i].bank = Math.max(-0.3, Math.min(0.3, k * 0.35))));
  const supports = [];
  for (let s = SLIDE.ENTRY; s < length - 0.5; s += SLIDE.SUPPORT_EVERY) {
    const p = samples[Math.min(samples.length - 1, Math.round(s / SLIDE.STEP))];
    const g = groundAt(level, p.x, p.z);
    if (p.y - g > 0.3) supports.push({ x: p.x, z: p.z, y0: g, y1: p.y - 0.06 });
  }
  const path = { problem, length, h0, h1, tube: !!slide.tube, color: colorOf(slide.color), samples, supports };
  cache.set(slide, { key, path });
  return path;
}

const colliderCache = new WeakMap();

/**
 * Hindringer for spilleren: rennebiter og støtteben som 2D-linjestykker med halv bredde og
 * høydespenn: [{ ax, az, bx, bz, hw, bottom, top }]. Inngangen (SLIDE.ENTRY) er fri.
 */
export function slideColliders(level) {
  const paths = level.slides.map((s) => slidePath(level, s)).filter((p) => !p.problem);
  const hit = colliderCache.get(level.slides);
  if (hit && hit.paths.length === paths.length && hit.paths.every((p, i) => p === paths[i])) return hit.list;
  const list = [];
  const hw = SLIDE.RADIUS + 0.1;
  for (const p of paths) {
    const rise = p.tube ? 2 * SLIDE.RADIUS : SLIDE.RADIUS * 1.3;
    for (let i = 0; i < p.samples.length - 1; i++) {
      const [a, b] = [p.samples[i], p.samples[i + 1]];
      if (b.s <= SLIDE.ENTRY) continue;
      const lo = Math.min(a.y, b.y);
      list.push({ ax: a.x, az: a.z, bx: b.x, bz: b.z, hw, bottom: lo - 0.06, top: Math.max(a.y, b.y) + rise });
    }
    for (const s of p.supports) list.push({ ax: s.x, az: s.z, bx: s.x, bz: s.z, hw: 0.06, bottom: s.y0, top: s.y1 });
  }
  colliderCache.set(level.slides, { paths, list });
  return list;
}

/** Sklien man står ved toppen av (innenfor 0,55 m av starten, på samme høyde), eller null. */
export function slideEntry(level, x, z, feet) {
  for (const slide of level.slides) {
    const p = slidePath(level, slide);
    if (p.problem) continue;
    const s = p.samples[0];
    if (Math.hypot(x - s.x, z - s.z) < 0.55 && Math.abs(feet - s.y) < 0.5) return p;
  }
  return null;
}

/** Legger til en sklie (ny liste) og løfter taket der rennen trenger plass. */
export function addSlide(level, points, tube = false, color = DEFAULT_SLIDE_COLOR) {
  if (level.slides.length >= SLIDE.MAX_SLIDES || points.length < 2) return 0;
  const slide = { points: points.slice(0, SLIDE.MAX_POINTS).map(([x, z]) => [x, z]), tube: !!tube, color: colorOf(color) };
  level.slides = [...level.slides, slide];
  const path = slidePath(level, slide);
  if (!path.problem) {
    // Rutene der rennen ikke får plass løftes alle til samme høyde (én sone, ikke en trapp).
    const low = [];
    let need = 0;
    for (const p of path.samples) {
      const x = Math.floor(p.x);
      const z = Math.floor(p.z);
      if (ceilingAt(level, x, z) >= p.y + SLIDE.CLEARANCE - 1e-6) continue;
      low.push(z * level.w + x);
      need = Math.max(need, p.y + SLIDE.CLEARANCE);
    }
    const dm = Math.round(Math.min(HEIGHT_MAX, Math.ceil(need * 10) / 10) * 10);
    for (const i of low) level.ceilings[i] = Math.max(level.ceilings[i], dm);
  }
  return 1;
}

/** Indeksen til skliene som går over ruten (x, z). */
export function slidesAt(level, x, z) {
  const out = [];
  level.slides.forEach((s, i) => {
    if (s.points.some(([px, pz]) => px === x && pz === z)) out.push(i);
  });
  return out;
}

/** Fjerner skliene som går over ruten (x, z). Returnerer antall. */
export function removeSlidesAt(level, x, z) {
  const hit = slidesAt(level, x, z);
  if (hit.length) level.slides = level.slides.filter((_, i) => !hit.includes(i));
  return hit.length;
}
