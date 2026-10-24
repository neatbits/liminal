// Ballbinger (tema med `pit: 'balls'`): bassengene fylles med plastballer i stedet for vann,
// tegnet som romlige instansgrupper. I gåmodus dytter spilleren ballene til side (kjølvann i
// vertex-shaderen, se Wake). De få ekte fysikkballene er separate playball-gjenstander.
import * as THREE from 'three';
import { ballLayout, BALL_RADIUS, Wake, WAKE_POINTS } from './ball-layout.js';
import { spatialBuckets, BALL_CHUNK } from './chunks.js';
import { VERT, FRAG, IMPOSTOR_VERT, IMPOSTOR_FRAG } from './ball-shaders.js';

// Detaljnivå: grupper lenger unna enn dette (fra kanten av gruppen) tegnes som impostorer,
// 2 i stedet for 80 trekanter per ball – og rundere enn kulegeometrien på den avstanden.
export const BALL_LOD_DISTANCE = 6;

/** mesh er en Group med instansgrupper; vertices teller alle ballinstansene. */
export function createBalls(level, field, shared, colors) {
  const balls = ballLayout(level, field, colors.length);
  if (!balls.length) return null;
  const geometry = new THREE.IcosahedronGeometry(BALL_RADIUS, 1);
  const quad = new THREE.PlaneGeometry(BALL_RADIUS * 2, BALL_RADIUS * 2);
  const wake = new Wake();
  const wakeValues = new Float32Array(WAKE_POINTS * 4);
  const uniforms = Object.assign(THREE.UniformsUtils.merge([THREE.UniformsLib.fog]), {
    uBoost: shared.uBoost,
    uTint: shared.uTint,
    uWake: { value: Array.from({ length: WAKE_POINTS }, () => new THREE.Vector4()) },
    uRadius: { value: BALL_RADIUS },
  });
  // Begge materialene deler uniforms, så kjølvann og lys følger med når en gruppe bytter.
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, fog: true });
  const impostor = new THREE.ShaderMaterial({ uniforms, vertexShader: IMPOSTOR_VERT, fragmentShader: IMPOSTOR_FRAG, fog: true });
  const mesh = new THREE.Group();
  mesh.name = 'balls';
  const m = new THREE.Matrix4();
  const c = new THREE.Color();
  const base = colors.map((hex) => new THREE.Color(hex));
  for (const bucket of spatialBuckets(balls, BALL_CHUNK)) {
    const part = new THREE.InstancedMesh(geometry, material, bucket.length);
    part.name = 'ball-chunk';
    bucket.forEach((b, i) => {
      m.makeTranslation(b.x, b.y, b.z);
      part.setMatrixAt(i, m);
      c.copy(base[b.color]);
      part.setColorAt(i, c.setRGB(c.r * b.light[0], c.g * b.light[1], c.b * b.light[2]));
    });
    part.instanceMatrix.needsUpdate = true;
    part.instanceColor.needsUpdate = true;
    part.computeBoundingSphere();
    part.userData.lodSphere = part.boundingSphere.clone(); // uten kjølvannsmarginen
    // Shaderen kan flytte baller utenfor den opprinnelige instansens bounds.
    part.boundingSphere.radius += Math.hypot(WAKE_POINTS * 1.5 * 0.12, WAKE_POINTS * 1.5 * 0.06);
    mesh.add(part);
  }
  return {
    mesh,
    vertices: geometry.attributes.position.count * balls.length,
    touch: (x, z, strength) => wake.touch(x, z, strength),
    /** @param camera kameraet bildet tegnes fra; uten kamera beholdes full detalj. */
    update(dt, camera) {
      wake.step(dt);
      wake.values(wakeValues);
      uniforms.uWake.value.forEach((v, k) => v.fromArray(wakeValues, k * 4));
      if (!camera) return;
      for (const part of mesh.children) {
        const far = part.userData.lodSphere.distanceToPoint(camera.position) > BALL_LOD_DISTANCE;
        part.geometry = far ? quad : geometry;
        part.material = far ? impostor : material;
      }
    },
    dispose() {
      for (const part of mesh.children) part.dispose(); // frigjør rendererens instansattributter
      geometry.dispose();
      quad.dispose();
      material.dispose();
      impostor.dispose();
    },
  };
}
