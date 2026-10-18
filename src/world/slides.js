// Vannsklier i 3D: åpen renne (U-profil) eller lukket rør langs banen fra slidePath, med
// krenging i svingene, endelokk på toppen og støtteben ned til gulv eller bassengbunn.
// Røret er åpent de første metrene (inngangen) og lukker seg så. Lyset bakes per hjørne
// med rundingens egen normal, så rennen ser glatt ut. Ren logikk – MeshData med bakt lys
// (sklien kaster ikke skygge).
import { SLIDE, SLIDE_COLORS, slidePath } from '../core/slides.js';
import { MeshData, faceQuad } from './mesher.js';
import { orientedBox } from './doors.js';

const WALL = 0.05; // godstykkelse
const OPEN = (105 * Math.PI) / 180; // rennens åpning: ±105° fra bunnen
const SEGMENTS = 22;
const LEG = 0.08;
const TUBE_FROM = SLIDE.ENTRY - 0.3; // røret lukker seg mellom TUBE_FROM og ENTRY + 0.3
const TUBE_TO = SLIDE.ENTRY + 0.3;

const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const norm = (v) => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Rammen i et banepunkt: senteret i tverrsnittet og krenget side-/oppvektor. */
export function frameAt(p) {
  const side0 = [p.side[0], 0, p.side[1]];
  const up0 = norm(cross(p.t, side0));
  const up1 = up0[1] < 0 ? up0.map((v) => -v) : up0;
  const c = Math.cos(p.bank);
  const s = Math.sin(p.bank);
  const side = add(side0.map((v) => v * c), up1, s);
  const up = add(up1.map((v) => v * c), side0, -s);
  return { side, up, centre: add([p.x, p.y, p.z], up, SLIDE.RADIUS) };
}

/** Retningen ut fra senteret ved vinkel a (0 = rett ned mot bunnen). */
const outward = (f, a) => norm(add(f.side.map((v) => v * Math.sin(a)), f.up, -Math.cos(a)));
const ring = (f, a, r) => add(f.centre, outward(f, a), r);

/** Hvor langt rundt profilet går ved buelengden s: renne, eller rør etter inngangen. */
function spanAt(tube, s) {
  if (!tube || s <= TUBE_FROM) return OPEN;
  const f = Math.min(1, (s - TUBE_FROM) / (TUBE_TO - TUBE_FROM));
  return OPEN + (Math.PI - OPEN) * f * f * (3 - 2 * f);
}

function shell(out, frames, spans) {
  const R = SLIDE.RADIUS;
  const angle = (i, j) => -spans[i] + (2 * spans[i] * j) / SEGMENTS;
  for (let i = 0; i < frames.length - 1; i++) {
    for (let j = 0; j < SEGMENTS; j++) {
      const c = [
        [i, j],
        [i, j + 1],
        [i + 1, j + 1],
        [i + 1, j],
      ];
      const dirs = c.map(([fi, fj]) => outward(frames[fi], angle(fi, fj)));
      const pts = (r) => c.map(([fi, fj]) => ring(frames[fi], angle(fi, fj), r));
      const mid = norm(dirs.reduce((a, d) => add(a, d), [0, 0, 0]));
      faceQuad(out.slideIn, pts(R), mid.map((v) => -v), undefined, dirs.map((d) => d.map((v) => -v)));
      faceQuad(out.slideOut, pts(R + WALL), mid, undefined, dirs);
    }
    // Kanten øverst der rennen er åpen: fra innsiden til utsiden langs begge sider.
    if (spans[i] < Math.PI - 1e-3) {
      for (const sign of [-1, 1]) {
        const [a0, a1] = [sign * spans[i], sign * spans[i + 1]];
        const [f0, f1] = [frames[i], frames[i + 1]];
        const q = [ring(f0, a0, R), ring(f0, a0, R + WALL), ring(f1, a1, R + WALL), ring(f1, a1, R)];
        faceQuad(out.slideOut, q, norm(add(f0.up, f0.side, sign * 0.3)));
      }
    }
  }
}

/** Lokk bak på toppen (begge sider): vifte fra senteret til den åpne rennens kant. */
function cap(mesh, f, t) {
  const pts = Array.from({ length: SEGMENTS + 1 }, (_, j) => ring(f, -OPEN + (2 * OPEN * j) / SEGMENTS, SLIDE.RADIUS + WALL));
  pts.push(pts[0]);
  for (let j = 0; j < pts.length - 1; j++) {
    const q = [f.centre, pts[j], pts[j + 1], f.centre];
    faceQuad(mesh, q, t.map((v) => -v));
    faceQuad(mesh, q, t);
  }
}

/**
 * @returns MeshData per materiale: `slideIn_<farge>` og `slideOut_<farge>` (innside/utside for
 *          hver farge i SLIDE_COLORS) og `slideLeg` (støttebena)
 */
export function buildSlides(level, field) {
  const out = { slideLeg: new MeshData(field) };
  for (const c of Object.keys(SLIDE_COLORS)) {
    out[`slideIn_${c}`] = new MeshData(field);
    out[`slideOut_${c}`] = new MeshData(field);
  }
  for (const slide of level.slides) {
    const path = slidePath(level, slide);
    if (path.problem) continue;
    const frames = path.samples.map(frameAt);
    const mesh = { slideIn: out[`slideIn_${path.color}`], slideOut: out[`slideOut_${path.color}`] };
    shell(
      mesh,
      frames,
      path.samples.map((p) => spanAt(path.tube, p.s)),
    );
    cap(mesh.slideOut, frames[0], path.samples[0].t);
    for (const s of path.supports) {
      orientedBox(out.slideLeg, [s.x - LEG / 2, s.z - LEG / 2], [1, 0], LEG, [0, 1], 0, LEG, s.y0, s.y1);
    }
  }
  return out;
}
