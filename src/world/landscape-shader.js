import { LANDSCAPE_SHAPES } from './landscape-shapes.js';
import { LANDSCAPE_SURFACES } from './landscape-surfaces.js';
import { WINDOW_GHOST } from './window-ghost-view.js';

export const LANDSCAPE_FRAGMENT = /* glsl */ `
uniform vec3 uSkyTop, uSkyBottom, uGround, uStone, uLeaf;
uniform vec3 uBuildSize, uBuildVary, uAtmosphere, uSun, uGreenery;
uniform vec4 uLayout;
uniform float uGain, uNight, uRoof, uSetback;
uniform int uGroundStyle;
varying vec3 vWorld;
${LANDSCAPE_SHAPES}
${LANDSCAPE_SURFACES}
${WINDOW_GHOST}
void main() {
  // Nabovinduer deler verdenskoordinater. Utsikten følger ikke med kameraet.
  vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  vec3 along = vec3(-n.z, 0.0, n.x), outside = -n;
  vec3 delta = vWorld - cameraPosition;
  vec3 ro = vec3(dot(cameraPosition, along), cameraPosition.y, dot(cameraPosition - vWorld, outside));
  vec3 rd = normalize(vec3(dot(delta, along), delta.y, dot(delta, outside)));
  vec3 haze = uSkyBottom, col;
  float hitDistance = 100000.0, shadow = 0.0;
  vec3 groundPoint = vec3(0.0), surfacePoint = vec3(0.0), surfaceNormal = vec3(0.0), surfaceSize = vec3(1.0);
  float surfaceId = 0.0, surfaceRow = 0.0, gableEnd = 0.0;
  int surface = 0;
  if (rd.y < -0.0001) {
    float ground = (uLayout.w - ro.y) / rd.y;
    if (ground > 0.0) {
      groundPoint = ro + rd * ground;
      hitDistance = ground; surface = 1;
    }
  }
  // Tre rader og tre kandidater nær strålen per rad. Uendret avstand til bebyggelsen.
  for (int row = 0; row < 3; row++) {
    float z = uLayout.x + float(row) * uLayout.y;
    float xAt = ro.x + rd.x * (z - ro.z) / max(rd.z, 0.0001);
    float cell = floor(xAt / uLayout.z);
    for (int column = -1; column <= 1; column++) {
      float id = cell + float(column);
      float h = hash(vec2(id, float(row) + 7.0));
      vec3 size = uBuildSize + h * uBuildVary;
      vec3 centre = vec3((id + 0.375 + h * (10.0 / 48.0)) * uLayout.z, uLayout.w + size.y, z);
      if (surface == 1) {
        // Myk kontakt-/slagskygge gir feste mot bakken, uten et ekstra skyggepass.
        vec2 extent = size.xz + vec2(1.5);
        vec2 offset = uSun.xz * size.y / max(uSun.y, 0.2);
        vec2 p = (groundPoint.xz - centre.xz + offset) / (extent + abs(offset));
        shadow = max(shadow, (1.0 - smoothstep(0.7, 1.15, max(abs(p.x), abs(p.y)))) * 0.24);
      }
      vec3 mainSize = size * vec3(1.0, 1.0 - uSetback, 1.0);
      vec3 mainCentre = centre - vec3(0.0, size.y * uSetback, 0.0);
      float t = boxHit(ro, rd, mainCentre, mainSize);
      if (t < hitDistance) {
        vec3 p = ro + rd * t - mainCentre;
        surfacePoint = p; surfaceSize = mainSize; surfaceNormal = boxNormal(p / mainSize);
        surfaceId = id; surfaceRow = float(row); hitDistance = t; surface = 2;
      }
      #if VIEW_SETBACK == 1
      if (uSetback > 0.0) {
        vec3 topSize = size * vec3(0.72, uSetback, 0.72);
        vec3 topCentre = centre + vec3(0.0, size.y * (1.0 - uSetback), 0.0);
        t = boxHit(ro, rd, topCentre, topSize);
        if (t < hitDistance) {
          vec3 p = ro + rd * t - topCentre;
          surfacePoint = p; surfaceSize = topSize; surfaceNormal = boxNormal(p / topSize);
          surfaceId = id; surfaceRow = float(row); hitDistance = t; surface = 2;
        }
      }
      #endif
      #if VIEW_ROOF == 1
      if (uRoof > 0.0) {
        vec3 base = centre + vec3(0.0, size.y, 0.0);
        float rise = uRoof * (0.8 + h * 0.4);
        t = roofHit(ro, rd, base, size.xz + vec2(0.16), rise);
        if (t < hitDistance) {
          vec3 p = ro + rd * t - base;
          bool gable = abs(p.z) > size.z + 0.15;
          vec3 normal = gable ? vec3(0.0, 0.0, sign(p.z)) : normalize(vec3(sign(p.x) * rise / (size.x + 0.16), 1.0, 0.0));
          surfacePoint = p; surfaceNormal = normal; gableEnd = gable ? 1.0 : 0.0;
          hitDistance = t; surface = 3;
        }
      }
      #endif
      #if VIEW_GREENERY == 1
      float tree = hash(vec2(id, float(row) + 19.0));
      if (tree < uGreenery.x) {
        float height = uGreenery.z * (0.85 + tree * 0.5), width = uGreenery.y;
        vec3 root = vec3((id + 0.98) * uLayout.z, uLayout.w, z - 8.0);
        float bounds = boxHit(ro, rd, root + vec3(0.0, height * 0.55, 0.0), vec3(width * 1.5, height * 0.55, width * 1.5));
        if (bounds < hitDistance) {
          vec3 trunkSize = vec3(0.13, height * 0.38, 0.13);
          t = boxHit(ro, rd, root + vec3(0.0, trunkSize.y, 0.0), trunkSize);
          if (t < hitDistance) { hitDistance = t; surface = 5; }
          for (int crown = 0; crown < 4; crown++) {
            float k = float(crown);
            float branch = hash(vec2(id + k * 13.0, float(row) + k * 7.0));
            float angle = k * 2.4 + tree * 6.0;
            vec3 radius = vec3(width * (0.65 + branch * 0.2), height * (0.23 + branch * 0.07), width * 0.7);
            vec3 top = root + vec3(cos(angle) * width * 0.4, height * (0.58 + branch * 0.22), sin(angle) * width * 0.4);
            t = ellipsoidHit(ro, rd, top, radius);
            if (t < hitDistance) {
              vec3 p = ro + rd * t - top;
              vec3 normal = normalize(p / (radius * radius));
              surfacePoint = p; surfaceNormal = normal; hitDistance = t; surface = 4;
            }
          }
        }
        if (surface == 1) {
          vec2 p = (groundPoint.xz - root.xz + uSun.xz * height * 0.5) / (width * 1.5);
          shadow = max(shadow, exp(-dot(p, p) * 1.4) * 0.22);
        }
      }
      #endif
    }
  }
  // Materialdetaljer beregnes én gang, bare for nærmeste treff.
  if (surface == 0) col = skyColor(rd);
  else if (surface == 1) col = groundColor(groundPoint, rd) * (1.0 - shadow * (1.0 - uNight * 0.6));
  else if (surface == 2) col = facadeColor(surfacePoint, surfaceSize, surfaceNormal, surfaceId, surfaceRow);
  else if (surface == 3) {
    float shade = 0.65 + 0.35 * max(0.0, dot(surfaceNormal, uSun));
    col = uStone * mix(0.52, 0.9, gableEnd) * shade * (0.96 + grainAt(surfacePoint.xz * 3.0) * 0.06);
  } else if (surface == 4) {
    vec2 foliage = (surfacePoint.xz + surfacePoint.y) * 2.5;
    float leaves = grainAt(foliage) * 0.6 + grainAt(foliage * 3.7) * 0.4;
    col = uLeaf * (0.45 + 0.32 * max(0.0, dot(surfaceNormal, uSun)) + leaves * 0.35);
  } else col = uStone * vec3(0.3, 0.27, 0.21);
  ghostHit(ro, rd, n.xz, hitDistance, col, hitDistance);
  if (hitDistance < 99999.0) col = mix(col, haze, 1.0 - exp(-hitDistance * uAtmosphere.x));
  gl_FragColor = vec4(col * uGain, 1.0);
}`;
