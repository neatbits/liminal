// Vannflaten i 3D. Bruker three.js' Reflector (speiling) og Refractor (lysbrytning) bare
// for kameraoppsett og render targets; selve utseendet kommer fra vår egen shader.
// Alt vann ligger i samme høyde, så én speiling + én brytning dekker alle bassenger.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { Refractor } from 'three/addons/objects/Refractor.js';
import { WATER_SURFACE } from '../../core/level.js';
import { WATER_VERT, WATER_FRAG } from './shader.js';

const DEFAULTS = { tint: '#3a4a48', absorb: [1.2, 0.9, 0.9], wave: 0.4 };

function toGeometry(data) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(data.pos, 3));
  g.setAttribute('aLight', new THREE.Float32BufferAttribute(data.light, 3));
  g.setAttribute('aFlick', new THREE.Float32BufferAttribute(data.flick, 4));
  g.setAttribute('aEdge', new THREE.Float32BufferAttribute(data.edge, 1));
  g.setAttribute('aDepth', new THREE.Float32BufferAttribute(data.depth, 1));
  g.setIndex(data.index);
  g.computeBoundingSphere();
  return g;
}

/**
 * @param data  resultatet av buildWaterData
 * @param shared felles uniforms (uFlick, uFlickColor, uTime, uBoost)
 * @returns {{ mesh, setSize(w,h), setMirror(on), setQuality(high), dispose() } | null}
 */
export function createWater(data, theme, shared, { quality = true } = {}) {
  if (!data.vertexCount) return null;
  const params = { ...DEFAULTS, ...theme.water };
  const geometry = toGeometry(data);
  const uniforms = Object.assign(THREE.UniformsUtils.merge([THREE.UniformsLib.fog]), shared, {
    tReflection: { value: null },
    tRefraction: { value: null },
    uReflectMatrix: { value: new THREE.Matrix4() },
    uRefractMatrix: { value: new THREE.Matrix4() },
    uMirror: { value: 1 },
    uWave: { value: params.wave },
    uTint: { value: new THREE.Color(params.tint) },
    uAbsorb: { value: new THREE.Vector3(...params.absorb) },
  });
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader: WATER_VERT, fragmentShader: WATER_FRAG, fog: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'water';
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = WATER_SURFACE;
  mesh.renderOrder = 2;

  const rtOptions = { textureWidth: 512, textureHeight: 512, clipBias: 0.002, multisample: 0 };
  const reflector = new Reflector(geometry, rtOptions);
  const refractor = new Refractor(geometry, rtOptions);
  reflector.matrixAutoUpdate = refractor.matrixAutoUpdate = false;
  uniforms.tReflection.value = reflector.getRenderTarget().texture;
  uniforms.tRefraction.value = refractor.getRenderTarget().texture;
  uniforms.uReflectMatrix.value = reflector.material.uniforms.textureMatrix.value;
  uniforms.uRefractMatrix.value = refractor.material.uniforms.textureMatrix.value;

  let mirror = true;
  let high = quality;

  // Før vannet tegnes: tegn speil- og brytningsbildet (med vannet selv skjult).
  mesh.onBeforeRender = (renderer, scene, camera) => {
    if (!high) return;
    mesh.visible = false;
    reflector.matrixWorld.copy(mesh.matrixWorld);
    refractor.matrixWorld.copy(mesh.matrixWorld);
    if (mirror) reflector.onBeforeRender(renderer, scene, camera);
    refractor.onBeforeRender(renderer, scene, camera);
    mesh.visible = true;
  };

  const applyQuality = () => {
    if (high) material.defines.USE_RT = '';
    else delete material.defines.USE_RT;
    material.transparent = !high;
    material.depthWrite = high;
    material.needsUpdate = true;
  };
  applyQuality();

  return {
    mesh,
    /** Størrelse på speil-/brytningsbildet i piksler (typisk halv skjermoppløsning). */
    setSize(w, h) {
      const tw = Math.max(64, Math.round(w));
      const th = Math.max(64, Math.round(h));
      reflector.getRenderTarget().setSize(tw, th);
      refractor.getRenderTarget().setSize(tw, th);
    },
    /** Speiling av/på (av i oversikten, der taket ellers ville speilet seg i bassenget). */
    setMirror(on) {
      mirror = on;
      uniforms.uMirror.value = on ? 1 : 0;
    },
    setQuality(on) {
      if (on === high) return;
      high = on;
      applyQuality();
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      reflector.dispose();
      refractor.dispose();
    },
  };
}
