import * as THREE from 'three';

export function inspectEscalatorFloor(viewer, run) {
  const ray = new THREE.Raycaster();
  ray.set(new THREE.Vector3(run.origin[0] + run.dir[0] * run.length / 2, run.low + 0.3,
    run.origin[1] + run.width / 2), new THREE.Vector3(0, -1, 0));
  viewer.scene.updateMatrixWorld(true);
  return ray.intersectObject(viewer.world.group, true).map((hit) => ({ mesh: hit.object.name, point: hit.point.toArray(), face: hit.faceIndex }));
}
