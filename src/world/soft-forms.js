import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { softProfile } from '../core/soft-forms.js';
import { softRadius } from './soft-geometry.js';

/** Rounded profiles/cylinder, fitted exactly inside the same bounds as their physics bodies. */
export function softFormGeometry(form, w, h, d) {
  let g;
  const r = softRadius(w, h, d);
  if (form === 'cylinder') {
    const radius = w / 2, points = [new THREE.Vector2(0, 0), new THREE.Vector2(radius - r, 0)];
    for (let k = 1; k <= 4; k++) {
      const a = k / 4 * Math.PI / 2;
      points.push(new THREE.Vector2(radius - r + Math.sin(a) * r, r - Math.cos(a) * r));
    }
    points.push(new THREE.Vector2(radius, h - r));
    for (let k = 1; k <= 4; k++) {
      const a = k / 4 * Math.PI / 2;
      points.push(new THREE.Vector2(radius - r + Math.cos(a) * r, h - r + Math.sin(a) * r));
    }
    points.push(new THREE.Vector2(0, h));
    g = new THREE.LatheGeometry(points, 24).toNonIndexed();
  } else {
    const shape = new THREE.Shape(softProfile(form, h, d).map(([z, y]) => new THREE.Vector2(z, y)));
    g = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: true, bevelSize: r, bevelThickness: r, bevelSegments: 2, steps: 1 });
    g.rotateY(-Math.PI / 2);
    g.computeBoundingBox();
    const b = g.boundingBox, size = b.getSize(new THREE.Vector3());
    g.translate(-b.min.x, -b.min.y, -b.min.z);
    g.scale(w / size.x, h / size.y, d / size.z);
    g.translate(-w / 2, 0, -d / 2);
  }
  g.normalizeNormals();
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  // Project onto the six atlas panels. Circular caps get their own stitched ring below.
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let face, u, v;
    if (ay > ax && ay > az) {
      face = n.getY(i) > 0 ? 2 : 3; u = .5 + p.getX(i) / w; v = .5 - p.getZ(i) / d;
    } else if (form === 'cylinder') {
      face = 4; u = .5 + Math.atan2(p.getX(i), p.getZ(i)) / (Math.PI * 2); v = p.getY(i) / h;
    } else if (ax > az) {
      face = n.getX(i) > 0 ? 0 : 1; u = .5 + p.getZ(i) / d; v = p.getY(i) / h;
    } else {
      face = n.getZ(i) > 0 ? 4 : 5; u = .5 + p.getX(i) / w; v = p.getY(i) / h;
    }
    uv.setXY(i, (face % 3 + (1 + u * 254) / 256) / 3, (1 - Math.floor(face / 3) + (1 + v * 254) / 256) / 2);
  }
  g.clearGroups();
  const result = mergeVertices(g); g.dispose();
  return result;
}
