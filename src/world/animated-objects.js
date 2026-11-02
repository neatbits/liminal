// Animerte gjenstander (OBJECTS med animate: true, f.eks. ekspeditøren i Noclip): modellen beholder skjelettet og den
// første animasjonen spilles i løkke. Lyset kan ikke bakes per vertex når kroppen beveger seg, så fargen får lyset fra
// lysfeltet der den står (sett forfra, i brysthøyde), og lommelykten lyser den opp som de andre enkle materialene.
import * as THREE from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { withFlash } from './flashlight.js';

const gltfs = new Map();

/** Én kopi av modellen per gjenstand, med egen AnimationMixer. Returnerer { item, mixer, materials }. */
export async function animatedItem(loader, url, def, field, origin, quaternion, scale) {
  if (!gltfs.has(url)) gltfs.set(url, loader.loadAsync(url));
  const gltf = await gltfs.get(url);
  const scene = clone(gltf.scene);
  if (def.turn) scene.rotation.y = def.turn;
  const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion);
  const s = field ? field.sample(origin.x, origin.y + 1.3, origin.z, forward.x, 0, forward.z) : [1, 1, 1, 0, 0, 0, 0];
  const glow = (s[3] + s[4] + s[5] + s[6]) * 0.25; // blinkende lys rundt: et snitt
  const light = new THREE.Color(s[0] + glow, s[1] + glow, s[2] + glow);
  const materials = [];
  scene.traverse((m) => {
    if (!m.isMesh) return;
    const old = m.material;
    const material = new THREE.MeshBasicMaterial({ map: old.map ?? null, color: (old.color ?? new THREE.Color(1, 1, 1)).clone().multiply(light) });
    withFlash(material, [1, 1, 1]);
    m.material = material;
    m.frustumCulled = false; // grensene gjelder grunnstillingen, ikke animasjonen
    materials.push(material);
  });
  const item = new THREE.Group();
  item.add(scene);
  item.position.copy(origin);
  item.quaternion.copy(quaternion);
  item.scale.setScalar(scale);
  const mixer = new THREE.AnimationMixer(scene);
  const clip = gltf.animations[0];
  if (clip) mixer.clipAction(clip).play();
  return { item, mixer, materials };
}
