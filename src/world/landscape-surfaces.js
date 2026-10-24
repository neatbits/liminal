// Myke himmel-/materialdetaljer. Koordinatene følger landskapet, ikke kameraet.
export const LANDSCAPE_SURFACES = /* glsl */ `
vec3 skyColor(vec3 rd) {
  float horizon = smoothstep(-0.02, 0.65, rd.y);
  vec3 col = mix(uSkyBottom, uSkyTop, horizon);
  vec2 p = rd.xz / max(0.12, rd.y + 0.24);
  float cloud = noise(p * 1.7 + vec2(8.0, 3.0)) * 0.65 + noise(p * 4.3) * 0.35;
  cloud = smoothstep(0.43, 0.75, cloud) * smoothstep(-0.015, 0.22, rd.y);
  col = mix(col, mix(uSkyBottom, uSkyTop, 0.3) * (1.06 - uNight * 0.2), cloud * 0.65);
  float sun = pow(max(0.0, dot(rd, uSun)), 48.0) * (1.0 - uNight);
  return col + uSkyBottom * sun * 0.13;
}
vec3 groundColor(vec3 p, vec3 rd) {
  float broad = noise(p.xz * 0.06), grain = grainAt(p.xz * 2.8);
  vec3 col = uGround * (0.9 + broad * 0.15 + grain * 0.08);
  float paving = 1.0 - smoothstep(2.2, 2.35, abs(mod(p.x + 22.0, 48.0) - 24.0));
  col = mix(col, uStone * (0.85 + grain * 0.04), paving * (1.0 - smoothstep(55.0, 85.0, p.z)));
  if (GROUND_STYLE == 1) {
    float stall = abs(mod(p.x + 1.3, 2.6) - 1.3), rows = abs(mod(p.z, 18.0) - 9.0);
    float marks = max(lineAt(stall, 0.045) * step(3.0, rows), lineAt(abs(rows - 7.0), 0.045));
    col = mix(uGround * (0.9 + broad * 0.13 + grain * 0.06), uStone * 1.1, marks * 0.6);
  } else if (GROUND_STYLE == 2) {
    vec2 court = vec2(mod(p.x + 16.0, 32.0) - 16.0, p.z - 25.0);
    vec2 border = abs(abs(court) - vec2(8.0, 12.0));
    float lines = max(lineAt(border.x, 0.045) * step(abs(court.y), 12.0),
      lineAt(border.y, 0.045) * step(abs(court.x), 8.0));
    lines = max(lines, lineAt(abs(length(court) - 2.0), 0.045));
    col = mix(col, uGround * vec3(0.88, 1.08, 0.82), smoothstep(42.0, 48.0, p.z));
    col = mix(col, uStone * 1.15, lines * 0.65);
  } else if (GROUND_STYLE == 3) {
    float path = max(1.0 - smoothstep(1.2, 1.4, abs(mod(p.x + 16.0, 32.0) - 16.0)),
      1.0 - smoothstep(1.0, 1.2, abs(mod(p.z + 12.0, 24.0) - 12.0)));
    col = mix(col, uStone * (0.87 + grain * 0.05), path);
  } else if (GROUND_STYLE == 4) {
    float street = abs(mod(p.x + uLayout.z * 0.5, uLayout.z) - uLayout.z * 0.5);
    col = mix(uGround * (0.67 + grain * 0.06), uStone * (0.79 + grain * 0.06), smoothstep(4.5, 4.7, street));
  } else if (GROUND_STYLE == 5) {
    float edge = abs(mod(p.x + 20.0, 40.0) - 20.0);
    float rim = smoothstep(12.0, 12.2, edge), across = smoothstep(0.6, 0.8, abs(mod(p.z + 20.0, 40.0) - 20.0));
    vec3 water = mix(uGround, uSkyBottom, 0.2 + 0.25 * pow(1.0 - abs(rd.y), 3.0));
    water *= 0.97 + 0.03 * sin(p.x * 1.4 + sin(p.z * 0.7));
    col = mix(uStone * (0.94 + grain * 0.035), water, (1.0 - rim) * across);
  }
  return col;
}
vec3 facadeColor(vec3 p, vec3 size, vec3 normal, float id, float row) {
  bool side = abs(normal.x) > 0.5;
  vec2 uv = vec2(side ? p.z : p.x, p.y + size.y);
  float grain = grainAt(uv * 7.0), variation = noise(uv * 0.2);
  vec3 col = uStone * (0.93 + variation * 0.09 + grain * 0.035);
  float shade = 0.62 + 0.38 * max(0.0, dot(normal, uSun));
  col *= shade * mix(0.76, 1.0, smoothstep(0.0, 1.2, uv.y));
  if (normal.y > 0.5) return uStone * 0.59 * shade;
  float cornice = smoothstep(size.y * 2.0 - 0.22, size.y * 2.0 - 0.12, uv.y);
  col = mix(col, uStone * shade * 0.67, cornice);
  #if VIEW_WINDOWS == 1
    vec2 grid = uv / vec2(2.4, 2.8), f = fract(grid);
    vec2 aa = max(fwidth(grid), vec2(0.002));
    vec2 lo = smoothstep(vec2(0.17) - aa, vec2(0.17) + aa, f);
    vec2 hi = 1.0 - smoothstep(vec2(0.74, 0.77) - aa, vec2(0.74, 0.77) + aa, f);
    float pane = lo.x * lo.y * hi.x * hi.y;
    float lit = step(1.0 - uAtmosphere.z, hash(floor(grid) + vec2(id, row)));
    float reflection = smoothstep(0.15, 0.85, f.y);
    vec3 glass = mix(uStone * vec3(0.28, 0.35, 0.39), uSkyTop * 0.57, reflection);
    glass = mix(glass, vec3(0.42, 0.32, 0.16), lit * uNight);
    col = mix(col, glass, pane);
    // Lyse falsekanter, mørk overkant og én slank midtpost gir vinduene dybde.
    float sill = lineAt(abs(f.y - 0.15), 0.013) * lo.x * hi.x;
    float mullion = lineAt(abs(f.x - 0.455), 0.009) * pane;
    col = mix(col, uStone * shade * 1.02, max(sill, mullion * 0.55));
  #endif
  return col;
}
`;
