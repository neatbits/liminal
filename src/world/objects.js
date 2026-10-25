// Gjenstander (ferdige 3D-modeller, se core/objects.js) i 3D. Hver .glb lastes én gang (eller
// bygges av enkle former, props.js) og sentreres (midt på i x/z, bunnen i y = 0); hver kopi får det bakte lyset fra lysfeltet per
// vertex, så den passer inn i rommet, og en myk kontaktskygge på gulvet.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { OBJECTS, poser } from '../core/objects.js';
import { VERT, FRAG } from './object-shader.js';
import { buildProp, propKey } from './props.js';
import { bakeLight } from './object-light.js';
import { arcadeParts } from './arcade-textures.js';
import { contactShadows } from './contact-shadows.js';
import { batchMeshes } from './object-batches.js';
import { mergeParts } from './object-parts.js';
import { tipOrigin, tipQuaternion } from '../core/object-tip.js';

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

/** Midt på i x/z og bunnen i y = 0 (deler som stikker utenfor fotavtrykket, overhang, teller ikke). */
function center(parts) {
  const box = new THREE.Box3();
  for (const p of parts) {
    if (p.overhang) continue;
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
              materialName: mat.name,
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
      const m = new THREE.ShaderMaterial({ uniforms, defines: part.vinyl ? { SOFT_VINYL: 1 } : {},
        vertexShader: VERT, fragmentShader: FRAG, fog: true, side: part.side });
      materials.set(part, m);
      owned.push(m);
    }
    return materials.get(part);
  };

  const items = [];
  const poseOf = poser(level); // del plasseringene mellom modellene, også for stablede klosser
  const makeShadow = contactShadows(level, poseOf, owned);
  const spinners = []; // gjenstander som snurrer (takvifter)
  const fixed = []; // gjenstander som aldri flyttes: tegnes samlet (object-batches.js)
  const jobs = (level.objects ?? []).map(async (o, index) => {
    const def = OBJECTS[o.id];
    if (!def) return;
    let parts = await (def.build ? loadProp(propKey(def, level, o)) : loadModel(def.file, def.turn));
    if (o.id === 'arcade2') parts = await arcadeParts(parts, o);
    // Skjermstøy (uScreen) og arkadekassene avhenger av UV-ene og navnene på enkeltdelene.
    else if (!def.screen) parts = mergeParts(parts);
    if (disposed) return;
    const pose = poseOf(o);
    const s = def.scale ?? 1;
    // Dreid med rot – og veltet (o.tip: stolene i haugene), med bunnpunktet der veltingen legger det.
    const origin = new THREE.Vector3(...tipOrigin(pose, def.size));
    const turn = new THREE.Quaternion(...tipQuaternion(pose, def.size));
    const matrix = new THREE.Matrix4().compose(origin, turn, new THREE.Vector3(s, s, s));
    const item = new THREE.Group();
    item.position.copy(origin);
    item.quaternion.copy(turn);
    item.scale.setScalar(s);
    for (const part of parts) {
      const geometry = bakeLight(part.geometry, matrix, field, part.side === THREE.DoubleSide);
      owned.push(geometry);
      item.add(new THREE.Mesh(geometry, materialFor(part, def)));
    }
    items[index] = item;
    if (def.spin) spinners.push([item, def.spin]);
    group.add(item);
    if (!def.floats && !def.soft && !def.loose && !def.spin) fixed.push(item);
    const shadow = makeShadow(o);
    if (!shadow) return;
    item.userData.shadow = shadow; // følger med når fysikken flytter gjenstanden (view3d/softplay.js)
    group.add(shadow);
  });
  const ready = Promise.allSettled(jobs).then((results) => {
    for (const r of results) if (r.status === 'rejected') console.warn(r.reason);
    field?.releaseObjectSamples?.();
    if (disposed) return;
    const shadows = fixed.map((item) => item.userData.shadow).filter(Boolean);
    // Kontaktskyggene er svarte: overlapp gir samme resultat i hvilken som helst rekkefølge.
    const orderFree = [...new Set(shadows.map((s) => s.material))];
    for (const batch of batchMeshes([...fixed.flatMap((item) => item.children), ...shadows], group, { orderFree })) {
      owned.push(batch.geometry);
    }
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
