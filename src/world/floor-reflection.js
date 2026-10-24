// One half-resolution planar reflection for the current mall storey. Other floors keep
// their lamp glints. Reduced effects retain the inexpensive gloss shader.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { groundAt } from '../core/heights.js';

export const FLOOR_REFLECTION_PARS = /* glsl */ `
uniform sampler2D uFloorMirror;
uniform mat4 uFloorMatrix;
uniform float uFloorHeight, uFloorMirrorOn;
vec3 floorReflection(vec3 p, vec3 N, vec3 V, float mask) {
  if (uFloorMirrorOn < 0.5 || abs(p.y - uFloorHeight) > 0.03 || abs(N.y) < 0.95) return vec3(0.0);
  vec4 q = uFloorMatrix * vec4(p, 1.0);
  vec2 uv = q.xy / q.w;
  if (q.w <= 0.0 || any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return vec3(0.0);
  float fres = 0.10 + 0.28 * pow(clamp(1.0 - abs(dot(N, V)), 0.0, 1.0), 3.0);
  vec3 reflected = texture2D(uFloorMirror, uv).rgb;
  // A clipped reflection can contain non-finite HDR pixels; never feed those into bloom.
  if (any(notEqual(reflected, reflected))) return vec3(0.0);
  return clamp(reflected, vec3(0.0), vec3(16.0)) * mask * fres;
}`;

const MIRROR_OBJECTS = 12; // m: furniture farther away than this is not drawn into the floor mirror
const sphere = new THREE.Sphere();

/** A piece of furniture (or a batch of it) entirely farther than MIRROR_OBJECTS from the camera. */
function farObject(o, camera) {
  if (!o.isMesh || !(o.name === 'objectBatch' || o.parent?.parent?.name === 'objects')) return false;
  if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
  sphere.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld);
  return sphere.distanceToPoint(camera.position) > MIRROR_OBJECTS;
}

export function createFloorReflection(level, shared) {
  if (level.theme !== 'mall') return null;
  const geometry = new THREE.PlaneGeometry(level.w, level.h);
  const reflector = new Reflector(geometry, { textureWidth: 512, textureHeight: 512, clipBias: 0.003, multisample: 0 });
  reflector.rotation.x = -Math.PI / 2;
  Object.assign(shared, {
    uFloorMirror: { value: reflector.getRenderTarget().texture },
    uFloorMatrix: reflector.material.uniforms.textureMatrix,
    uFloorHeight: { value: 0 },
    uFloorMirrorOn: { value: 0 },
  });
  let enabled = false, group;
  return {
    attach(value) { group = value; },
    setEnabled(on) { enabled = on; shared.uFloorMirrorOn.value = on ? 1 : 0; },
    setSize(w, h) { reflector.getRenderTarget().setSize(Math.max(1, Math.min(1024, Math.round(w / 2))), Math.max(1, Math.min(1024, Math.round(h / 2)))); },
    render(renderer, scene, camera) {
      if (!enabled || !group) return;
      const floor = groundAt(level, camera.position.x, camera.position.z, camera.position.y);
      shared.uFloorHeight.value = floor;
      reflector.position.set(level.w / 2, floor + 0.002, level.h / 2);
      reflector.updateMatrixWorld(true);
      scene.updateMatrixWorld(true);
      camera.updateMatrixWorld(true);
      // Hide reflecting surfaces together so water and floors never reflect recursively. Contact
      // shadows lie on the mirror plane itself, and distant furniture is a few dim pixels at half
      // resolution: leaving both out roughly halves the draw calls of this pass.
      const hidden = [];
      group.traverse(o => {
        if (!o.visible) return;
        const shadow = o.name === 'contactShadow' || o.userData.source === 'contactShadow';
        if (shadow || ['floor', 'shopFloor', 'escalatorFloor', 'water'].includes(o.name) || o.name.startsWith('shopFloor_') || farObject(o, camera)) {
          hidden.push(o);
          o.visible = false;
        }
      });
      shared.uFloorMirrorOn.value = 0;
      try { reflector.onBeforeRender(renderer, scene, camera); }
      finally { for (const o of hidden) o.visible = true; shared.uFloorMirrorOn.value = 1; }
    },
    dispose() { reflector.dispose(); geometry.dispose(); },
  };
}
