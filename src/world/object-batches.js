// Faste gjenstander tegnes samlet: deler med samme materiale innenfor en 16 × 16 m-gruppe slås
// sammen til én mesh, så like møbler deler tegnekall. Lyset er allerede bakt per vertex, så
// ingenting endres i utseendet. (32 m-grupper ga knapt færre kall, men 10 % flere trekanter.)
//
// De opprinnelige meshene blir liggende skjult i gjenstandsgruppene (`items`), med geometri som
// peker inn i den samlede (i forelderens koordinater, uten egen kopi) og en matrise som opphever
// gjenstandens. Grenser, materialer og antall deler kan dermed fortsatt leses per gjenstand.
// Bare faste gjenstander kan slås sammen: det som flyttes (fysikk, flyter, snurrer) må holdes utenfor.
import * as THREE from 'three';
import { SURFACE_CHUNK } from './chunks.js';

/**
 * @param meshes faste meshes, alle under `parent`
 * @param parent gruppen de samlede meshene legges i
 * @param orderFree materialer der tegnerekkefølgen ikke betyr noe (gjennomsiktige ellers holdes utenfor)
 * @returns {THREE.Mesh[]} de samlede meshene
 */
export function batchMeshes(meshes, parent, { orderFree = [], size = SURFACE_CHUNK } = {}) {
  parent.updateMatrixWorld(true);
  const toParent = parent.matrixWorld.clone().invert();
  const groups = new Map();
  for (const mesh of meshes) {
    const { geometry: g, material: m } = mesh;
    if (Array.isArray(m) || (m.transparent && !orderFree.includes(m)) || !g.index) continue;
    const names = Object.keys(g.attributes).sort();
    if (names.some((n) => !(g.attributes[n].array instanceof Float32Array) || g.attributes[n].isInterleavedBufferAttribute)) continue;
    const matrix = new THREE.Matrix4().multiplyMatrices(toParent, mesh.matrixWorld);
    const [x, z] = [matrix.elements[12], matrix.elements[14]];
    const key = `${m.uuid}|${Math.floor(x / size)},${Math.floor(z / size)}|${names.join()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ mesh, matrix });
  }
  const out = [];
  for (const list of groups.values()) if (list.length > 1) out.push(merge(list, parent));
  return out;
}

function merge(list, parent) {
  const first = list[0].mesh.geometry;
  const names = Object.keys(first.attributes);
  let vertices = 0, indices = 0;
  for (const { mesh } of list) {
    vertices += mesh.geometry.attributes.position.count;
    indices += mesh.geometry.index.count;
  }
  const arrays = Object.fromEntries(names.map((n) => [n, new Float32Array(vertices * first.attributes[n].itemSize)]));
  const index = vertices > 65535 ? new Uint32Array(indices) : new Uint16Array(indices);
  const v = new THREE.Vector3(), normalMatrix = new THREE.Matrix3();
  const ranges = [];
  let base = 0, at = 0;
  for (const { mesh, matrix } of list) {
    const g = mesh.geometry, count = g.attributes.position.count;
    for (const n of names) arrays[n].set(g.attributes[n].array.subarray(0, count * g.attributes[n].itemSize), base * g.attributes[n].itemSize);
    normalMatrix.getNormalMatrix(matrix);
    for (let i = base; i < base + count; i++) {
      v.fromArray(arrays.position, i * 3).applyMatrix4(matrix).toArray(arrays.position, i * 3);
      if (arrays.normal) v.fromArray(arrays.normal, i * 3).applyMatrix3(normalMatrix).normalize().toArray(arrays.normal, i * 3);
    }
    for (let i = 0; i < g.index.count; i++) index[at + i] = g.index.getX(i) + base;
    ranges.push([base, count]);
    base += count;
    at += g.index.count;
  }
  const geometry = new THREE.BufferGeometry();
  for (const n of names) geometry.setAttribute(n, new THREE.BufferAttribute(arrays[n], first.attributes[n].itemSize));
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  geometry.computeBoundingSphere();
  const batch = new THREE.Mesh(geometry, list[0].mesh.material);
  batch.name = 'objectBatch';
  batch.userData.source = list[0].mesh.name; // f.eks. contactShadow (gulvspeilingen utelater dem)
  parent.add(batch);

  list.forEach(({ mesh }, k) => {
    const [start, count] = ranges[k];
    const view = new THREE.BufferGeometry();
    for (const n of names) {
      const size = first.attributes[n].itemSize;
      view.setAttribute(n, new THREE.BufferAttribute(arrays[n].subarray(start * size, (start + count) * size), size));
    }
    view.computeBoundingBox();
    mesh.geometry.dispose(); // kan allerede være lastet opp mens resten av rommet ble bygget
    mesh.geometry = view;
    mesh.visible = false;
    // Punktene ligger nå i forelderens koordinater: opphev gjenstandens egen plassering.
    mesh.matrixAutoUpdate = false;
    mesh.matrix.copy(mesh.parent.matrixWorld).invert().multiply(parent.matrixWorld);
    mesh.updateMatrixWorld(true);
  });
  return batch;
}
