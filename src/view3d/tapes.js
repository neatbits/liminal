// VHS-kassetter i gåmodus: små, svarte kassetter med etikett som ligger rundt i rommet
// (plassert av gen/tapes.js). Man plukker dem opp ved å gå bort til dem. Fargen tar lyset
// fra lysfeltet der kassetten ligger, og dempes under strømbrudd.
import * as THREE from 'three';
import { placeTapes } from '../gen/tapes.js';

const REACH = 0.7; // hvor nær man må gå (m)
const shell = new THREE.BoxGeometry(0.188, 0.025, 0.104);
const label = new THREE.BoxGeometry(0.15, 0.004, 0.05);
label.translate(0, 0.0145, -0.012);

export class Tapes {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'tapes';
    this.items = [];
  }

  get left() {
    return this.items.length;
  }

  clear() {
    for (const t of this.items) {
      this.group.remove(t.mesh);
      for (const m of t.materials) m.dispose();
    }
    this.items = [];
  }

  /**
   * Nye kassetter for rommet. Returnerer hvor mange.
   * @param skip (x, z) → true for ruter kassettene ikke skal ligge i
   */
  place(level, field, spawn, rand = Math.random, skip = null) {
    return this.placeFloors([{ level, field, spawn, skip }], rand);
  }

  /**
   * Kassetter i flere etasjer (view3d/storeys.js): floors = [{ level, field, spawn, skip, base, count }].
   * Hver kassett husker etasjen sin (`storey`) og ligger i etasjehøyden (`base`).
   */
  placeFloors(floors, rand = Math.random) {
    this.clear();
    floors.forEach(({ level, field, spawn, skip = null, base = 0, count }, storey) => {
      for (const t of placeTapes(level, spawn, rand, count, skip)) this._add({ ...t, storey, base }, field);
    });
    return this.items.length;
  }

  _add(t, field) {
    const s = field.sample(t.x, t.y + 0.03, t.z, 0, 1, 0);
    const light = new THREE.Color(s[0], s[1], s[2]);
    const body = new THREE.MeshBasicMaterial();
    const paper = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Group();
    mesh.add(new THREE.Mesh(shell, body), new THREE.Mesh(label, paper));
    mesh.position.set(t.x, t.base + t.y + 0.0125, t.z);
    mesh.rotation.y = t.rot;
    this.group.add(mesh);
    const item = { ...t, mesh, materials: [body, paper], light };
    this.items.push(item);
    this._tint(item, 1);
  }

  _tint(item, power) {
    const [body, paper] = item.materials;
    body.color.setRGB(0.06, 0.06, 0.065).multiply(item.light).multiplyScalar(power);
    paper.color.setRGB(0.92, 0.88, 0.78).multiply(item.light).multiplyScalar(power * 1.2);
  }

  /** Strømmen (0..1): kassettene blir like mørke som rommet. */
  setPower(power) {
    for (const t of this.items) this._tint(t, power);
  }

  /** Plukker opp kassetter man står ved (i etasje `storey`). Returnerer antall plukket opp nå. */
  pickUp(x, y, z, storey = 0) {
    const before = this.items.length;
    this.items = this.items.filter((t) => {
      if (t.storey !== storey || Math.hypot(t.x - x, t.z - z) > REACH || Math.abs(t.y - y) > 1) return true;
      this.group.remove(t.mesh);
      for (const m of t.materials) m.dispose();
      return false;
    });
    return before - this.items.length;
  }
}
