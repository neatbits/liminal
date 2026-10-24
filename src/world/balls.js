// Ballbinger (tema med `pit: 'balls'`): bassengene fylles med plastballer i stedet for vann,
// tegnet som romlige instansgrupper. I gåmodus dytter spilleren ballene til side (kjølvann i
// vertex-shaderen, se Wake). De få ekte fysikkballene er separate playball-gjenstander.
import * as THREE from 'three';
import { ballLayout, BALL_RADIUS, Wake, WAKE_POINTS, WAKE_RADIUS } from './ball-layout.js';
import { spatialBuckets, BALL_CHUNK } from './chunks.js';

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
    if (w.z <= 0.0) continue;
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
uniform vec3 uTint;
varying vec3 vColor;
varying float vShade;
#include <fog_pars_fragment>
void main() {
  gl_FragColor = vec4(vColor * vShade * uBoost * uTint, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

/** mesh er en Group med instansgrupper; vertices teller alle ballinstansene. */
export function createBalls(level, field, shared, colors) {
  const balls = ballLayout(level, field, colors.length);
  if (!balls.length) return null;
  const geometry = new THREE.IcosahedronGeometry(BALL_RADIUS, 1);
  const wake = new Wake();
  const wakeValues = new Float32Array(WAKE_POINTS * 4);
  const uniforms = Object.assign(THREE.UniformsUtils.merge([THREE.UniformsLib.fog]), {
    uBoost: shared.uBoost,
    uTint: shared.uTint,
    uWake: { value: Array.from({ length: WAKE_POINTS }, () => new THREE.Vector4()) },
  });
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, fog: true });
  const mesh = new THREE.Group();
  mesh.name = 'balls';
  const m = new THREE.Matrix4();
  const c = new THREE.Color();
  const base = colors.map((hex) => new THREE.Color(hex));
  for (const bucket of spatialBuckets(balls, BALL_CHUNK)) {
    const part = new THREE.InstancedMesh(geometry, material, bucket.length);
    part.name = 'ball-chunk';
    bucket.forEach((b, i) => {
      m.makeTranslation(b.x, b.y, b.z);
      part.setMatrixAt(i, m);
      c.copy(base[b.color]);
      part.setColorAt(i, c.setRGB(c.r * b.light[0], c.g * b.light[1], c.b * b.light[2]));
    });
    part.instanceMatrix.needsUpdate = true;
    part.instanceColor.needsUpdate = true;
    part.computeBoundingSphere();
    // Shaderen kan flytte baller utenfor den opprinnelige instansens bounds.
    part.boundingSphere.radius += Math.hypot(WAKE_POINTS * 1.5 * 0.12, WAKE_POINTS * 1.5 * 0.06);
    mesh.add(part);
  }
  return {
    mesh,
    vertices: geometry.attributes.position.count * balls.length,
    touch: (x, z, strength) => wake.touch(x, z, strength),
    update(dt) {
      wake.step(dt);
      wake.values(wakeValues);
      uniforms.uWake.value.forEach((v, k) => v.fromArray(wakeValues, k * 4));
    },
    dispose() {
      for (const part of mesh.children) part.dispose(); // frigjør rendererens instansattributter
      geometry.dispose();
      material.dispose();
    },
  };
}
