// Batteriene i The Descent: små, gule celler på gulvet (plassert som kassettene, gen/tapes.js). De lyser opp i
// lommelykten, og skimtes ellers bare der rommet er opplyst.
import * as THREE from 'three';
import { withFlash } from '../world/flashlight.js';

const REACH = 0.8; // hvor nær man må gå (m)
const body = new THREE.CylinderGeometry(0.035, 0.035, 0.13, 12).rotateZ(Math.PI / 2);
const cap = new THREE.CylinderGeometry(0.036, 0.036, 0.03, 12).rotateZ(Math.PI / 2).translate(0.07, 0, 0);

export class Batteries {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'batteries';
    this.items = [];
  }

  /** spots: [{ x, y, z, rot }] fra placeTapes. base: gulvhøyden i etasjen. */
  place(spots, field, base = 0) {
    this.clear();
    for (const t of spots) {
      const s = field.sample(t.x, t.y + 0.03, t.z, 0, 1, 0);
      const light = new THREE.Color(s[0], s[1], s[2]);
      const shell = withFlash(new THREE.MeshBasicMaterial(), [0.95, 0.72, 0.12]);
      const tip = withFlash(new THREE.MeshBasicMaterial(), [0.6, 0.6, 0.6]);
      const mesh = new THREE.Group();
      mesh.add(new THREE.Mesh(body, shell), new THREE.Mesh(cap, tip));
      mesh.position.set(t.x, base + t.y + 0.036, t.z);
      mesh.rotation.y = t.rot;
      this.group.add(mesh);
      this.items.push({ ...t, mesh, materials: [shell, tip], light });
    }
    this.setPower(1);
  }

  /** Strømmen (0..1): som kassettene blir de like mørke som rommet. */
  setPower(power) {
    for (const { materials: [shell, tip], light } of this.items) {
      shell.color.setRGB(0.95, 0.72, 0.12).multiply(light).multiplyScalar(power);
      tip.color.setRGB(0.6, 0.6, 0.6).multiply(light).multiplyScalar(power);
    }
  }

  /** Plukker opp det man står ved. Returnerer antallet. */
  pickUp(x, y, z) {
    const before = this.items.length;
    this.items = this.items.filter((t) => {
      if (Math.hypot(t.x - x, t.z - z) > REACH || Math.abs(t.y - y) > 1) return true;
      this.group.remove(t.mesh);
      for (const m of t.materials) m.dispose();
      return false;
    });
    return before - this.items.length;
  }

  clear() {
    for (const t of this.items) {
      this.group.remove(t.mesh);
      for (const m of t.materials) m.dispose();
    }
    this.items = [];
  }
}
