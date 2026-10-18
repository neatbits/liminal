// Samler firkanter (quads) med bakt lys i vanlige tall-arrays. Uavhengig av three.js.

const FULL = [1, 1, 1, 1];
const UNLIT = [1, 1, 1, 0, 0, 0, 0];

export class MeshData {
  /** @param field lysfelt fra createLightField, eller null for konstant lys (1). */
  constructor(field = null) {
    this.field = field;
    this.pos = [];
    this.uv = [];
    this.light = [];
    this.flick = [];
    this.index = [];
    this.vertexCount = 0;
  }

  get quadCount() {
    return this.vertexCount / 4;
  }

  /**
   * Hjørnene a, b, c, d er [x, y, z, u, v] i mot-klokken rekkefølge sett fra forsiden
   * (nede-venstre, nede-høyre, oppe-høyre, oppe-venstre).
   * @param n  normal [nx, ny, nz] (aksejustert)
   * @param ao skyggefaktor per hjørne
   * @param normals valgfri normal per hjørne for lyset (runde flater), ellers n
   */
  quad(a, b, c, d, n, ao = FULL, normals = null) {
    const base = this.vertexCount;
    const corners = [a, b, c, d];
    for (let k = 0; k < 4; k++) {
      const v = corners[k];
      this.pos.push(v[0], v[1], v[2]);
      this.uv.push(v[3], v[4]);
      const m = normals ? normals[k] : n;
      const s = this.field ? this.field.sample(v[0], v[1], v[2], m[0], m[1], m[2]) : UNLIT;
      const o = ao[k];
      this.light.push(s[0] * o, s[1] * o, s[2] * o);
      this.flick.push(s[3] * o, s[4] * o, s[5] * o, s[6] * o);
    }
    this.index.push(base, base + 1, base + 2, base, base + 2, base + 3);
    this.vertexCount += 4;
  }

  /**
   * Loddrett veggstripe fra (Lx,Lz) til (Rx,Rz), delt opp i høyden for jevnere lys
   * og mørkere kanter mot gulv og tak.
   * @param ends [aoVenstre, aoHøyre] for innvendige hjørner
   * @param edges { bottom, top } – om kanten møter gulv/tak (gir skygge)
   * @param vBase gulvhøyden veggen står på: v = y − vBase, så gulvlist og brystning følger gulvet
   */
  wall(Lx, Lz, Rx, Rz, n, uL, uR, y0, y1, ends = [1, 1], edges = { bottom: true, top: true }, vBase = 0) {
    if (y1 - y0 < 1e-4) return;
    const ys = heightLevels(y0, y1);
    const aoAt = (y) => {
      let f = 1;
      if (edges.bottom && y === y0) f -= 0.22;
      if (edges.top && y === y1) f -= 0.15;
      return f;
    };
    for (let k = 0; k < ys.length - 1; k++) {
      const ya = ys[k];
      const yb = ys[k + 1];
      const fa = aoAt(ya);
      const fb = aoAt(yb);
      this.quad(
        [Lx, ya, Lz, uL, ya - vBase],
        [Rx, ya, Rz, uR, ya - vBase],
        [Rx, yb, Rz, uR, yb - vBase],
        [Lx, yb, Lz, uL, yb - vBase],
        n,
        [fa * ends[0], fa * ends[1], fb * ends[1], fb * ends[0]],
      );
    }
  }
}

/** Høydenivåer for en veggstripe: tette rader nær gulv/tak, ellers ca. 0,9 m. */
export function heightLevels(y0, y1) {
  const span = y1 - y0;
  if (span <= 0.8) return [y0, y1];
  const lo = y0 + 0.3;
  const hi = y1 - 0.3;
  const steps = Math.max(1, Math.round((hi - lo) / 0.9));
  const out = [y0, lo];
  for (let i = 1; i < steps; i++) out.push(lo + ((hi - lo) * i) / steps);
  out.push(hi, y1);
  return out;
}

const UV = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

/**
 * Firkant der omløpet rettes etter normalen n. p = fire punkter [x, y, z] i rekkefølge rundt
 * kanten, uv = tilhørende teksturkoordinater. normals (valgfri) gir lyset per hjørne, for
 * runde flater som skal se glatte ut.
 */
export function faceQuad(mesh, p, n, uv = UV, normals = null) {
  const e1 = [p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]];
  const e2 = [p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]];
  const c = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
  const order = c[0] * n[0] + c[1] * n[1] + c[2] * n[2] < 0 ? [0, 3, 2, 1] : [0, 1, 2, 3];
  const v = order.map((k) => [...p[k], ...uv[k]]);
  mesh.quad(v[0], v[1], v[2], v[3], n, undefined, normals && order.map((k) => normals[k]));
}
