// The roaming ghost: optimized cloth animation with a gentle hover above the AI path.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import modelURL from '../../models/animated_ghost_nightmare_mode.glb?url';
import { GHOST, ghostPose, ghostClothTime } from '../core/ghost.js';
import { ghostMaterial } from './ghost-material.js';

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
function disposeModel(model) {
  const resources = new Set();
  model.traverse(o => {
    if (!o.isMesh) return;
    resources.add(o.geometry);
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      resources.add(m);
      for (const value of Object.values(m)) if (value?.isTexture) resources.add(value);
    }
  });
  for (const resource of resources) resource.dispose();
}

export class Monster3D {
  constructor({ load = () => loader.loadAsync(modelURL) } = {}) {
    this.group = new THREE.Group();
    this.group.name = 'monster';
    this.group.visible = false;
    this.float = new THREE.Group();
    this.group.add(this.float);
    this.fetchModel = load;
    this.ready = null;
    this.time = 0;
    this.model = null;
    this.disposed = false;
    this.shown = false;
  }

  /** Load only in a mood that actually uses the ghost; repeated calls share one promise. */
  load() {
    if (this.disposed) return Promise.resolve(false);
    if (this.ready) return this.ready;
    this.ready = this.fetchModel()
      .then(gltf => {
        if (this.disposed) {
          disposeModel(gltf.scene);
          return false;
        }
        const model = gltf.scene;
        model.updateMatrixWorld(true);
        this.mixer = new THREE.AnimationMixer(model);
        for (const clip of gltf.animations) this.mixer.clipAction(clip).play();
        // The unused base pose makes default morph bounds much larger than the actual ghost.
        // Measure only the upright loop; the rest of the source clip collapses to the floor.
        const bounds = new THREE.Box3();
        for (let k = 0; k <= 16; k++) {
          this.mixer.setTime(ghostClothTime((GHOST.clothPeriod * k) / 16));
          model.updateMatrixWorld(true);
          bounds.union(new THREE.Box3().setFromObject(model, true));
        }
        this.mixer.setTime(0);
        const size = bounds.getSize(new THREE.Vector3());
        if (!(size.y > 0)) throw new Error('Ghost model has no height');
        const center = bounds.getCenter(new THREE.Vector3()),
          scale = GHOST.height / size.y;
        model.scale.multiplyScalar(scale);
        model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
        this.material = ghostMaterial();
        const oldMaterials = new Set();
        model.traverse(o => {
          if (o.isMesh) {
            for (const m of Array.isArray(o.material) ? o.material : [o.material]) oldMaterials.add(m);
            o.material = this.material;
          }
        });
        for (const m of oldMaterials) m.dispose();
        this.model = model;
        this.float.add(model);
        return true;
      })
      .catch(error => {
        this.error = error;
        console.warn('Ghost model could not load:', error);
        return false;
      });
    return this.ready;
  }

  update(dt, ai, player, power) {
    if (this.disposed) return;
    if (ai.visible) this.load();
    this.group.visible = ai.visible && !!this.model;
    if (!this.group.visible) {
      this.shown = false;
      return;
    }
    if (!this.shown) {
      this.time = 0;
      this.mixer.setTime(0);
      this.shown = true;
    }
    const step = Math.max(0, dt);
    this.time += step;
    this.mixer.setTime(ghostClothTime(this.time));
    const p = ghostPose(this.time, ai, player);
    this.group.position.set(p.x, p.y, p.z);
    this.group.rotation.y = p.yaw;
    this.float.rotation.set(p.pitch, 0, p.roll);
    this.material.uniforms.uDark.value = 1 - Math.max(0, Math.min(1, power ?? 1));
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.group.visible = false;
    this.mixer?.stopAllAction();
    if (this.model) this.mixer?.uncacheRoot(this.model);
    if (this.model) {
      disposeModel(this.model);
      this.float.remove(this.model);
      this.model = null;
    }
  }
}
