// Lysarmaturene i taket som instansierte mesher (én per tilstand/blinkegruppe).
import * as THREE from 'three';
import { LIGHT } from '../core/level.js';
import { FLICKER_GROUPS } from './lighting.js';

function fixtureGeometry(f) {
  if (f.shape === 'disc') return new THREE.CylinderGeometry(f.size[0] / 2, f.size[0] / 2.4, f.size[1], 20);
  if (f.shape === 'dome') {
    // Takplafond: nedre halvkule, flatet ut til høyden size[1] og sentrert som de andre.
    const g = new THREE.SphereGeometry(f.size[0] / 2, 24, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    g.scale(1, f.size[1] / (f.size[0] / 2), 1);
    g.translate(0, f.size[1] / 2, 0);
    return g;
  }
  return new THREE.BoxGeometry(f.size[0], f.size[1], f.size[2]);
}

function instanced(geometry, material, items, y) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, items.length));
  mesh.count = items.length;
  const m = new THREE.Matrix4();
  items.forEach((l, i) => {
    m.makeTranslation(l.x, y(l), l.z);
    mesh.setMatrixAt(i, m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

/**
 * @param lights resultatet av collectLights
 * @returns {{ group, update(values), dispose() }}
 */
export function buildFixtures(lights, theme) {
  const f = theme.fixture;
  const group = new THREE.Group();
  const geometry = fixtureGeometry(f);
  const glow = new THREE.Color(f.color).multiplyScalar(f.glow);
  const tinted = new THREE.Color();
  const tintColor = new THREE.Color();
  const drop = f.drop ?? 0;
  const y = (l) => l.top - f.size[1] / 2 - drop - 0.005;
  const disposables = [geometry];

  const add = (items, color) => {
    const material = new THREE.MeshBasicMaterial({ color });
    disposables.push(material);
    if (items.length) group.add(instanced(geometry, material, items, y));
    return material;
  };

  const onMaterial = add(
    lights.filter((l) => l.state === LIGHT.ON),
    glow.clone(),
  );
  add(
    lights.filter((l) => l.state === LIGHT.BROKEN),
    new THREE.Color('#3a3934'),
  );
  const flickerMaterials = [];
  for (let g = 0; g < FLICKER_GROUPS; g++) {
    flickerMaterials.push(add(lights.filter((l) => l.state === LIGHT.FLICKER && l.group === g), glow.clone()));
  }

  if (f.frame && lights.length) {
    const frameGeo = new THREE.BoxGeometry(f.size[0] + 0.08, 0.02, f.size[2] + 0.08);
    const frameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(f.frame).multiplyScalar(0.55) });
    disposables.push(frameGeo, frameMat);
    group.add(instanced(frameGeo, frameMat, lights, (l) => l.top - 0.012 - drop));
  }

  // Lamper som henger ned i høye rom (top under taket): en tynn ledning opp til taket.
  const hanging = lights.filter((l) => l.ceil - l.top > 0.05);
  if (hanging.length) {
    const cordGeo = new THREE.CylinderGeometry(0.008, 0.008, 1, 4).translate(0, 0.5, 0);
    const cordMat = new THREE.MeshBasicMaterial({ color: '#1c1b18' });
    disposables.push(cordGeo, cordMat);
    const cords = new THREE.InstancedMesh(cordGeo, cordMat, hanging.length);
    const m = new THREE.Matrix4();
    hanging.forEach((l, i) => cords.setMatrixAt(i, m.makeScale(1, l.ceil - l.top + drop, 1).setPosition(l.x, l.top - drop, l.z)));
    cords.instanceMatrix.needsUpdate = true;
    cords.computeBoundingSphere();
    group.add(cords);
  }

  return {
    group,
    /** values: blinkegruppene (0..1), power: strømmen (0..1, under strømbrudd), tint: lysfargen ([r, g, b]). */
    update(values, power = 1, tint = [1, 1, 1]) {
      tinted.copy(glow).multiply(tintColor.setRGB(tint[0], tint[1], tint[2]));
      onMaterial.color.copy(tinted).multiplyScalar(power);
      for (let g = 0; g < FLICKER_GROUPS; g++) {
        flickerMaterials[g].color.copy(tinted).multiplyScalar((0.04 + 0.96 * values[g]) * power);
      }
    },
    dispose() {
      for (const d of disposables) d.dispose();
    },
  };
}
