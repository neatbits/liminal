// Kjøres i nettleseren via Vite, med samme three.js-instans som appen.
import * as THREE from 'three';

export function probeWaterDepth(viewer) {
  const { renderer, camera, scene, world } = viewer;
  const water = world.water;
  const material = water.mesh.material;
  const original = material.fragmentShader;
  const target = new THREE.WebGLRenderTarget(960, 720);
  const pixel = new Uint8Array(4);
  water.setDetail(true);
  water.setSize(960, 720);
  camera.position.set(12, 1.65, 5);
  camera.lookAt(7, -0.4, 8);
  camera.updateMatrixWorld();
  // Mål den faktiske shaderens lysvei før farge, tåke og etterbehandling.
  material.fragmentShader = original.replace('vec3 trans = exp(-uAbsorb * path);',
    'gl_FragColor = vec4(vec3(path / 10.0), 1.0); return; vec3 trans = exp(-uAbsorb * path);');
  material.needsUpdate = true;
  try {
    const results = [];
    for (const high of [true, false]) {
      water.setQuality(high);
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      for (const [x, z] of [[7.5, 6.5], [8, 6.5], [8, 8], [10.5, 8], [8, 11]]) {
        const surface = new THREE.Vector3(x, water.mesh.position.y, z).project(camera);
        const px = Math.floor((surface.x * 0.5 + 0.5) * 960);
        const py = Math.floor((surface.y * 0.5 + 0.5) * 720);
        if (px < 0 || py < 0 || px >= 960 || py >= 720) continue;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2((px + 0.5) / 960 * 2 - 1, (py + 0.5) / 720 * 2 - 1), camera);
        const hit = raycaster.intersectObject(world.group, true).find((hit) => hit.object !== water.mesh
          && hit.object.material.depthWrite && hit.point.y < water.mesh.position.y - 0.01);
        if (!hit) throw new Error('Missing submerged geometry');
        const entry = (water.mesh.position.y - raycaster.ray.origin.y) / raycaster.ray.direction.y;
        const expected = high ? hit.distance - entry : material.uniforms.uSimpleDepth.value / Math.max(-raycaster.ray.direction.y, 0.12);
        renderer.readRenderTargetPixels(target, px, py, 1, 1, pixel);
        results.push({ high, x, z, expected, actual: pixel[0] / 255 * 10 });
      }
    }
    return results;
  } finally {
    renderer.setRenderTarget(null);
    target.dispose();
    material.fragmentShader = original;
    material.needsUpdate = true;
    water.setQuality(true);
  }
}
