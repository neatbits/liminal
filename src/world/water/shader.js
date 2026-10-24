// Vannshader: speiling (Reflector), lysbrytning (Refractor), dybdeavhengig farge og
// rolige bølger som sum av sinusbølger, pluss ringer der spilleren vasser og plasker
// (world/ripples.js). USE_DETAIL legger til flere små bølger (glitring). Uten USE_RT faller den
// tilbake til en enkel, gjennomsiktig flate (for svake maskiner).
import { RIPPLES, RIPPLE_SPEED } from '../ripples.js';

export const WATER_VERT = /* glsl */ `
attribute vec3 aLight;
attribute vec4 aFlick;
attribute float aEdge;
uniform vec4 uFlick;
uniform vec3 uFlickColor;
uniform vec3 uTint;
uniform mat4 uReflectMatrix;
uniform mat4 uRefractMatrix;
varying vec4 vRefl;
varying vec4 vRefr;
varying vec3 vWorld;
varying vec3 vLight;
varying float vEdge;
#include <fog_pars_vertex>
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vRefl = uReflectMatrix * vec4(position, 1.0);
  vRefr = uRefractMatrix * vec4(position, 1.0);
  vLight = (aLight + uFlickColor * dot(aFlick, uFlick)) * uTint; // lysfargen (core/tints.js)
  vEdge = aEdge;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

export const WATER_FRAG = /* glsl */ `
uniform sampler2D tReflection;
uniform sampler2D tRefraction;
uniform sampler2D tRefractionDepth;
uniform mat4 uRefractWorld;
uniform float uSimpleDepth;
uniform float uTime;
uniform float uBoost;
uniform float uMirror;
uniform float uWave;
uniform float uWaveStrength;
uniform vec3 uTint;
uniform vec3 uAbsorb;
uniform vec4 uRipples[${RIPPLES}];
varying vec4 vRefl;
varying vec4 vRefr;
varying vec3 vWorld;
varying vec3 vLight;
varying float vEdge;
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
#ifdef USE_DETAIL
  g += wave(p, vec2(0.36, 0.933), 0.17, 0.08, 0.0014, t);
  g += wave(p, vec2(-0.707, 0.707), 0.11, 0.06, 0.0009, t);
  g += wave(p, vec2(0.6, -0.8), 0.07, 0.05, 0.0006, t);
#endif
  return g;
}

// Ringene: en bølgefront (noen få bølger tykk) som brer seg utover og dør ut. r = [x, z, alder, styrke].
vec2 rippleSlope(vec2 p) {
  vec2 g = vec2(0.0);
  for (int k = 0; k < ${RIPPLES}; k++) {
    vec4 r = uRipples[k];
    if (r.w <= 0.0) continue;
    vec2 d = p - r.xy;
    float dist = length(d) + 1e-4;
    float x = dist - r.z * ${RIPPLE_SPEED.toFixed(2)};
    float env = exp(-x * x * 5.0) * exp(-r.z * 1.2) * r.w / (1.0 + dist * 1.2);
    g += (d / dist) * cos(x * 17.0) * env * 0.6;
  }
  float l = length(g);
  return l > 0.35 ? g * (0.35 / l) : g; // et kraftig plask blir ikke voldsomt
}

void main() {
  // Plask og bevegelse lager alltid ringer, også når bakgrunnsbølgene er satt til 0 %.
  vec2 ripple = rippleSlope(vWorld.xz);
  vec2 slope = ripple;
  if (uWaveStrength > 0.0) {
    slope += waveSlope(vWorld.xz, uTime) * uWave * uWaveStrength;
  }
  vec3 N = normalize(vec3(-slope.x, 1.0, -slope.y));
  vec3 V = normalize(cameraPosition - vWorld);
  // Schlick-Fresnel, litt forsterket (eksponent 4) for den speilblanke bassengfølelsen.
  float fresnel = 0.03 + 0.97 * pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 4.0);
  vec2 offset = (N.xz + ripple * 4.0) * vEdge;
  // Enkel modus: jevn vannhinne. Høy kvalitet: avstanden til flaten man faktisk ser,
  // ikke dybden rett under vannvertexen (som ga et mørkt rektangel i vannspeilet).
  float path = uSimpleDepth / max(V.y, 0.12);
#ifdef USE_RT
  vec2 refractUv = clamp(vRefr.xy / vRefr.w - offset * 0.05, vec2(0.0), vec2(1.0));
  float depth = texture2D(tRefractionDepth, refractUv).r;
  vec4 hit = uRefractWorld * vec4(refractUv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  path = 50.0; // ingen synlig bunn / bakgrunn: ugjennomsiktig vann, uten ugyldig divisjon
  if (depth < 1.0 && abs(hit.w) > 0.000001) {
    vec3 bottom = hit.xyz / hit.w;
    vec3 ray = bottom - cameraPosition;
    float submerged = clamp((vWorld.y - bottom.y) / max(cameraPosition.y - bottom.y, 0.001), 0.0, 1.0);
    path = min(length(ray) * submerged, 50.0);
  }
#endif
  vec3 trans = exp(-uAbsorb * path);
  vec3 scatter = uTint * vLight * uBoost;

#ifdef USE_RT
  #ifdef FOG_EXP2
  // Speil- og brytningsbildet har allerede tåke; bare vannets egen farge tåkelegges her.
  scatter = mix(scatter, fogColor, 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth));
  #endif
  vec3 body = texture2D(tRefraction, refractUv).rgb * trans + scatter * (1.0 - trans);
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
