import * as THREE from 'three';

export function ballRenderError(viewer, index, body) {
  const item = viewer.world.objects.items[index];
  item.updateWorldMatrix(true, true);
  const centre = new THREE.Vector3(0, 0.075, 0).applyMatrix4(item.matrixWorld);
  return centre.distanceTo(new THREE.Vector3(body.position.x, body.position.y, body.position.z));
}
