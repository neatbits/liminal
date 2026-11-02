// Skikkelsen utenfor vinduene er den samme som monsteret (Monster3D): tegnet én gang forfra,
// stillestående, til et lite bilde med gjennomsiktig bakgrunn. Vindusutsikten
// (world/window-ghost-view.js) setter bildet ute; ingenting tegnes per ramme.
import * as THREE from 'three';
import { Monster3D } from './monster.js';
import { FIGURE } from '../core/figure.js';

const SIZE = [256, 384]; // piksler: rundt 30–60 px på skjermen, så mipmaps gir glatte kanter

export class FigureSnapshot {
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
    const [width, height] = FIGURE.plane;
    Object.assign(this.camera, { left: -width / 2, right: width / 2, top: height / 2, bottom: -height / 2, near: 0.01, far: 20 });
    this.camera.position.set(0, height / 2, 5);
    this.camera.lookAt(0, height / 2, 0);
    this.camera.updateProjectionMatrix();
    this.target ??= new THREE.WebGLRenderTarget(...SIZE, { samples: 4, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
    const r = this.renderer, previous = r.getRenderTarget();
    const clear = r.getClearColor(new THREE.Color()), alpha = r.getClearAlpha();
    const u = m.material.uniforms;
    u.uDark.value = 0;
    u.uTime.value = rand() * 100; // en tilfeldig kant på røyken
    try {
      r.setRenderTarget(this.target);
      r.setClearColor(0x000000, 0);
      r.clear();
      r.render(this.scene, this.camera);
    } finally {
      r.setRenderTarget(previous);
      r.setClearColor(clear, alpha);
    }
    return { texture: this.target.texture, width, height };
  }

  dispose() {
    this.monster.dispose();
    this.target?.dispose();
  }
}
