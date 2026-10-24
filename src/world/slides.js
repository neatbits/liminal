// Vannsklier i 3D: åpen renne (U-profil) eller lukket rør langs banen fra slidePath, med
// krenging i svingene og støtteben ned til gulv eller bassengbunn. Starten er en avrundet balje
// med høyere sider og et håndtak av stål over, som på ekte vannsklier.
// Røret er åpent ved inngangen; taket begynner med en hel bue uten en spiss i toppen. Lyset bakes per hjørne
// med rundingens egen normal, så rennen ser glatt ut. Ren logikk – MeshData med bakt lys
// (sklien kaster ikke skygge).
import { SLIDE, SLIDE_COLORS, slidePath } from '../core/slides.js';
import { MeshData, faceQuad } from './mesher.js';
import { orientedBox } from './mesher.js';
import { buildShell, WALL, SEGMENTS, TUBE_START } from './slide-shell.js';

const OPEN = (105 * Math.PI) / 180; // rennens åpning: ±105° fra bunnen
const LEG = 0.08;
const START_SPAN = (122 * Math.PI) / 180; // høyere sider ved starten …
const START_LEN = 1.3; // … som slakker av til vanlig renne over så mange meter
const BOWL = 7; // ringer i baljen bak starten
const BAR = { height: 0.36, back: 0.15, thick: 0.045 }; // håndtaket over starten

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

const smooth = (f) => f * f * (3 - 2 * f);

/** Profilens konvolutt: høyere sider ved starten, renne, eller lukket rør etter inngangen. */
export function spanAt(tube, s) {
  const start = s < START_LEN ? OPEN + (START_SPAN - OPEN) * smooth(1 - s / START_LEN) : OPEN;
  return tube && s >= TUBE_START ? Math.PI : start;
}

/**
 * Baljen bak starten: den ene halvdelen av profilet dreies 180° rundt en loddrett akse gjennom
 * senteret, så rennen ender rundt som et badekar – kanten er like høy hele veien rundt.
 * Retningen ut fra senteret ved profilvinkel a (0 = bunnen) og dreining psi (0 = høyre side,
 * π/2 = rett bak, π = venstre side).
 */
function bowlDir(f, back, a, psi) {
  const r = Math.sin(a);
  return norm(add(add(f.side.map((v) => v * r * Math.cos(psi)), back, r * Math.sin(psi)), f.up, -Math.cos(a)));
}

function bowl(mesh, f, t, span) {
  const R = SLIDE.RADIUS;
  const back = t.map((v) => -v);
  const A = SEGMENTS / 2;
  for (let k = 0; k < BOWL * 2; k++) {
    const [p0, p1] = [(k / (BOWL * 2)) * Math.PI, ((k + 1) / (BOWL * 2)) * Math.PI];
    for (let j = 0; j < A; j++) {
      const [a0, a1] = [(span * j) / A, (span * (j + 1)) / A];
      const dirs = [[a0, p0], [a1, p0], [a1, p1], [a0, p1]].map(([a, psi]) => bowlDir(f, back, a, psi));
      const pts = (r) => dirs.map((d) => add(f.centre, d, r));
      const mid = norm(dirs.reduce((sum, d) => add(sum, d), [0, 0, 0]));
      faceQuad(mesh.slideIn, pts(R), mid.map((v) => -v), undefined, dirs.map((d) => d.map((v) => -v)));
      faceQuad(mesh.slideOut, pts(R + WALL), mid, undefined, dirs);
    }
    // Kanten øverst rundt baljen.
    const [d0, d1] = [bowlDir(f, back, span, p0), bowlDir(f, back, span, p1)];
    faceQuad(mesh.slideOut, [add(f.centre, d0, R), add(f.centre, d0, R + WALL), add(f.centre, d1, R + WALL), add(f.centre, d1, R)], f.up);
  }
}

/** Håndtaket over starten: to stolper på kanten av baljen, litt bak startpunktet, og en stang på tvers. */
function grabBar(legs, f, t, span) {
  const back = t.map((v) => -v);
  const rim = (R) => Math.sin(span) * R; // kantens avstand fra aksen
  const psi = Math.asin(Math.min(1, BAR.back / rim(SLIDE.RADIUS + WALL / 2)));
  const ends = [Math.PI - psi, psi].map((q) => add(f.centre, bowlDir(f, back, span, q), SLIDE.RADIUS + WALL / 2));
  const top = Math.max(ends[0][1], ends[1][1]) + BAR.height;
  const u = norm([f.side[0], 0, f.side[2]]);
  const flat = norm([back[0], 0, back[2]]);
  const [across, along] = [[u[0], u[2]], [flat[0], flat[2]]];
  const k = BAR.thick / 2;
  const corner = (e) => [e[0] - u[0] * k - flat[0] * k, e[2] - u[2] * k - flat[2] * k];
  for (const e of ends) orientedBox(legs, corner(e), across, BAR.thick, along, 0, BAR.thick, e[1], top);
  const [l, r] = ends;
  orientedBox(legs, corner(l), across, Math.hypot(r[0] - l[0], r[2] - l[2]) + BAR.thick, along, 0, BAR.thick, top - BAR.thick, top);
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
    buildShell(
      mesh,
      frames,
      path.samples.map((p) => spanAt(false, p.s)),
      path.tube ? path.samples.findIndex((p) => p.s >= TUBE_START) : -1,
    );
    const span0 = spanAt(path.tube, 0);
    bowl(mesh, frames[0], path.samples[0].t, span0);
    grabBar(out.slideLeg, frames[0], path.samples[0].t, span0);
    for (const s of path.supports) {
      orientedBox(out.slideLeg, [s.x - LEG / 2, s.z - LEG / 2], [1, 0], LEG, [0, 1], 0, LEG, s.y0, s.y1);
    }
  }
  return out;
}
