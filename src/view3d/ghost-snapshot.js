// Spøkelset utenfor vinduene er den samme modellen som monsteret (Monster3D): tegnet én gang
// forfra, stillestående i en tilfeldig kledestilling, til et lite bilde med gjennomsiktig bakgrunn.
// Vindusutsikten (world/window-ghost-view.js) setter bildet ute; ingenting tegnes per ramme.
import * as THREE from 'three';
import { Monster3D } from './monster.js';
import { GHOST, ghostClothTime } from '../core/ghost.js';

const SIZE = [256, 384]; // piksler: rundt 30–60 px på skjermen, så mipmaps gir glatte kanter

export class GhostSnapshot {
  constructor(renderer) {
    this.renderer = renderer;
    this.monster = new Monster3D();
    this.scene = new THREE.Scene();
    this.scene.add(this.monster.group);
    this.camera = new THREE.OrthographicCamera();
    this.target = null;
  }

  /** @returns {Promise<{ texture, width, height } | null>} bredde/høyde i meter (fra kanten nederst) */
  async take(rand = Math.random) {
    const m = this.monster;
    if (!(await m.load()) || m.disposed) return null;
    m.group.visible = true;
    m.mixer.setTime(ghostClothTime(rand() * GHOST.clothPeriod));
    m.group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(m.group, true);
    const size = box.getSize(new THREE.Vector3()), centre = box.getCenter(new THREE.Vector3());
    const width = Math.max(size.x, size.z) * 1.08, height = size.y * 1.04;
    Object.assign(this.camera, { left: -width / 2, right: width / 2, top: height / 2, bottom: -height / 2, near: 0.01, far: 20 });
    this.camera.position.set(centre.x, centre.y, box.max.z + 5);
    this.camera.lookAt(centre.x, centre.y, centre.z);
    this.camera.updateProjectionMatrix();
    this.target ??= new THREE.WebGLRenderTarget(...SIZE, { samples: 4, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
    const r = this.renderer, previous = r.getRenderTarget();
    const clear = r.getClearColor(new THREE.Color()), alpha = r.getClearAlpha();
    m.material.uniforms.uDark.value = 0;
    try {
      r.setRenderTarget(this.target);
      r.setClearColor(0x000000, 0);
      r.clear();
      r.render(this.scene, this.camera);
    } finally {
      r.setRenderTarget(previous);
      r.setClearColor(clear, alpha);
    }
    // Bildet dekker modellens bredde rundt midten og høyden fra like under kanten nederst.
    return { texture: this.target.texture, width, height };
  }

  dispose() {
    this.monster.dispose();
    this.target?.dispose();
  }
}
