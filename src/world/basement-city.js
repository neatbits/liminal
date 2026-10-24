// An original, analytic city visible only through hand-painted Basement windows.
// Like other window views, it needs no exterior scene, downloaded art or render pass.
import { LANDSCAPE_SHAPES } from './landscape-shapes.js';
import { LANDSCAPE_SURFACES } from './landscape-surfaces.js';
import { CITY_SURFACES } from './basement-city-surfaces.js';

export const BASEMENT_CITY_FRAGMENT = /* glsl */ `
uniform vec3 uSkyTop, uSkyBottom, uGround, uStone, uLeaf;
uniform vec3 uBuildSize, uBuildVary, uAtmosphere, uSun, uGreenery;
uniform vec4 uLayout;
uniform float uGain, uNight, uRoof, uSetback;
uniform int uGroundStyle;
varying vec3 vWorld;
${LANDSCAPE_SHAPES}
${LANDSCAPE_SURFACES}
${CITY_SURFACES}
struct CityHit { float distance; vec3 point; vec3 normal; vec3 size; float id; float row; float part; };
void cityBuilding(float id, float row, out vec3 centre, out vec3 size) {
  vec3 h = vec3(hash(vec2(id + 11.0, row + 5.0)), hash(vec2(id, row + 7.0)), hash(vec2(id + 17.0, row + 3.0)));
  size = uBuildSize + h * uBuildVary;
  centre = vec3((id + 0.5) * uLayout.z + (h.x - 0.5) * 5.0, uLayout.w + size.y, uLayout.x + row * uLayout.y);
}
void cityBox(vec3 ro, vec3 rd, vec3 centre, vec3 size, float kind, float id, float row,
  inout CityHit hit) {
  float t = boxHit(ro, rd, centre, size);
  if(t >= hit.distance) return;
  hit.distance = t; hit.point = ro + rd * t - centre;
  hit.normal = boxNormal(hit.point / size); hit.size = size;
  hit.id = id; hit.row = row; hit.part = kind;
}
void main() {
  vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  vec3 along = vec3(-n.z, 0.0, n.x), outside = -n;
  vec3 delta = vWorld - cameraPosition;
  vec3 ro = vec3(dot(cameraPosition, along), cameraPosition.y, dot(cameraPosition - vWorld, outside));
  vec3 rd = normalize(vec3(dot(delta, along), delta.y, dot(delta, outside)));
  vec3 col = skyColor(rd);
  CityHit hit = CityHit(100000.0, vec3(0.0), vec3(0.0), vec3(1.0), 0.0, 0.0, -1.0);
  if(rd.y < -0.0001) {
    float ground = (uLayout.w - ro.y) / rd.y;
    if(ground > 0.0) {hit.distance = ground; col = cityGround(ro + rd * ground);}
  }
  for(int row = 0; row < 5; row++) {
    float r = float(row), z = uLayout.x + r * uLayout.y;
    float xAt = ro.x + rd.x * (z - ro.z) / max(rd.z, 0.0001);
    float cell = floor(xAt / uLayout.z);
    for(int column = -1; column <= 1; column++) {
      float id = cell + float(column);
      vec3 centre, size; cityBuilding(id, r, centre, size);
      float stepped = step(0.5, hash(vec2(id + 8.0, r + 2.0)));
      float setback = stepped * 0.16;
      cityBox(ro, rd, centre - vec3(0.0, size.y * setback, 0.0), size * vec3(1.0, 1.0 - setback, 1.0),
        0.0, id, r, hit);
      if(stepped > 0.5) {
        cityBox(ro, rd, centre + vec3(0.0, size.y * 0.84, 0.0), size * vec3(0.64, 0.16, 0.72),
          0.0, id, r, hit);
      }
      // A small roof service room and a slender vent break up the flat rooflines.
      vec3 roof = centre + vec3(0.0, size.y, 0.0);
      cityBox(ro, rd, roof + vec3(-2.0, 1.5, 0.0), vec3(2.8, 1.5, 2.2), 1.0, id, r, hit);
      cityBox(ro, rd, roof + vec3(2.5, 2.6, 1.0), vec3(0.35, 2.6, 0.35), 1.0, id, r, hit);
      if(hash(vec2(id + 4.0, r + 1.0)) > 0.67) {
        vec3 next, nextSize; cityBuilding(id + 1.0, r, next, nextSize);
        float left = centre.x + size.x - 0.2, right = next.x - nextSize.x + 0.2;
        float y = uLayout.w + min(size.y, nextSize.y) * 1.4;
        cityBox(ro, rd, vec3((left + right) * 0.5, y, z), vec3((right - left) * 0.5, 1.1, 2.0),
          2.0, id, r, hit);
      }
    }
  }
  // Shade only the closest surface, regardless of how many candidate boxes were hit.
  if(hit.part >= 0.0) col = cityFacade(hit.point, hit.size, hit.normal, hit.id, hit.row, hit.part);
  float hitDistance = hit.distance;
  if(hitDistance < 99999.0) col = mix(col, uSkyBottom, 1.0 - exp(-hitDistance * uAtmosphere.x));
  gl_FragColor = vec4(col * uGain, 1.0);
}`;
