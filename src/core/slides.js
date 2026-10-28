// Vannsklier: objekter oppå rutenettet. En sklie er { points: [[x, z], …], tube, color, drop } – ruter fra
// toppen (på et hevet gulv) til bunnen (over vann). Med drop starter den i etasjen over (core/slide-drops.js):
// toppen er gulvet der oppe, og sklien lagres i etasjen med bassenget. Banen glattes med Catmull-Rom gjennom
// rutemidtene, med rett/flatt innløp før fallet fra plattformen til litt over vannflaten.
// Sklier endres aldri på stedet: legg til / fjern ved å lage en ny liste (angre sammenligner
// referanser). Ren logikk.
import { TILE, getTile, WATER_SURFACE, HEIGHT_MAX } from './level.js';
import { topFloorAt, ceilingAt, groundAt, SLAB } from './heights.js';
import { slideCurve, blur, ease } from './slide-curve.js';
import { launchLength } from './slide-launch.js';
import { pillarsTouchBox } from './pillars.js';

export const SLIDE = Object.freeze({
  RADIUS: 0.45, // rennens indre radius
  EXIT: WATER_SURFACE + 0.3, // bunnen av rennen ved utløpet
  MIN_START: 1, // laveste startgulv
  STEP: 0.2, // avstand mellom punktene langs banen
  ENTRY: 1, // de første metrene er inngang (ingen kollisjon der)
  LAUNCH: 1.2, // kort, rett og vannrett innløp; forlenges til rennen er klar av plattformen
  LIP: 0.03, // 3 cm over gulvet, så rennebunnen ikke flimrer mot platåflaten
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

/**
 * Hva som er galt med en sklie langs `points` (engelsk tekst for brukeren), eller null.
 * drop: sklien starter i etasjen over, så startruten her er ikke en plattform (den lages av core/slide-drops.js).
 */
export function slideProblem(level, points, drop = false) {
  if (points.length < 2) return 'Drag from a raised floor down to the water.';
  for (const [x, z] of drop ? points.slice(1) : points) {
    const t = getTile(level, x, z);
    if (t === TILE.WALL || t === TILE.PILLAR || t === TILE.DOOR || pillarsTouchBox(level, [x, z, x + 1, z + 1])) return 'A wall, pillar or door is in the way.';
  }
  const [sx, sz] = points[0];
  const [ex, ez] = points[points.length - 1];
  if (!drop && (getTile(level, sx, sz) === TILE.WATER || topFloorAt(level, sx, sz) < SLIDE.MIN_START)) return 'A slide must start on a floor raised at least 1 m.';
  if (getTile(level, ex, ez) !== TILE.WATER) return 'A slide must end over water.';
  return null;
}

const cache = new WeakMap();

/**
 * Banen til en sklie: { problem, length, launch, h0, h1, tube, color, samples, supports }.
 * samples[i] = { x, y, z, s, t: [tx, ty, tz] (enhetstangent), side: [nx, nz] (venstre, vannrett), bank }
 * y er bunnen av rennen. supports = [{ x, z, y0, y1 }] (støtteben fra bakken opp til rennen).
 */
export function slidePath(level, slide) {
  let problem = slideProblem(level, slide.points, slide.drop);
  const [sx, sz] = slide.points[0];
  // Fra etasjen over: minst over taket her (i etasjene slik de gås i ligger startruten på gulvet der oppe).
  const h0 = slide.drop ? Math.max(topFloorAt(level, sx, sz), level.height + SLAB) : topFloorAt(level, sx, sz);
  const pts = slideCurve(slide, SLIDE.STEP, SLIDE.LAUNCH);
  const length = pts[pts.length - 1][2];
  const launch = problem ? Math.min(SLIDE.LAUNCH, length * 0.4)
    : launchLength(level, pts, h0, SLIDE.LAUNCH, SLIDE.RADIUS + 0.1, SLIDE.STEP);
  const key = `${h0}|${problem}|${launch}`;
  const hit = cache.get(slide);
  if (hit && hit.key === key) return hit.path;
  const h1 = SLIDE.EXIT;
  if (!problem && length - launch < 0.6) problem = 'The slide needs more room after the platform.';
  if (!problem && (h0 - h1) / Math.max(length, 1e-6) < MIN_SLOPE) problem = 'The slide is too long for its height.';
  const top = h0 + SLIDE.LIP;
  const yAt = (s) => top + (h1 - top) * ease((s - launch) / Math.max(length - launch, 1e-6));
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
  blur(blur(raw, 5), 5).forEach((k, i) => (samples[i].bank = Math.max(-0.3, Math.min(0.3, k * 0.35)) * ease((samples[i].s - launch) / 1.2)));
  const supports = [];
  for (let s = SLIDE.ENTRY; s < length - 0.5; s += SLIDE.SUPPORT_EVERY) {
    const p = samples[Math.min(samples.length - 1, Math.round(s / SLIDE.STEP))];
    const g = groundAt(level, p.x, p.z);
    if (p.y - g > 0.3) supports.push({ x: p.x, z: p.z, y0: g, y1: p.y - 0.06 });
  }
  const path = { problem, length, launch, h0, h1, tube: !!slide.tube, color: colorOf(slide.color), samples, supports };
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
export function addSlide(level, points, tube = false, color = DEFAULT_SLIDE_COLOR, drop = false) {
  if (level.slides.length >= SLIDE.MAX_SLIDES || points.length < 2) return 0;
  const slide = { points: points.slice(0, SLIDE.MAX_POINTS).map(([x, z]) => [x, z]), tube: !!tube, color: colorOf(color), ...(drop ? { drop: true } : {}) };
  level.slides = [...level.slides, slide];
  const path = slidePath(level, slide);
  // En sklie fra etasjen over får plass i trapperommet core/slide-drops.js lager (ikke her: høyere tak
  // ville løftet etasjen over, som igjen ville gjort sklien høyere).
  if (!path.problem && !drop) {
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
