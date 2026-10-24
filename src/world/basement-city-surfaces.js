// Original weathered concrete, recessed windows and empty streets for the hidden city.
export const CITY_SURFACES = /* glsl */ `
vec3 cityFacade(vec3 p, vec3 size, vec3 normal, float id, float row, float part) {
  float shade = 0.53 + 0.34 * max(0.0, dot(normal, uSun));
  vec2 uv = vec2(abs(normal.x) > 0.5 ? p.z : p.x, p.y + size.y);
  float grain = noise(uv * 8.0), stains = noise(uv * vec2(0.75, 0.055));
  vec3 tint = mix(vec3(0.81, 0.88, 0.87), vec3(1.06, 0.99, 0.86), hash(vec2(id, row + 23.0)));
  vec3 concrete = uStone * tint * shade;
  vec3 col = concrete * (0.78 + grain * 0.2 + stains * 0.19);
  if (normal.y > 0.5) {
    float seam = max(lineAt(abs(mod(p.x, 3.5) - 1.75), 0.025), lineAt(abs(mod(p.z, 3.5) - 1.75), 0.025));
    return col * (0.68 - seam * 0.12);
  }
  if (normal.y < -0.5) return col * 0.48;
  vec2 grid = uv / vec2(2.7, 3.15), f = fract(grid), aa = max(fwidth(grid), vec2(0.002));
  vec2 lo = smoothstep(vec2(0.2, 0.17) - aa, vec2(0.2, 0.17) + aa, f);
  vec2 hi = 1.0 - smoothstep(vec2(0.65, 0.72) - aa, vec2(0.65, 0.72) + aa, f);
  float blank = step(0.16, hash(floor(grid) + vec2(id * 7.0, row * 13.0)));
  float pane = lo.x * lo.y * hi.x * hi.y * blank;
  vec3 glass = mix(concrete * vec3(0.19, 0.26, 0.25), uSkyTop * 0.21, f.y);
  float lit = step(1.0 - uAtmosphere.z, hash(floor(grid) + vec2(id, row + 37.0)));
  glass = mix(glass, vec3(0.19, 0.12, 0.055), lit * uNight);
  col = mix(col, glass, pane);
  float floorBand = lineAt(abs(f.y - 0.92), 0.023);
  col = mix(col, concrete * 0.52, floorBand);
  float sill = lineAt(abs(f.y - 0.14), 0.018) * lo.x * hi.x * blank;
  col = mix(col, concrete * 1.14, sill);
  if (part > 1.5) col *= 0.83;
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
