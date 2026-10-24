// Statiske sidepaneler og avrundede håndløpere. Metalltrinnene animeres separat på GPU.
import { escalatorRuns } from '../core/escalators.js';
import { MeshData, faceQuad } from './mesher.js';
import { beam } from './railings.js';

export function escalatorPoint(run, t, s, y) {
  return [run.origin[0] + run.dir[0] * t + (run.dir[0] ? 0 : s), y,
    run.origin[1] + run.dir[1] * t + (run.dir[0] ? s : 0)];
}

export function buildEscalators(level, field) {
  const out = { escalatorPanel: new MeshData(field), escalatorRail: new MeshData(field), escalatorMetal: new MeshData(field), escalatorFloor: new MeshData(field) };
  for (const r of escalatorRuns(level)) {
    const P = (t, s, y) => escalatorPoint(r, t, s, y);
    const high = r.low + r.rise;
    // Trapperutene har ingen vanlig gulvflate. Det frie løpet trenger gulv under seg,
    // ellers ser man scenebakgrunnen gjennom et rektangulært hull når man ser ovenfra.
    for (let t = 0; t < r.length; t++) for (let s = 0; s < r.width; s++) {
      const points = [P(t, s, r.low), P(t + 1, s, r.low), P(t + 1, s + 1, r.low), P(t, s + 1, r.low)];
      faceQuad(out.escalatorFloor, points, [0, 1, 0], points.map((p) => [p[0], p[2]]));
    }
    // Lukket underside: trappen står fri over atriet, uten en massiv flislagt kile.
    beam(out.escalatorMetal, P(0, r.width / 2, r.low - 0.14), P(r.length, r.width / 2, high - 0.14), r.width, 0.25);
    for (const s of [0.065, r.width - 0.065]) {
      beam(out.escalatorPanel, P(0, s, r.low + 0.34), P(r.length, s, high + 0.34), 0.12, 1.05);
      beam(out.escalatorMetal, P(0, s, r.low - 0.06), P(r.length, s, high - 0.06), 0.15, 0.18);
      beam(out.escalatorRail, P(0, s, r.low + 0.9), P(r.length, s, high + 0.9), 0.14, 0.08);
      // Buet retur rundt endene, som på eldre kjøpesenterrulletrapper.
      for (const [t, y, sign] of [[0, r.low, -1], [r.length, high, 1]]) {
        for (let k = 0; k < 10; k++) {
          const arc = (angle, side) => P(t + sign * Math.sin(angle) * 0.36, side, y + 0.5 + Math.cos(angle) * 0.4);
          const a = k * Math.PI / 10, b = (k + 1) * Math.PI / 10;
          beam(out.escalatorRail, arc(a, s), arc(b, s), 0.14, 0.08);
          for (const side of [-1, 1]) {
            const q = s + side * 0.06;
            const n = r.dir[0] ? [0, 0, side] : [side, 0, 0];
            faceQuad(out.escalatorPanel, [P(t, q, y + 0.5 + Math.cos(a) * 0.4), arc(a, q), arc(b, q), P(t, q, y + 0.5 + Math.cos(b) * 0.4)], n);
          }
        }
      }
    }
    // Metallplater på reposene, lagt litt over gulvet for å unngå z-fighting.
    for (const [a, b, y] of [[-0.4, 0, r.low], [r.length, r.length + 0.4, high]]) {
      faceQuad(out.escalatorMetal, [P(a, 0.15, y + 0.018), P(b, 0.15, y + 0.018), P(b, r.width - 0.15, y + 0.018), P(a, r.width - 0.15, y + 0.018)], [0, 1, 0]);
    }
  }
  return out;
}

/** Trinn med attributter som lar vertexshaderen flytte hele trinn, uten CPU-oppdateringer. */
export function escalatorSteps(run, field) {
  const mesh = new MeshData(field);
  mesh.travel = [];
  const count = Math.max(1, Math.round(run.rise / 0.18));
  const pitch = run.length / count;
  const P = (t, s, y) => escalatorPoint(run, t, s, y);
  for (let k = 0; k <= count; k++) {
    const t = (k - 1) * pitch;
    const y0 = run.low + t * run.rise / run.length;
    const y1 = y0 + run.rise / count;
    const lo = 0.15, hi = run.width - 0.15;
    // quad() holder hjørnerekkefølgen, slik at travel følger de samme vertexene.
    const quad = (points, normal, travel, uv) => {
      const edge = points[1].map((v, i) => v - points[0][i]);
      const next = points[2].map((v, i) => v - points[0][i]);
      const dot = (edge[1] * next[2] - edge[2] * next[1]) * normal[0] +
        (edge[2] * next[0] - edge[0] * next[2]) * normal[1] + (edge[0] * next[1] - edge[1] * next[0]) * normal[2];
      const order = dot < 0 ? [0, 3, 2, 1] : [0, 1, 2, 3];
      mesh.quad(...order.map((i) => [...points[i], ...uv[i]]), normal);
      for (const i of order) mesh.travel.push(t, ...travel[i]);
    };
    quad([P(t, lo, y1), P(t + pitch, lo, y1), P(t + pitch, hi, y1), P(t, hi, y1)], [0, 1, 0],
      [[0, 1], [1, 1], [1, 1], [0, 1]], [[lo, 1], [lo, 0], [hi, 0], [hi, 1]]);
    quad([P(t, lo, y0), P(t, hi, y0), P(t, hi, y1), P(t, lo, y1)], [-run.dir[0], 0, -run.dir[1]],
      [[0, 0], [0, 0], [0, 1], [0, 1]], [[lo, -1], [hi, -1], [hi, -1], [lo, -1]]);
  }
  mesh.pitch = pitch;
  return mesh;
}
