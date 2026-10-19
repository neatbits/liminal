// Gjenstander (ferdige 3D-modeller, se core/objects.js) i 3D. Hver .glb lastes én gang (eller
// bygges av enkle former, props.js) og sentreres (midt på i x/z, bunnen i y = 0); hver kopi får det bakte lyset fra lysfeltet per
// vertex, så den passer inn i rommet, og en myk kontaktskygge på gulvet.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { OBJECTS, objectPose } from '../core/objects.js';
import { TILE } from '../core/level.js';
import { VERT, FRAG } from './object-shader.js';
import { buildProp, propKey } from './props.js';

// Konverterte modeller (npm run models) – Vite gir hver fil en URL med hash.
const URLS = Object.fromEntries(
  Object.entries(import.meta.glob('../../models/*.glb', { query: '?url', import: 'default', eager: true })).map(([path, url]) => [
    path.split('/').pop().replace('.glb', ''),
    url,
  ]),
);

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache = new Map();

/** Attributt som Float32 (modellene er kvantiserte/normaliserte etter komprimeringen). */
function toFloat(attr, size) {
  const out = new Float32Array(attr.count * size);
  for (let i = 0; i < attr.count; i++) for (let k = 0; k < size; k++) out[i * size + k] = attr.getComponent(i, k);
  return new THREE.BufferAttribute(out, size);
}

/** Bygger en gjenstand av enkle former (props.js), sentrert som de lastede modellene. */
function loadProp(key) {
  if (!cache.has(key)) {
    const parts = buildProp(key);
    cache.set(key, Promise.resolve(center(parts)));
  }
  return cache.get(key);
}

/** Midt på i x/z og bunnen i y = 0. */
function center(parts) {
  const box = new THREE.Box3();
  for (const p of parts) {
    p.geometry.computeBoundingBox();
    box.union(p.geometry.boundingBox);
  }
  const c = box.getCenter(new THREE.Vector3());
  for (const p of parts) p.geometry.translate(-c.x, -box.min.y, -c.z);
  return parts;
}

/** Laster og forbereder en modell: [{ geometry, map, arm, color }], sentrert. */
function loadModel(file, turn = 0) {
  if (!cache.has(file)) {
    const url = URLS[file];
    const promise = url
      ? loader.loadAsync(url).then((gltf) => {
          gltf.scene.updateMatrixWorld(true);
          const parts = [];
          gltf.scene.traverse((m) => {
            if (!m.isMesh) return;
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', toFloat(m.geometry.attributes.position, 3));
            if (m.geometry.attributes.uv) g.setAttribute('uv', toFloat(m.geometry.attributes.uv, 2));
            if (m.geometry.index) g.setIndex(m.geometry.index);
            // Noen modeller (med «unlit»-materialer) har ingen normaler: regn dem ut.
            if (m.geometry.attributes.normal) g.setAttribute('normal', toFloat(m.geometry.attributes.normal, 3));
            else g.computeVertexNormals();
            g.applyMatrix4(m.matrixWorld);
            if (turn) g.rotateY(turn); // forsiden mot +z
            const mat = m.material;
            parts.push({
              geometry: g,
              map: mat.map ?? null,
              arm: mat.metalnessMap ?? mat.roughnessMap ?? null,
              color: mat.color ?? new THREE.Color(1, 1, 1),
              alphaTest: mat.alphaTest ?? 0,
              side: mat.side ?? THREE.FrontSide,
            });
          });
          return center(parts);
        })
      : Promise.reject(new Error(`Missing model file: ${file}.glb (run npm run models)`));
    cache.set(file, promise);
  }
  return cache.get(file);
}

/** Bakt lys per vertex for en kopi i verdenen (posisjon og normal etter dreiningen). */
function bakeLight(geometry, matrix, field) {
  const pos = geometry.attributes.position;
  const nor = geometry.attributes.normal;
  const light = new Float32Array(pos.count * 3);
  const flick = new Float32Array(pos.count * 4);
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
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', pos);
  if (geometry.attributes.uv) g.setAttribute('uv', geometry.attributes.uv);
  g.setIndex(geometry.index);
  g.setAttribute('aLight', new THREE.BufferAttribute(light, 3));
  g.setAttribute('aFlick', new THREE.BufferAttribute(flick, 4));
  return g;
}

let shadowTexture = null;
function contactShadow() {
  if (!shadowTexture) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 32);
    grad.addColorStop(0, 'rgba(0,0,0,0.55)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    shadowTexture = new THREE.CanvasTexture(c);
  }
  return shadowTexture;
}

/**
 * Gjenstandene i rommet. Modellene lastes i bakgrunnen; `ready` løses når alle er på plass.
 * Hver gjenstand er en egen gruppe (`items[i]` for level.objects[i]) som kan flyttes – flytende
 * gjenstander dyttes rundt i gåmodus (view3d/floaters.js). Lyset er bakt der den står i editoren.
 * @returns {{ group, items: Array<THREE.Group|undefined>, ready: Promise, update(dt), dispose() }}
 */
export function createObjects(level, field, shared) {
  const group = new THREE.Group();
  group.name = 'objects';
  const owned = [];
  let disposed = false;
  const shadowMat = new THREE.MeshBasicMaterial({ map: contactShadow(), transparent: true, depthWrite: false, color: 0x000000 });
  owned.push(shadowMat);
  const materials = new Map(); // én per modelldel
  const materialFor = (part, def) => {
    if (!materials.has(part)) {
      const uniforms = Object.assign(THREE.UniformsUtils.merge([THREE.UniformsLib.fog]), shared, {
        map: { value: part.map },
        arm: { value: part.arm },
        uColor: { value: part.color },
        uHasMap: { value: part.map ? 1 : 0 },
        uHasArm: { value: part.arm ? 1 : 0 },
        uAlphaTest: { value: part.alphaTest },
        uUnlit: { value: part.unlit ? 1 : 0 },
        uScreen: { value: new THREE.Vector4(...(def.screen ?? [0, 0, 0, 0])) },
      });
      const m = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, fog: true, side: part.side });
      materials.set(part, m);
      owned.push(m);
    }
    return materials.get(part);
  };

  const items = [];
  const spinners = []; // gjenstander som snurrer (takvifter)
  const jobs = (level.objects ?? []).map(async (o, index) => {
    const def = OBJECTS[o.id];
    if (!def) return;
    const parts = await (def.build ? loadProp(propKey(def, level, o)) : loadModel(def.file, def.turn));
    if (disposed) return;
    const pose = objectPose(level, o);
    const s = def.scale ?? 1;
    const matrix = new THREE.Matrix4()
      .makeRotationY((-pose.rot * Math.PI) / 2)
      .scale(new THREE.Vector3(s, s, s))
      .setPosition(pose.x, pose.y, pose.z);
    const item = new THREE.Group();
    item.position.set(pose.x, pose.y, pose.z);
    item.rotation.y = (-pose.rot * Math.PI) / 2;
    item.scale.setScalar(s);
    for (const part of parts) {
      const geometry = bakeLight(part.geometry, matrix, field);
      owned.push(geometry);
      item.add(new THREE.Mesh(geometry, materialFor(part, def)));
    }
    items[index] = item;
    if (def.spin) spinners.push([item, def.spin]);
    group.add(item);
    if (def.floats && level.tiles[o.z * level.w + o.x] === TILE.WATER) return; // flyter: ingen skygge på vannet
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(pose.w * 1.5, pose.d * 1.5), shadowMat);
    owned.push(shadow.geometry);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(pose.x, pose.y + 0.004, pose.z);
    group.add(shadow);
  });
  const ready = Promise.allSettled(jobs).then((results) => {
    for (const r of results) if (r.status === 'rejected') console.warn(r.reason);
  });

  return {
    group,
    items,
    ready,
    /** Takvifter snurrer. */
    update(dt) {
      for (const [item, spin] of spinners) item.rotation.y += spin * dt;
    },
    dispose() {
      disposed = true;
      for (const d of owned) d.dispose();
    },
  };
}
