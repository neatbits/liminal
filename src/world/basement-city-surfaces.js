// Original weathered concrete for the hidden, Babbdi-like city: dusty pink-beige blocks with few,
// small windows, and round towers ringed by deep window bands under pale parapets.
export const CITY_SURFACES = /* glsl */ `
vec3 cityConcrete(vec2 uv, vec3 normal, float id, float row) {
  float shade = 0.53 + 0.34 * max(0.0, dot(normal, uSun));
  float grain = noise(uv * 8.0), stains = noise(uv * vec2(0.75, 0.055));
  vec3 tint = mix(vec3(0.93, 0.89, 0.88), vec3(1.05, 0.98, 0.9), hash(vec2(id, row + 23.0)));
  return uStone * tint * shade * (0.78 + grain * 0.2 + stains * 0.19);
}
vec3 cityFacade(vec3 p, vec3 size, vec3 normal, float id, float row, float part) {
  vec2 uv = vec2(abs(normal.x) > 0.5 ? p.z : p.x, p.y + size.y);
  vec3 col = cityConcrete(uv, normal, id, row), concrete = col;
  if (normal.y > 0.5) {
    float seam = max(lineAt(abs(mod(p.x, 3.5) - 1.75), 0.025), lineAt(abs(mod(p.z, 3.5) - 1.75), 0.025));
    return col * (0.68 - seam * 0.12);
  }
  if (normal.y < -0.5) return col * 0.48;
  // Massive walls: only some small, square, dark windows.
  vec2 grid = uv / vec2(2.7, 3.15), f = fract(grid), aa = max(fwidth(grid), vec2(0.002));
  vec2 lo = smoothstep(vec2(0.36, 0.34) - aa, vec2(0.36, 0.34) + aa, f);
  vec2 hi = 1.0 - smoothstep(vec2(0.64, 0.62) - aa, vec2(0.64, 0.62) + aa, f);
  float blank = step(0.55, hash(floor(grid) + vec2(id * 7.0, row * 13.0)));
  float pane = lo.x * lo.y * hi.x * hi.y * blank;
  vec3 glass = concrete * vec3(0.16, 0.14, 0.14);
  float lit = step(1.0 - uAtmosphere.z, hash(floor(grid) + vec2(id, row + 37.0)));
  glass = mix(glass, vec3(0.19, 0.12, 0.055), lit * uNight);
  col = mix(col, glass, pane);
  col = mix(col, concrete * 0.82, lineAt(abs(f.y - 0.92), 0.016));
  if (part > 1.5) col *= 0.83;
  return col;
}
// Vertical cylinder around (c.x, c.z) with radius r from y0 to y1, flat roof: distance or 1e5.
float drumHit(vec3 ro, vec3 rd, vec3 c, float r, float y0, float y1, out vec3 normal) {
  vec2 o = ro.xz - c.xz, d = rd.xz;
  float a = dot(d, d), b = dot(o, d), k = dot(o, o) - r * r, best = 100000.0;
  normal = vec3(0.0, 1.0, 0.0);
  float disc = b * b - a * k;
  if (a > 1e-8 && disc >= 0.0) {
    float t = (-b - sqrt(disc)) / a, y = ro.y + rd.y * t;
    vec2 q = (o + d * t) / r;
    if (t > 0.0 && y >= y0 && y <= y1) { best = t; normal = vec3(q.x, 0.0, q.y); }
  }
  if (abs(rd.y) > 1e-6) {
    float t = (y1 - ro.y) / rd.y;
    vec2 q = o + d * t;
    if (t > 0.0 && t < best && dot(q, q) <= r * r) { best = t; normal = vec3(0.0, 1.0, 0.0); }
  }
  return best;
}
// p relative to the tower's foot; a whole number of window bays around, so the seam never shows.
vec3 cityDrum(vec3 p, float r, vec3 normal, float id, float row) {
  float around = atan(p.z, p.x) / 6.2832 + 0.5, bays = max(6.0, floor(6.2832 * r / 2.3));
  if (normal.y > 0.5) return cityConcrete(p.xz, normal, id, row) * 0.7; // flat roof
  vec3 col = cityConcrete(vec2(around * 6.2832 * r, p.y), normal, id, row), concrete = col;
  vec2 grid = vec2(around * bays, p.y / 3.15), f = fract(grid);
  vec2 aa = max(vec2(length(fwidth(p.xz)) / 2.3, fwidth(grid.y)), vec2(0.002));
  // A deep window band in shadow on every storey, with piers between small openings.
  float band = smoothstep(0.3 - aa.y, 0.3 + aa.y, f.y) * (1.0 - smoothstep(0.64 - aa.y, 0.64 + aa.y, f.y));
  float opening = smoothstep(0.24 - aa.x, 0.24 + aa.x, f.x) * (1.0 - smoothstep(0.76 - aa.x, 0.76 + aa.x, f.x));
  col = mix(col, concrete * 0.6, band);
  vec3 glass = concrete * vec3(0.15, 0.13, 0.13);
  float lit = step(1.0 - uAtmosphere.z, hash(floor(grid) + vec2(id, row + 53.0)));
  glass = mix(glass, vec3(0.19, 0.12, 0.055), lit * uNight);
  col = mix(col, glass, band * opening * step(0.1, hash(floor(grid) + vec2(id * 3.0, row))));
  col = mix(col, concrete * 0.4, lineAt(abs(f.y - 0.645), 0.02)); // shadow under the parapet lip
  col = mix(col, concrete * 1.1, lineAt(abs(f.y - 0.97), 0.014)); // pale parapet edge
  return col;
}
vec3 cityGround(vec3 p) {
  vec2 g = vec2(uLayout.z, uLayout.y);
  vec2 road = abs(mod(p.xz + g * 0.5, g) - g * 0.5);
  float street = 1.0 - smoothstep(2.5, 3.0, min(road.x, road.y));
  float grain = noise(p.xz * 2.0);
  return mix(uGround * (0.82 + grain * 0.13), uGround * 0.48, street);
}
`;
