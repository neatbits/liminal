// Shadere for flater med bakt lys (aLight + blinkekanaler aFlick). Vannet ligger i world/water/.
import * as THREE from 'three';
import { getTexture } from '../textures/index.js';
import { WATER_DEPTH } from '../core/level.js';
import { GLOSS_PARS } from './gloss.js';

// Kaustikk: lysnettet på bassengbunnen. Kantene mellom celler (Worley F2 − F1) med punkter som
// beveger seg, i to lag med ulik skala, vridd så nettet ikke blir regelmessig.
const CAUSTIC = /* glsl */ `
vec2 causticHash(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}
float causticCells(vec2 p, float t) {
  vec2 ip = floor(p);
  vec2 fp = fract(p);
  float f1 = 8.0;
  float f2 = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 o = vec2(float(x), float(y));
      vec2 h = causticHash(ip + o);
      vec2 d = o + 0.5 + 0.4 * sin(t * 0.8 + 6.2831 * h) - fp;
      float dd = dot(d, d);
      if (dd < f1) { f2 = f1; f1 = dd; } else if (dd < f2) { f2 = dd; }
    }
  }
  return sqrt(f2) - sqrt(f1);
}
float caustic(vec2 p, float t) {
  vec2 w = p * 1.25 + 0.3 * vec2(sin(p.y * 1.3 + t * 0.5), sin(p.x * 1.1 - t * 0.4));
  float a = 1.0 - smoothstep(0.0, 0.11, causticCells(w, t));
  float b = 1.0 - smoothstep(0.0, 0.14, causticCells(w * 1.7 + 3.1, t * 1.25));
  return a * 0.8 + b * 0.35 + a * b * 0.6;
}`;

const VERT = /* glsl */ `
attribute vec3 aLight;
attribute vec4 aFlick;
uniform vec4 uFlick;
uniform vec3 uFlickColor;
uniform vec3 uTint;
varying vec2 vUv;
varying vec3 vLight;
varying vec3 vPos;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vPos = position;
  vLight = (aLight + uFlickColor * dot(aFlick, uFlick)) * uTint; // lysfargen (core/tints.js)
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const SURFACE_FRAG = /* glsl */ `
#ifdef USE_COLOR
uniform vec3 uColor;
#else
uniform sampler2D map;
uniform vec2 uTexSize;
#endif
uniform float uTime;
uniform float uBoost;
#ifdef USE_MAP2
uniform sampler2D map2;
uniform vec2 uTex2Size;
uniform float uSplit;
#endif
#ifdef USE_TRIM
uniform float uTrimH;
uniform vec3 uTrimColor;
#endif
#ifdef USE_BASE
uniform float uBaseH;
uniform vec3 uBaseColor;
#endif
varying vec2 vUv;
varying vec3 vLight;
varying vec3 vPos;
#ifdef USE_GLOSS
uniform vec4 uFlick;
uniform vec2 uGloss; // blankhet, fliser per teksturflate
#ifdef USE_MAP2
uniform vec2 uGloss2;
#endif
${GLOSS_PARS}
#endif
#include <fog_pars_fragment>
${CAUSTIC}
void main() {
  #ifdef USE_COLOR
  vec3 albedo = uColor;
  #else
  vec3 albedo = texture2D(map, vUv / uTexSize).rgb;
  #endif
  #ifdef USE_MAP2
  if (vUv.y < uSplit) albedo = texture2D(map2, vUv / uTex2Size).rgb;
  #ifdef USE_TRIM
  if (abs(vUv.y - uSplit) < uTrimH * 0.5) albedo = uTrimColor;
  #endif
  #endif
  #ifdef USE_BASE
  if (vUv.y > -0.01 && vUv.y < uBaseH) albedo = uBaseColor;
  #endif
  vec3 col = albedo * vLight * uBoost;
  #ifdef USE_GLOSS
  vec2 glossUv = vUv / uTexSize * uGloss.y;
  float glossy = uGloss.x;
  #ifdef USE_MAP2
  if (vUv.y < uSplit) {
    glossUv = vUv / uTex2Size * uGloss2.y;
    glossy = uGloss2.x;
  }
  #endif
  col += gloss(glossUv, glossy, vLight) * uBoost;
  #endif
  #ifdef USE_CAUSTICS
  // Svakere kaustikker jo dypere bunnen ligger enn standarddybden.
  float fade = exp(min(vPos.y + ${WATER_DEPTH.toFixed(2)}, 0.0) * 0.8);
  col += vLight * caustic(vPos.xz, uTime) * 0.24 * fade;
  #endif
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

/** Uniforms som deles av alle materialer i verdenen (oppdateres én gang per ramme). */
export function createSharedUniforms(flickColor) {
  return {
    uFlick: { value: new THREE.Vector4(1, 1, 1, 1) },
    uFlickColor: { value: new THREE.Color().setRGB(...flickColor) },
    uTime: { value: 0 },
    uBoost: { value: 1 },
    uTint: { value: new THREE.Vector3(1, 1, 1) }, // lysfargen (core/tints.js, world.setTint)
  };
}

function baseUniforms(shared) {
  const u = THREE.UniformsUtils.merge([THREE.UniformsLib.fog]);
  return Object.assign(u, shared);
}

/**
 * @param def { tex, size } fra temaet – eller { color } for en ensfarget flate – pluss
 *            valgfritt map2 ({ tex, size, split, trim }), base ({ h, color }), caustics (bool) og
 *            gloss ({ amount, grid } – blanke fliser, også i map2; krever glansuniformene i shared)
 */
export function surfaceMaterial(def, shared, anisotropy) {
  const uniforms = baseUniforms(shared);
  const defines = {};
  if (def.color) {
    defines.USE_COLOR = '';
    uniforms.uColor = { value: new THREE.Color(def.color) };
  } else {
    uniforms.map = { value: getTexture(def.tex, anisotropy) };
    uniforms.uTexSize = { value: new THREE.Vector2(...def.size) };
  }
  if (def.map2) {
    defines.USE_MAP2 = '';
    uniforms.map2 = { value: getTexture(def.map2.tex, anisotropy) };
    uniforms.uTex2Size = { value: new THREE.Vector2(...def.map2.size) };
    uniforms.uSplit = { value: def.map2.split };
    if (def.map2.trim) {
      defines.USE_TRIM = '';
      uniforms.uTrimH = { value: def.map2.trim.h };
      uniforms.uTrimColor = { value: new THREE.Color(def.map2.trim.color) };
    }
  }
  if (def.base) {
    defines.USE_BASE = '';
    uniforms.uBaseH = { value: def.base.h };
    uniforms.uBaseColor = { value: new THREE.Color(def.base.color) };
  }
  if (def.caustics) defines.USE_CAUSTICS = '';
  const g1 = !def.color && def.gloss;
  const g2 = def.map2?.gloss;
  if ((g1 || g2) && shared.uLamps) {
    defines.USE_GLOSS = '';
    if (def.mirror && shared.uFloorMirror) defines.USE_FLOOR_MIRROR = '';
    uniforms.uGloss = { value: new THREE.Vector2(g1?.amount ?? 0, g1?.grid ?? 1) };
    if (def.map2) uniforms.uGloss2 = { value: new THREE.Vector2(g2?.amount ?? 0, g2?.grid ?? 1) };
  }
  return new THREE.ShaderMaterial({ uniforms, defines, vertexShader: VERT, fragmentShader: SURFACE_FRAG, fog: true });
}

/** Gjør MeshData om til en BufferGeometry med lysattributter. */
export function toGeometry(data) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(data.pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(data.uv, 2));
  g.setAttribute('aLight', new THREE.Float32BufferAttribute(data.light, 3));
  g.setAttribute('aFlick', new THREE.Float32BufferAttribute(data.flick, 4));
  g.setIndex(data.vertexCount > 65535 ? new THREE.Uint32BufferAttribute(data.index, 1) : new THREE.Uint16BufferAttribute(data.index, 1));
  g.computeBoundingSphere();
  return g;
}
