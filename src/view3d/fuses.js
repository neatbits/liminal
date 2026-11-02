// Sikringsskapene i Lights out (gen/fuses.js): et grått metallskap på veggen med spak og en liten lampe
// som lyser rødt i mørket og grønt når skapet er slått på. Fargen tar lyset fra lysfeltet der skapet
// henger og dempes med strømmen (som kassettene, view3d/tapes.js); lampen lyser av seg selv.
import * as THREE from 'three';
import { withFlash } from '../world/flashlight.js';

const REACH = 1.2; // så nær man må stå (m)
const box = new THREE.BoxGeometry(0.36, 0.5, 0.1);
const door = new THREE.BoxGeometry(0.32, 0.44, 0.012).translate(0, 0, 0.056);
const lever = new THREE.BoxGeometry(0.03, 0.12, 0.03).translate(0, 0.05, 0);
const led = new THREE.BoxGeometry(0.03, 0.03, 0.01);
const RED = new THREE.Color('#ff2a1a');
const GREEN = new THREE.Color('#39ff6a');

export class Fuses {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'fuses';
    this.items = [];
  }

  get total() {
    return this.items.length;
  }

  get left() {
    return this.items.filter((f) => !f.on).length;
  }

  clear() {
    for (const f of this.items) {
      this.group.remove(f.mesh);
      for (const m of f.materials) m.dispose();
    }
    this.items = [];
  }

  /** Nye skap: fuses fra placeFuses, i etasjen `storey` (høyden `base`). */
  place(fuses, field, base = 0, storey = 0) {
    this.clear();
    for (const f of fuses) {
      const [dx, dz] = f.wall;
      const s = field.sample(f.px - dx * 0.1, f.y, f.pz - dz * 0.1, -dx, 0, -dz);
      // I lommelykten vises skapet selv i mørket (world/flashlight.js). Lampen lyser av seg selv.
      const [metal, panel, handle] = [[0.42, 0.44, 0.45], [0.55, 0.57, 0.58], [0.12, 0.12, 0.12]].map((c) => withFlash(new THREE.MeshBasicMaterial(), c));
      const light = new THREE.MeshBasicMaterial();
      const mesh = new THREE.Group();
      const leverMesh = new THREE.Mesh(lever, handle);
      leverMesh.position.set(0.1, -0.02, 0.07);
      const ledMesh = new THREE.Mesh(led, light);
      ledMesh.position.set(-0.11, 0.17, 0.065);
      mesh.add(new THREE.Mesh(box, metal), new THREE.Mesh(door, panel), leverMesh, ledMesh);
      mesh.position.set(f.px, base + f.y, f.pz);
      mesh.rotation.y = Math.atan2(-dx, -dz); // forsiden (+z) bort fra veggen
      this.group.add(mesh);
      const item = { ...f, storey, on: false, mesh, lever: leverMesh, materials: [metal, panel, handle, light], light: new THREE.Color(s[0], s[1], s[2]) };
      this.items.push(item);
      this._tint(item, 1);
    }
  }

  _tint(item, power) {
    const [metal, panel, handle, light] = item.materials;
    metal.color.setRGB(0.42, 0.44, 0.45).multiply(item.light).multiplyScalar(power);
    panel.color.setRGB(0.55, 0.57, 0.58).multiply(item.light).multiplyScalar(power);
    handle.color.setRGB(0.12, 0.12, 0.12).multiply(item.light).multiplyScalar(power);
    light.color.copy(item.on ? GREEN : RED);
    item.lever.rotation.x = item.on ? -0.9 : 0.9; // spaken opp når den er slått på
  }

  setPower(power) {
    for (const f of this.items) this._tint(f, Math.max(power, 0.12)); // skapet skimtes i mørket
  }

  /** Skapet man står ved og ser mot (i etasje `storey`) og som ikke er slått på ennå, eller null. */
  near(walker, storey = 0) {
    const facing = [-Math.sin(walker.yaw), -Math.cos(walker.yaw)];
    return this.items.find((f) => {
      const [tx, tz] = [f.px - walker.x, f.pz - walker.z];
      const d = Math.hypot(tx, tz);
      return !f.on && f.storey === storey && d < REACH && (facing[0] * tx + facing[1] * tz) / (d || 1) > 0.3;
    }) ?? null;
  }

  /** Nærmeste skap som er av (for summingen): { item, d } eller null. */
  nearestOff(x, z) {
    let best = null;
    for (const f of this.items) {
      const d = Math.hypot(f.px - x, f.pz - z);
      if (!f.on && (!best || d < best.d)) best = { item: f, d };
    }
    return best;
  }

  switchOn(item, power) {
    item.on = true;
    this._tint(item, power);
  }
}
