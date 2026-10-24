// Cannon shapes follow the visible profile rather than an invisible enclosing box.
import * as CANNON from 'cannon-es';
import { softProfile } from '../core/soft-forms.js';

export function addSoftShape(body, def) {
  const [w, h, d] = def.size;
  if (def.softForm === 'cylinder') {
    body.addShape(new CANNON.Cylinder(w / 2, w / 2, h, 24));
  } else if (def.softForm === 'ramp') {
    const profile = softProfile('ramp', h, d), count = profile.length;
    const vertices = [-w / 2, w / 2].flatMap(x => profile.map(([z, y]) => new CANNON.Vec3(x, y - h / 2, z)));
    const faces = [Array.from({ length: count }, (_, i) => i), Array.from({ length: count }, (_, i) => count * 2 - i - 1)];
    for (let i = 0; i < count; i++) faces.push([i, i + count, (i + 1) % count + count, (i + 1) % count]);
    body.addShape(new CANNON.ConvexPolyhedron({ vertices, faces }));
  } else if (def.softForm === 'steps') {
    body.addShape(new CANNON.Box(new CANNON.Vec3(w / 2, h / 4, d / 2)), new CANNON.Vec3(0, -h / 4, 0));
    body.addShape(new CANNON.Box(new CANNON.Vec3(w / 2, h / 4, d / 4)), new CANNON.Vec3(0, h / 4, -d / 4));
  } else {
    body.addShape(new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)));
  }
}
