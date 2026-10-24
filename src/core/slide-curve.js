// Glatting av sklienes vannrette bane. Ren geometri; ingen høyder eller romdata.
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
export function blur(values, r) {
  return values.map((_, i) => {
    let sum = 0;
    let n = 0;
    for (let k = Math.max(0, i - r); k <= Math.min(values.length - 1, i + r); k++, n++) sum += values[k];
    return sum / n;
  });
}

export const ease = (v) => {
  const t = Math.max(0, Math.min(1, v));
  return t * t * (3 - 2 * t);
};

const cache = new WeakMap();

/** Rett innløp i tegnet startretning, deretter myk overgang til den glattede kurven. */
export function slideCurve(slide, step, runout) {
  const hit = cache.get(slide);
  if (hit) return hit;
  const base = resample(relax(resample(smooth(slide.points), step), 30), step);
  const length = base.at(-1)[2];
  const [sx, sz] = base[0];
  const start = slide.points[0];
  const next = slide.points.find(([x, z]) => x !== start[0] || z !== start[1]) ?? start;
  const d = Math.hypot(next[0] - start[0], next[1] - start[1]) || 1;
  const dx = (next[0] - start[0]) / d;
  const dz = (next[1] - start[1]) / d;
  const straight = Math.min(runout, length * 0.45);
  const blend = Math.max(step, Math.min(1, length - straight));
  const points = base.map(([x, z, s]) => {
    const weight = 1 - ease((s - straight) / blend);
    return [x + (sx + dx * s - x) * weight, z + (sz + dz * s - z) * weight];
  });
  const out = resample(points, step);
  cache.set(slide, out);
  return out;
}

