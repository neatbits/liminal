// Én animert mesh per sammenhengende løp. Geometri/lys bakes én gang; ingen nye renderpass.
import * as THREE from 'three';
import { ESCALATOR_SPEED, escalatorRuns } from '../core/escalators.js';
import { escalatorSteps } from './escalators.js';
import { surfaceMaterial, toGeometry } from './materials.js';

const MOTION = /* glsl */ `
attribute vec3 aStep;
uniform vec3 uEscOrigin;
uniform vec2 uEscDir;
uniform vec3 uEscSpan; // lengde, stigning, trinnlengde
uniform float uEscSpeed;
uniform float uTime;
`;
const POSITION = /* glsl */ `
  float start = mod(aStep.x + uEscSpan.z + uTime * uEscSpeed, uEscSpan.x + uEscSpan.z) - uEscSpan.z;
  float t = clamp(start + aStep.y * uEscSpan.z, 0.0, uEscSpan.x);
  float h = clamp(start + aStep.z * uEscSpan.z, 0.0, uEscSpan.x);
  vec2 across = position.xz - uEscOrigin.xz - uEscDir * (aStep.x + aStep.y * uEscSpan.z);
  vec2 xz = uEscOrigin.xz + uEscDir * t + across;
  vec3 moving = vec3(xz.x, uEscOrigin.y + h * uEscSpan.y / uEscSpan.x + 0.012, xz.y);
  vPos = moving;
  vec4 mvPosition = modelViewMatrix * vec4(moving, 1.0);
`;

export function createEscalatorMotion(level, field, shared) {
  const group = new THREE.Group();
  group.name = 'escalators';
  let vertices = 0;
  for (const run of escalatorRuns(level)) {
    const data = escalatorSteps(run, field);
    const geometry = toGeometry(data);
    geometry.setAttribute('aStep', new THREE.Float32BufferAttribute(data.travel, 3));
    const material = surfaceMaterial({ color: '#777e83' }, shared);
    Object.assign(material.uniforms, {
      uEscOrigin: { value: new THREE.Vector3(run.origin[0], run.low, run.origin[1]) },
      uEscDir: { value: new THREE.Vector2(...run.dir) },
      uEscSpan: { value: new THREE.Vector3(run.length, run.rise, data.pitch) },
      uEscSpeed: { value: ESCALATOR_SPEED * (run.down ? -1 : 1) },
    });
    material.vertexShader = MOTION + material.vertexShader.replace('vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);', POSITION);
    // Langsgående metallriller og gul forkant; UV følger trinnet under bevegelsen.
    material.fragmentShader = material.fragmentShader.replace('vec3 albedo = uColor;', `
      float rib = abs(fract(vUv.x * 65.0) - 0.5);
      float aa = max(0.01, fwidth(vUv.x * 65.0));
      float groove = smoothstep(0.2 - aa, 0.2 + aa, rib);
      vec3 albedo = uColor * mix(0.65, 1.1, groove);
      if (vUv.y > 0.94) albedo = vec3(0.72, 0.48, 0.07);
    `);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = run.down ? 'escalator-down' : 'escalator-up';
    group.add(mesh);
    vertices += data.vertexCount;
  }
  return { group, vertices, dispose() {
    for (const mesh of group.children) { mesh.geometry.dispose(); mesh.material.dispose(); }
  } };
}
