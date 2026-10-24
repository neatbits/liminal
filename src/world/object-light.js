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
  // Nærliggende punkter deler lysprøve (bufret i feltet): 5 cm og normaltrinn på 0,25. Delt på
  // heltall, så verdiene ligger eksakt på gitteret og får tallnøkkel (light-grid.js).
  const q = (v, s) => Math.round(v * s) / s;
  // Gjenstandsprøver deler siktlinjer mellom normaler og sider (lighting.js objectSample).
  const sample = field.objectSample ?? ((x, y, z, a, b, c, both) =>
    both ? [field.sample(x, y, z, a, b, c), field.sample(x, y, z, -a, -b, -c)] : field.sample(x, y, z, a, b, c));
  const write = (target, flicker, s, i) => {
    target[i * 3] = s[0];
    target[i * 3 + 1] = s[1];
    target[i * 3 + 2] = s[2];
    for (let k = 0; k < 4; k++) flicker[i * 4 + k] = s[3 + k];
  };
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i).applyMatrix4(matrix);
    n.fromBufferAttribute(nor, i).applyMatrix3(rot).normalize();
    const at = [q(p.x, 20), q(p.y, 20), q(p.z, 20), q(n.x, 4), q(n.y, 4), q(n.z, 4)];
    if (doubleSided) {
      const [s, b] = sample(...at, true);
      write(light, flick, s, i);
      write(backLight, backFlick, b, i);
    } else write(light, flick, sample(...at), i);
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

