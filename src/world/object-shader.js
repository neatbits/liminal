// Shaderen for gjenstander: modellens farge (faktor × tekstur) × bakt lys, hjørneskygge fra
// ARM-teksturen, gjennomsiktige piksler (alphaTest), sne-støy på skjermer (uScreen) og deler som
// lyser av seg selv (uUnlit: skilt, lyskasser).
export const VERT = /* glsl */ `
attribute vec3 aLight;
attribute vec4 aFlick;
uniform vec4 uFlick;
uniform vec3 uFlickColor;
uniform vec3 uTint;
varying vec2 vUv;
varying vec3 vLight;
#ifdef SOFT_VINYL
varying vec3 vSoftNormal;
varying vec3 vSoftView;
#endif
#ifdef DOUBLE_SIDED
attribute vec3 aBackLight;
attribute vec4 aBackFlick;
varying vec3 vBackLight;
#endif
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vLight = (aLight + uFlickColor * dot(aFlick, uFlick)) * uTint; // lysfargen (core/tints.js)
  #ifdef DOUBLE_SIDED
  vBackLight = (aBackLight + uFlickColor * dot(aBackFlick, uFlick)) * uTint;
  #endif
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  #ifdef SOFT_VINYL
  vSoftNormal = normalMatrix * normal;
  vSoftView = -mvPosition.xyz;
  #endif
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

// Fargen fra modellen (faktor × tekstur) × bakt lys; R-kanalen i ARM-teksturen (Poly Haven)
// er hjørneskygge. Med uAlphaTest > 0 kastes gjennomsiktige piksler (gitter, høyttalerduk).
// Innenfor uScreen (et område i teksturen, f.eks. glasset på et TV) vises lysende sne-støy.
export const FRAG = /* glsl */ `
uniform sampler2D map;
uniform sampler2D arm;
uniform vec3 uColor;
uniform float uHasMap;
uniform float uHasArm;
uniform float uAlphaTest;
uniform float uBoost;
uniform float uTime;
uniform vec4 uScreen;
uniform float uUnlit;
varying vec2 vUv;
varying vec3 vLight;
#ifdef SOFT_VINYL
varying vec3 vSoftNormal;
varying vec3 vSoftView;
#endif
#ifdef DOUBLE_SIDED
varying vec3 vBackLight;
#endif
#include <fog_pars_fragment>
void main() {
  vec4 tex = uHasMap > 0.5 ? texture2D(map, vUv) : vec4(1.0);
  if (uAlphaTest > 0.0 && tex.a < uAlphaTest) discard;
  vec3 albedo = uColor * tex.rgb;
  float ao = uHasArm > 0.5 ? mix(1.0, texture2D(arm, vUv).r, 0.8) : 1.0;
  vec3 light = vLight;
  #ifdef DOUBLE_SIDED
  light = gl_FrontFacing ? vLight : vBackLight;
  #endif
  vec3 col = mix(albedo * ao * light, albedo, uUnlit) * uBoost;
  #ifdef SOFT_VINYL
  // Broad, restrained vinyl sheen. Baked light supplies its energy, so dark rooms stay dark.
  vec3 n = normalize(vSoftNormal), eye = normalize(vSoftView);
  vec3 lamp = normalize((viewMatrix * vec4(-0.4, 1.0, 0.5, 0.0)).xyz);
  float sheen = pow(max(dot(n, normalize(lamp + eye)), 0.0), 26.0);
  float grazing = pow(1.0 - max(dot(n, eye), 0.0), 4.0);
  float energy = clamp(dot(light, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
  col += mix(vec3(0.8), albedo, 0.3) * (sheen * 0.16 + grazing * 0.025) * energy * uBoost;
  #endif
  vec2 s = (vUv - uScreen.xy) / max(uScreen.zw - uScreen.xy, vec2(1e-5));
  if (uScreen.z > 0.0 && s.x > 0.0 && s.x < 1.0 && s.y > 0.0 && s.y < 1.0) {
    // Sne-støy: grove korn som skifter 24 ganger i sekundet, linjer og et sakte rullende bånd.
    vec2 cell = floor(s * vec2(150.0, 110.0));
    float t = floor(uTime * 24.0);
    float n = fract(sin(dot(cell + t * vec2(17.0, 31.0), vec2(12.9898, 78.233))) * 43758.5453);
    float scan = 0.8 + 0.2 * sin(s.y * 520.0);
    float band = 0.85 + 0.15 * sin((s.y * 1.5 - uTime * 0.35) * 6.2832);
    float edge = smoothstep(0.0, 0.06, s.x) * smoothstep(1.0, 0.94, s.x) * smoothstep(0.0, 0.08, s.y) * smoothstep(1.0, 0.92, s.y);
    vec3 noise = vec3(0.35 + 0.65 * n) * vec3(0.82, 0.88, 1.0) * scan * band * 1.15;
    col = mix(col, noise, edge);
  }
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;
