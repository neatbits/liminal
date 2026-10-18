// Vannshader: speiling (Reflector), lysbrytning (Refractor), dybdeavhengig farge og
// rolige bølger som sum av sinusbølger. Uten USE_RT faller den tilbake til en enkel,
// gjennomsiktig flate (for svake maskiner).

export const WATER_VERT = /* glsl */ `
attribute vec3 aLight;
attribute vec4 aFlick;
attribute float aEdge;
attribute float aDepth;
uniform vec4 uFlick;
uniform vec3 uFlickColor;
uniform mat4 uReflectMatrix;
uniform mat4 uRefractMatrix;
varying vec4 vRefl;
varying vec4 vRefr;
varying vec3 vWorld;
varying vec3 vLight;
varying float vEdge;
varying float vDepth;
#include <fog_pars_vertex>
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vRefl = uReflectMatrix * vec4(position, 1.0);
  vRefr = uRefractMatrix * vec4(position, 1.0);
  vLight = aLight + uFlickColor * dot(aFlick, uFlick);
  vEdge = aEdge;
  vDepth = aDepth;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

export const WATER_FRAG = /* glsl */ `
uniform sampler2D tReflection;
uniform sampler2D tRefraction;
uniform float uTime;
uniform float uBoost;
uniform float uMirror;
uniform float uWave;
uniform vec3 uTint;
uniform vec3 uAbsorb;
varying vec4 vRefl;
varying vec4 vRefr;
varying vec3 vWorld;
varying vec3 vLight;
varying float vEdge;
varying float vDepth;
#include <fog_pars_fragment>

// Helning (gradient) av én sinusbølge med retning d, bølgelengde len og amplitude amp.
vec2 wave(vec2 p, vec2 d, float len, float speed, float amp, float t) {
  float k = 6.2831853 / len;
  return d * (amp * k * cos(k * (dot(d, p) - speed * t)));
}

vec2 waveSlope(vec2 p, float t) {
  vec2 g = wave(p, vec2(0.8, 0.6), 2.4, 0.30, 0.012, t);
  g += wave(p, vec2(-0.555, 0.832), 1.5, 0.24, 0.009, t);
  g += wave(p, vec2(0.148, -0.989), 0.85, 0.20, 0.006, t);
  g += wave(p, vec2(-0.906, -0.423), 0.45, 0.15, 0.0035, t);
  g += wave(p, vec2(0.968, -0.25), 0.27, 0.11, 0.002, t);
  return g;
}

void main() {
  vec2 slope = waveSlope(vWorld.xz, uTime) * uWave;
  vec3 N = normalize(vec3(-slope.x, 1.0, -slope.y));
  vec3 V = normalize(cameraPosition - vWorld);
  // Schlick-Fresnel, litt forsterket (eksponent 4) for den speilblanke bassengfølelsen.
  float fresnel = 0.03 + 0.97 * pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 4.0);
  // Lengden lyset går gjennom vannet ned til bunnen og opp igjen mot øyet (tilnærmet).
  float path = vDepth / max(V.y, 0.12);
  vec3 trans = exp(-uAbsorb * path);
  vec3 scatter = uTint * vLight * uBoost;
  vec2 offset = N.xz * vEdge;

#ifdef USE_RT
  #ifdef FOG_EXP2
  // Speil- og brytningsbildet har allerede tåke; bare vannets egen farge tåkelegges her.
  scatter = mix(scatter, fogColor, 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth));
  #endif
  vec4 rc = vRefr;
  rc.xy -= offset * 0.05 * rc.w;
  vec3 body = texture2DProj(tRefraction, rc).rgb * trans + scatter * (1.0 - trans);
  vec4 fc = vRefl;
  fc.xy += offset * 0.05 * fc.w;
  vec3 above = mix(scatter * 0.6, texture2DProj(tReflection, fc).rgb, uMirror);
  gl_FragColor = vec4(mix(body, above, fresnel), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
#else
  float opacity = 1.0 - dot(trans, vec3(0.3333));
  vec3 col = mix(scatter, scatter * 0.6 + vLight * 0.25, fresnel);
  gl_FragColor = vec4(col, clamp(opacity + fresnel * 0.5, 0.25, 0.95));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
#endif
}`;
