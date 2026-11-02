// Heisene i 3D (core/elevators.js), det som står stille: metallpaneler inne i vognen med håndlist, karm rundt døren,
// knappepanel ute og inne og en plate over døren til etasjelampene. Rekkverkets (metall) materiale. Dørbladene og
// lampene beveger seg og lyser, og lages i world/lift-doors.js med de samme målene. Ren logikk – MeshData med bakt lys.
import { faceQuad, orientedBox } from './mesher.js';

export const LIFT = {
  DOOR_H: 2.1, // døråpningen
  LEAF: [0.06, 0.1], // dørbladene: så langt inn i døråpningen fra reposet (v)
  CALL: [3.15, 1.05], // knappen ute: midt på (u) og høyden
  PANEL: [1.3, 1.2], // panelet inne, på sideveggen ved døren: v og høyden (midt på)
  IN: 0.02, // panelene inne står så langt inn fra veggen
  SIGN: 2.3, // etasjelampene over døren
};

/** Lysstyrken (luminans) av en lineær farge. */
export const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/**
 * Lysfeltet uten temaets lysfarge (samme styrke, grått), så heisen ikke blir gul i Level 0 og blå i Poolrooms.
 * Blinkekanalene er tall; fargen de får i skyggeleggeren, nøytraliseres i materialet (world/world-materials.js).
 */
export function neutralField(field) {
  return field && { sample: (...a) => { const s = field.sample(...a); const l = luma(s[0], s[1], s[2]); return [l, l, l, s[3], s[4], s[5], s[6]]; } };
}

/**
 * Heisens eget system: P(u, v, y) → [x, y, z] med u langs døren (0–4) og v innover fra reposet (0 = utsiden av
 * dørveggen, 1 = vognen begynner, 3 = bakveggen). U og V er enhetsvektorene i x/z.
 */
export function liftFrame({ x, z, dir, floor }) {
  const at = (u, v) => (dir === 0 ? [x + u, z + v] : dir === 2 ? [x + 4 - u, z + 4 - v] : dir === 1 ? [x + 4 - v, z + u] : [x + v, z + 4 - u]);
  const o = at(0, 0);
  const [a, b] = [at(1, 0), at(0, 1)];
  return {
    P: (u, v, y) => { const [px, pz] = at(u, v); return [px, floor + y, pz]; },
    at,
    U: [a[0] - o[0], a[1] - o[1]],
    V: [b[0] - o[0], b[1] - o[1]],
  };
}

/** En flat plate i heisens system: fra (u0, v0) til (u1, v1) i grunnriss, y0–y1, med normalen n (i x/z). */
function plate(mesh, F, [u0, v0], [u1, v1], y0, y1, n) {
  faceQuad(mesh, [F.P(u0, v0, y0), F.P(u1, v1, y0), F.P(u1, v1, y1), F.P(u0, v0, y1)], [n[0], 0, n[1]]);
}

/**
 * Det som står stille i heisene i etasjen (level.lifts): metallet i `mesh` og gulvet i vognen i `floorMesh`. Vognen og
 * døråpningen er kledd helt innvendig (vegger, tak, gulv og kanten over døren), så heisen ser lik ut i alle etasjer –
 * temaet i etasjen synes ikke inne i den.
 */
export function buildLifts(level, mesh, floorMesh = mesh) {
  for (const lift of level.lifts ?? []) {
    const F = liftFrame(lift);
    const head = lift.head - lift.floor;
    const [U, V] = [F.U, F.V];
    const neg = (d) => [-d[0], -d[1]];
    const { IN } = LIFT;
    const y = (h) => lift.floor + h; // orientedBox tar høyden i verden
    // Panelene inne i vognen: sidene og bakveggen, med en håndlist langs bakveggen.
    plate(mesh, F, [1 + IN, 1], [1 + IN, 3 - IN], 0, head, U);
    plate(mesh, F, [3 - IN, 1], [3 - IN, 3 - IN], 0, head, neg(U));
    plate(mesh, F, [1 + IN, 3 - IN], [3 - IN, 3 - IN], 0, head, neg(V));
    orientedBox(mesh, F.at(1.15, 2.92), U, 1.7, V, -0.04, 0, y(0.88), y(0.92));
    // Tak, gulv og kanten over døren inne i vognen; sidene, taket og terskelen i døråpningen (bak dørbladene).
    const flat = (m, [u0, v0], [u1, v1], h, up) => faceQuad(m, [F.P(u0, v0, h), F.P(u1, v0, h), F.P(u1, v1, h), F.P(u0, v1, h)], [0, up ? 1 : -1, 0]);
    flat(mesh, [1, 1], [3, 3], head - 0.01, false);
    flat(floorMesh, [1, 1], [3, 3], 0.006, true);
    plate(mesh, F, [1, 1 + IN], [3, 1 + IN], LIFT.DOOR_H, head, V);
    const back = LIFT.LEAF[1];
    plate(mesh, F, [1 + IN, back], [1 + IN, 1], 0, LIFT.DOOR_H, U);
    plate(mesh, F, [3 - IN, back], [3 - IN, 1], 0, LIFT.DOOR_H, neg(U));
    flat(mesh, [1, 0], [3, 1], LIFT.DOOR_H - 0.01, false);
    flat(mesh, [1, 0], [3, 1], 0.006, true);
    // Karmen rundt døren ute, litt ut fra veggen.
    for (const u of [0.92, 3]) orientedBox(mesh, F.at(u, 0), U, 0.08, V, -0.03, 0, y(0), y(LIFT.DOOR_H + 0.08));
    orientedBox(mesh, F.at(0.92, 0), U, 2.16, V, -0.03, 0, y(LIFT.DOOR_H), y(LIFT.DOOR_H + 0.08));
    // Knappepanelet ute (ved siden av karmen), panelet inne og platen til etasjelampene over døren.
    orientedBox(mesh, F.at(LIFT.CALL[0] - 0.07, 0), U, 0.14, V, -0.02, 0, y(LIFT.CALL[1] - 0.14), y(LIFT.CALL[1] + 0.14));
    const n = lift.stops.length;
    orientedBox(mesh, F.at(3 - IN, LIFT.PANEL[0] - 0.12), V, 0.24, neg(U), 0, 0.02, y(LIFT.PANEL[1] - n * 0.05 - 0.08), y(LIFT.PANEL[1] + n * 0.05 + 0.08));
    orientedBox(mesh, F.at(2 - n * 0.06 - 0.06, 0), U, n * 0.12 + 0.12, V, -0.02, 0, y(LIFT.SIGN - 0.07), y(LIFT.SIGN + 0.07));
  }
}

/**
 * Dørbladene lukket, [venstre, høyre]: { mesh, slide } – slide = [dx, dz] dit bladet skyves helt åpent (inn i
 * veggen ved siden av, der det ikke synes).
 */
export function liftLeaves(lift, makeMesh) {
  const F = liftFrame(lift);
  return [[1, -1], [2, 1]].map(([u, side]) => {
    const mesh = makeMesh();
    orientedBox(mesh, F.at(u, LIFT.LEAF[0]), F.U, 1, F.V, 0, LIFT.LEAF[1] - LIFT.LEAF[0], lift.floor, lift.floor + LIFT.DOOR_H);
    return { mesh, slide: [F.U[0] * side * 0.96, F.U[1] * side * 0.96] };
  });
}

/** Hvor lampene sitter ([x, y, z]): knappen ute, etasjelampene over døren og knappene inne (nederste etasje først). */
export function liftLamps(lift) {
  const F = liftFrame(lift);
  const n = lift.stops.length;
  const mid = (i) => i - (n - 1) / 2;
  return {
    call: F.P(LIFT.CALL[0], -0.025, LIFT.CALL[1]),
    sign: lift.stops.map((_, i) => F.P(2 + mid(i) * 0.12, -0.025, LIFT.SIGN)),
    panel: lift.stops.map((_, i) => F.P(3 - LIFT.IN - 0.025, LIFT.PANEL[0], LIFT.PANEL[1] + mid(i) * 0.1)),
  };
}
