// Shaderne til ballbingene (balls.js): ekte kuler nær kameraet, og fjerne baller som flate
// firkanter mot kameraet der fragmentshaderen tegner en rund, belyst kule (impostor).
// Begge bruker samme kjølvann og samme lysformel, så overgangen ikke synes.
import { WAKE_POINTS, WAKE_RADIUS } from './ball-layout.js';

// Kjølvann: baller nær et punkt skyves utover og hoper seg opp i en ring; rett under
// spilleren synker de litt ned. Gir `off` (lokalt) for ballen med sentrum `centre`.
const WAKE = /* glsl */ `
  vec3 centre = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 off = vec3(0.0);
  for (int k = 0; k < ${WAKE_POINTS}; k++) {
    vec4 w = uWake[k];
    if (w.z <= 0.0) continue;
    vec2 d = centre.xz - w.xy;
    float l = length(d);
    float f = w.z * (1.0 - smoothstep(0.0, ${WAKE_RADIUS.toFixed(2)}, l));
    off.xz += (l > 1e-4 ? d / l : vec2(0.0)) * f * 0.12;
    off.y += f * (l < ${(WAKE_RADIUS * 0.45).toFixed(2)} ? -0.05 : 0.06);
  }`;

const SHADE = (n) => `(0.55 + 0.4 * max(${n}.y, 0.0) + 0.1 * ${n}.x)`;

const OUTPUT = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>`;

export const VERT = /* glsl */ `
uniform vec4 uWake[${WAKE_POINTS}];
varying vec3 vColor;
varying float vShade;
#include <fog_pars_vertex>
void main() {
  vec3 n = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  vShade = ${SHADE('n')};
  vColor = instanceColor;
${WAKE}
  vec4 mvPosition = viewMatrix * modelMatrix * (instanceMatrix * vec4(position, 1.0) + vec4(off, 0.0));
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

export const FRAG = /* glsl */ `
uniform float uBoost;
uniform vec3 uTint;
varying vec3 vColor;
varying float vShade;
#include <fog_pars_fragment>
void main() {
  gl_FragColor = vec4(vColor * vShade * uBoost * uTint, 1.0);
${OUTPUT}
}`;

/** Firkanten (PlaneGeometry med sider 2 × radius) snus mot kameraet i visningsrommet. */
export const IMPOSTOR_VERT = /* glsl */ `
uniform vec4 uWake[${WAKE_POINTS}];
uniform float uRadius;
varying vec3 vColor;
varying vec2 vDisc;
#include <fog_pars_vertex>
void main() {
  vColor = instanceColor;
  vDisc = position.xy / uRadius;
${WAKE}
  vec4 mvPosition = viewMatrix * modelMatrix * (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0) + vec4(off, 0.0));
  mvPosition.xy += position.xy;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

export const IMPOSTOR_FRAG = /* glsl */ `
uniform float uBoost;
uniform vec3 uTint;
varying vec3 vColor;
varying vec2 vDisc;
#include <fog_pars_fragment>
void main() {
  float r2 = dot(vDisc, vDisc);
  if (r2 > 1.0) discard;
  // Kulenormalen i visningsrommet, tilbake til verden (viewMatrix er en ren rotasjon + flytting).
  vec3 n = normalize((vec4(vDisc, sqrt(1.0 - r2), 0.0) * viewMatrix).xyz);
  gl_FragColor = vec4(vColor * ${SHADE('n')} * uBoost * uTint, 1.0);
${OUTPUT}
}`;
