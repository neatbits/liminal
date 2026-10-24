// Analytiske former og filtrert støy for utsikten. Ingen løpende raymarching.
export const LANDSCAPE_SHAPES = /* glsl */ `
uniform sampler2D uNoise;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  return texture2D(uNoise, (p + 0.5) / 128.0).r;
}
float grainAt(vec2 p) {
  return noise(p);
}
vec2 boxRange(vec3 ro, vec3 rd, vec3 centre, vec3 halfSize) {
  vec3 safeDir = mix(vec3(-0.00001), vec3(0.00001), step(vec3(0.0), rd));
  vec3 inv = 1.0 / mix(safeDir, rd, step(vec3(0.00001), abs(rd)));
  vec3 lo = (centre - halfSize - ro) * inv, hi = (centre + halfSize - ro) * inv;
  vec3 a = min(lo, hi), b = max(lo, hi);
  return vec2(max(max(a.x, a.y), a.z), min(min(b.x, b.y), b.z));
}
float boxHit(vec3 ro, vec3 rd, vec3 centre, vec3 halfSize) {
  vec2 range = boxRange(ro, rd, centre, halfSize);
  return range.y >= max(range.x, 0.0) ? max(range.x, 0.0) : 100000.0;
}
bool clipRoof(vec3 ro, vec3 rd, vec3 n, float height, inout vec2 range) {
  float v = dot(n, rd), d = height - dot(n, ro);
  if (abs(v) < 0.00001) return d >= 0.0;
  if (v > 0.0) range.y = min(range.y, d / v);
  else range.x = max(range.x, d / v);
  return range.y >= max(range.x, 0.0);
}
float roofHit(vec3 ro, vec3 rd, vec3 base, vec2 extent, float rise) {
  vec2 range = boxRange(ro, rd, base + vec3(0.0, rise * 0.5, 0.0), vec3(extent.x, rise * 0.5, extent.y));
  if (range.y < max(range.x, 0.0)) return 100000.0;
  vec3 p = ro - base;
  float slope = rise / extent.x;
  if (!clipRoof(p, rd, vec3(slope, 1.0, 0.0), rise, range)) return 100000.0;
  if (!clipRoof(p, rd, vec3(-slope, 1.0, 0.0), rise, range)) return 100000.0;
  return max(range.x, 0.0);
}
float ellipsoidHit(vec3 ro, vec3 rd, vec3 centre, vec3 radius) {
  vec3 p = (ro - centre) / radius, d = rd / radius;
  float a = dot(d, d), b = dot(p, d), c = dot(p, p) - 1.0;
  float det = b * b - a * c;
  if (det < 0.0) return 100000.0;
  float t = (-b - sqrt(det)) / a;
  return t > 0.0 ? t : 100000.0;
}
float lineAt(float distance, float width) {
  float aa = max(fwidth(distance), 0.006);
  return 1.0 - smoothstep(width - aa, width + aa, distance);
}
vec3 boxNormal(vec3 p) {
  vec3 a = abs(p);
  return a.y > max(a.x, a.z) ? vec3(0.0, sign(p.y), 0.0) :
    a.x > a.z ? vec3(sign(p.x), 0.0, 0.0) : vec3(0.0, 0.0, sign(p.z));
}
`;
