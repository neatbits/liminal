// Contact sheet of imported models, before the app's baked lighting, for scale/orientation review.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { INTERIOR_OBJECTS } from '../src/core/object-catalog-interiors.js';

export async function previewModels(definitions = INTERIOR_OBJECTS) {
  document.body.replaceChildren();
  document.body.style.cssText = 'margin:0;background:#ddd;font:16px sans-serif';
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(1400, 1050);
  renderer.setScissorTest(true);
  document.body.append(renderer.domElement);
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  let k = 0;
  const sizes = {};
  for (const [id, def] of Object.entries(definitions)) {
    const { scene: model } = await loader.loadAsync(`/models/${def.file}.glb`);
    model.rotation.y = def.turn ?? 0;
    model.scale.setScalar(def.scale ?? 1);
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model, true), size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    sizes[id] = size.toArray();
    model.position.set(-center.x, -box.min.y, -center.z);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd9dee2);
    scene.add(model, new THREE.HemisphereLight(0xffffff, 0x7b7260, 2));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(3, 5, 4); scene.add(light);
    const extent = Math.max(size.x, size.y, size.z);
    const camera = new THREE.PerspectiveCamera(35, 4/3, 0.01, 100);
    camera.position.set(extent * 1.0, size.y * 0.5 + extent * 0.7, extent * 2.5);
    camera.lookAt(0, size.y / 2, 0);
    const x = (k % 4) * 350, y = Math.floor(k / 4) * 350;
    renderer.setViewport(x, 1050 - y - 350, 350, 350);
    renderer.setScissor(x, 1050 - y - 350, 350, 350);
    renderer.render(scene, camera);
    const label = document.createElement('div');
    label.textContent = `${id}: ${size.toArray().map(n=>n.toFixed(2)).join(' × ')}`;
    label.style.cssText = `position:absolute;left:${x+10}px;top:${y+8}px;color:#111;background:#fffd`;
    document.body.append(label);
    k++;
  }
  return sizes;
}
