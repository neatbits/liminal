// Prøver GLSL-formene på GPU, også stråler som går parallelt med tak og bokser.
import * as THREE from 'three';
import { LANDSCAPE_SHAPES } from '../src/world/landscape-shapes.js';

export function landscapeShapeProbe(renderer) {
  const material = new THREE.ShaderMaterial({
    vertexShader: 'void main() { gl_Position = vec4(position, 1.0); }',
    fragmentShader: `${LANDSCAPE_SHAPES}
      void main() {
        int test = int(gl_FragCoord.x);
        float t = 0.0;
        if (test == 0) t = roofHit(vec3(0,1.5,-4), vec3(0,0,1), vec3(0), vec2(2), 2.0);
        if (test == 1) t = roofHit(vec3(1.75,1.5,-4), vec3(0,0,1), vec3(0), vec2(2), 2.0);
        if (test == 2) t = roofHit(vec3(1,3,0), vec3(0,-1,0), vec3(0), vec2(2), 2.0);
        if (test == 3) t = ellipsoidHit(vec3(0,0,-5), vec3(0,0,1), vec3(0), vec3(1,2,1));
        if (test == 4) t = ellipsoidHit(vec3(1.2,0,-5), vec3(0,0,1), vec3(0), vec3(1,2,1));
        if (test == 5) t = boxHit(vec3(3,0,-3), vec3(0,0,1), vec3(0), vec3(1));
        if (test == 6) t = roofHit(vec3(0,2.5,-4), vec3(0,0,1), vec3(0), vec2(2), 2.0);
        if (test == 7) t = boxHit(vec3(0,0,-3), vec3(0,0,1), vec3(0), vec3(1));
        gl_FragColor = vec4(t, 0, 0, 1);
      }`,
  });
  const geometry = new THREE.PlaneGeometry(2, 2), scene = new THREE.Scene();
  scene.add(new THREE.Mesh(geometry, material));
  const target = new THREE.WebGLRenderTarget(8, 1, { type: THREE.FloatType });
  const previous = renderer.getRenderTarget();
  try {
    renderer.setRenderTarget(target); renderer.render(scene, new THREE.Camera());
    const values = new Float32Array(8 * 4);
    renderer.readRenderTargetPixels(target, 0, 0, 8, 1, values);
    return Array.from({ length: 8 }, (_, i) => values[i * 4]);
  } finally {
    renderer.setRenderTarget(previous); target.dispose(); material.dispose(); geometry.dispose();
  }
}
