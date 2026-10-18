// Ballbinger (tema med `pit: 'balls'`): bassengene fylles med plastballer i stedet for vann,
// tegnet som én instansiert mesh. I gåmodus dytter spilleren ballene til side (kjølvann i
// vertex-shaderen, se Wake) – ingen ekte fysikk, men billig og overbevisende.
import * as THREE from 'three';
import { ballLayout, BALL_RADIUS, Wake, WAKE_POINTS, WAKE_RADIUS } from './ball-layout.js';

const VERT = /* glsl */ `
uniform vec4 uWake[${WAKE_POINTS}];
varying vec3 vColor;
varying float vShade;
#include <fog_pars_vertex>
void main() {
  vec3 n = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  vShade = 0.55 + 0.4 * max(n.y, 0.0) + 0.1 * n.x;
  vColor = instanceColor;
  // Kjølvann: baller nær et punkt skyves utover og hoper seg opp i en ring; rett under
  // spilleren synker de litt ned.
  vec3 centre = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 off = vec3(0.0);
  for (int k = 0; k < ${WAKE_POINTS}; k++) {
    vec4 w = uWake[k];
    vec2 d = centre.xz - w.xy;
    float l = length(d);
    float f = w.z * (1.0 - smoothstep(0.0, ${WAKE_RADIUS.toFixed(2)}, l));
    off.xz += (l > 1e-4 ? d / l : vec2(0.0)) * f * 0.12;
    off.y += f * (l < ${(WAKE_RADIUS * 0.45).toFixed(2)} ? -0.05 : 0.06);
  }
  vec4 mvPosition = viewMatrix * modelMatrix * (instanceMatrix * vec4(position, 1.0) + vec4(off, 0.0));
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FRAG = /* glsl */ `
uniform float uBoost;
varying vec3 vColor;
varying float vShade;
#include <fog_pars_fragment>
void main() {
  gl_FragColor = vec4(vColor * vShade * uBoost, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

/** @returns {{ mesh, touch(x, z, strength), update(dt), dispose() } | null} */
export function createBalls(level, field, shared, colors) {
  const balls = ballLayout(level, field, colors.length);
  if (!balls.length) return null;
  const geometry = new THREE.IcosahedronGeometry(BALL_RADIUS, 1);
  const wake = new Wake();
  const wakeValues = new Float32Array(WAKE_POINTS * 4);
  const uniforms = Object.assign(THREE.UniformsUtils.merge([THREE.UniformsLib.fog]), {
    uBoost: shared.uBoost,
    uWake: { value: Array.from({ length: WAKE_POINTS }, () => new THREE.Vector4()) },
  });
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, fog: true });
  const mesh = new THREE.InstancedMesh(geometry, material, balls.length);
  mesh.name = 'balls';
  const m = new THREE.Matrix4();
  const c = new THREE.Color();
  const base = colors.map((hex) => new THREE.Color(hex));
  balls.forEach((b, i) => {
    m.makeTranslation(b.x, b.y, b.z);
    mesh.setMatrixAt(i, m);
    c.copy(base[b.color]);
    mesh.setColorAt(i, c.setRGB(c.r * b.light[0], c.g * b.light[1], c.b * b.light[2]));
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  return {
    mesh,
    touch: (x, z, strength) => wake.touch(x, z, strength),
    update(dt) {
      wake.step(dt);
      wake.values(wakeValues);
      uniforms.uWake.value.forEach((v, k) => v.fromArray(wakeValues, k * 4));
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
