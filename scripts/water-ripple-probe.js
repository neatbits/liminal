// Tester faktisk landing → plaskringer → piksler ved 0 % bakgrunnsbølger.
import * as THREE from 'three';
import { RIPPLE_LIFE } from '../src/world/ripples.js';

export function probeStillWaterRipples(viewer) {
  const { world, walk, renderer, camera } = viewer;
  const water = world.water;
  const material = water.mesh.material;
  const original = material.fragmentShader;
  water.setWaves(0);
  walk.enter();
  walk.session.resume();
  Object.assign(walk.walker, { x: 11, z: 6, floorY: 1, vy: -2, vx: 0, vz: 0 });
  for (let i = 0; i < 40 && walk.play.ripples.points.length < 2; i++) walk.update(0.05, camera, [1, 1, 1, 1], []);
  const splashCount = walk.play.ripples.points.length;
  const splash = walk.play.ripples.values();
  const empty = new Float32Array(splash.length);
  // Render bare vannets helning, så andre animasjoner og lys ikke kan gi falskt treff.
  material.fragmentShader = original.replace('vec3 N = normalize(vec3(-slope.x, 1.0, -slope.y));',
    'gl_FragColor = vec4(vec3(min(length(slope) * 8.0, 1.0)), 1.0); return; vec3 N = normalize(vec3(-slope.x, 1.0, -slope.y));');
  material.needsUpdate = true;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0);
  const surface = new THREE.Mesh(water.mesh.geometry, material);
  surface.position.copy(water.mesh.position);
  surface.rotation.copy(water.mesh.rotation);
  scene.add(surface);
  camera.position.set(11, 4, 10);
  camera.lookAt(11, water.mesh.position.y, 6);
  const target = new THREE.WebGLRenderTarget(256, 256);
  const capture = (ripples, time) => {
    water.setRipples(ripples);
    material.uniforms.uTime.value = time;
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    const pixels = new Uint8Array(256 * 256 * 4);
    renderer.readRenderTargetPixels(target, 0, 0, 256, 256, pixels);
    return pixels;
  };
  const changes = (a, b) => a.reduce((count, value, i) => count + (i % 4 === 0 && Math.abs(value - b[i]) > 2 ? 1 : 0), 0);
  try {
    const results = [];
    for (const [mode, high, detailed] of [['simple', false, false], ['normal', true, false], ['detailed', true, true]]) {
      water.setQuality(high);
      water.setDetail(detailed);
      const still = capture(empty, 0);
      results.push({ mode, splashCount, stillChanges: changes(still, capture(empty, 10)),
        splashChanges: changes(still, capture(splash, 0)) });
    }
    walk.play.ripples.step(RIPPLE_LIFE + 1);
    results.at(-1).settledChanges = changes(capture(empty, 0), capture(walk.play.ripples.values(), 0));
    return results;
  } finally {
    renderer.setRenderTarget(null);
    target.dispose();
    material.fragmentShader = original;
    material.needsUpdate = true;
    water.setRipples(empty);
    walk.exit();
  }
}
