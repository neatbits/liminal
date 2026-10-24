import * as THREE from 'three';

/** Bakt lys per vertex for en kopi i verdenen (posisjon og normal etter dreiningen). */
export function bakeLight(geometry, matrix, field, doubleSided = false) {
  const pos = geometry.attributes.position;
  const nor = geometry.attributes.normal;
  const light = new Float32Array(pos.count * 3);
  const flick = new Float32Array(pos.count * 4);
  const backLight = doubleSided ? new Float32Array(light.length) : null;
  const backFlick = doubleSided ? new Float32Array(flick.length) : null;
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const rot = new THREE.Matrix3().getNormalMatrix(matrix);
  const q = (v, s) => Math.round(v / s) * s; // nærliggende punkter deler lysprøve (bufret i feltet)
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i).applyMatrix4(matrix);
    n.fromBufferAttribute(nor, i).applyMatrix3(rot).normalize();
    const s = field.sample(q(p.x, 0.05), q(p.y, 0.05), q(p.z, 0.05), q(n.x, 0.25), q(n.y, 0.25), q(n.z, 0.25));
    light.set([s[0], s[1], s[2]], i * 3);
    flick.set([s[3], s[4], s[5], s[6]], i * 4);
    if (doubleSided) {
      const b = field.sample(q(p.x, 0.05), q(p.y, 0.05), q(p.z, 0.05), q(-n.x, 0.25), q(-n.y, 0.25), q(-n.z, 0.25));
      backLight.set([b[0], b[1], b[2]], i * 3);
      backFlick.set([b[3], b[4], b[5], b[6]], i * 4);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', pos);
  if (nor) g.setAttribute('normal', nor);
  if (geometry.attributes.uv) g.setAttribute('uv', geometry.attributes.uv);
  g.setIndex(geometry.index);
  g.setAttribute('aLight', new THREE.BufferAttribute(light, 3));
  g.setAttribute('aFlick', new THREE.BufferAttribute(flick, 4));
  if (doubleSided) {
    g.setAttribute('aBackLight', new THREE.BufferAttribute(backLight, 3));
    g.setAttribute('aBackFlick', new THREE.BufferAttribute(backFlick, 4));
  }
  return g;
}

