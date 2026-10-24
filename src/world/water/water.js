// Vannflaten i 3D. Bruker three.js' Reflector (speiling) og Refractor (lysbrytning) bare
// for kameraoppsett og render targets; selve utseendet kommer fra vår egen shader.
// Alt vann ligger i samme høyde, så én speiling + én brytning dekker alle bassenger.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { Refractor } from 'three/addons/objects/Refractor.js';
import { WATER_SURFACE } from '../../core/level.js';
import { WATER_VERT, WATER_FRAG } from './shader.js';
import { RIPPLES } from '../ripples.js';
import { waveStrength } from '../../core/water.js';
import { refractionDepth } from './refraction.js';

const DEFAULTS = { tint: '#3a4a48', absorb: [1.2, 0.9, 0.9], wave: 0.4 };

function toGeometry(data) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(data.pos, 3));
  g.setAttribute('aLight', new THREE.Float32BufferAttribute(data.light, 3));
  g.setAttribute('aFlick', new THREE.Float32BufferAttribute(data.flick, 4));
  g.setAttribute('aEdge', new THREE.Float32BufferAttribute(data.edge, 1));
  g.setIndex(data.index);
  g.computeBoundingSphere();
  return g;
}

/**
 * @param data  resultatet av buildWaterData
 * @param shared felles uniforms (uFlick, uFlickColor, uTime, uBoost)
 * @param detail detaljert vann: speil- og brytningsbildet i full oppløsning, og flere småbølger
 * @returns {{ mesh, setSize(w,h), setMirror(on), setQuality(high), setDetail(on), setWaves(value), setRipples(values), dispose() } | null}
 */
export function createWater(data, theme, shared, { quality = true, detail = false, waves = 1 } = {}) {
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
    uWaveStrength: { value: waveStrength(waves) },
    uTint: { value: new THREE.Color(params.tint) },
    uAbsorb: { value: new THREE.Vector3(...params.absorb) },
    // Enkel modus har ingen dybdetekstur: bruk én tynn vannhinne over hele bassenget.
    uSimpleDepth: { value: data.depth.reduce((min, depth) => Math.min(min, depth), Infinity) },
    uRipples: { value: new Float32Array(RIPPLES * 4) },
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
  const depth = refractionDepth(refractor);
  Object.assign(uniforms, depth.uniforms);
  reflector.matrixAutoUpdate = refractor.matrixAutoUpdate = false;
  uniforms.tReflection.value = reflector.getRenderTarget().texture;
  uniforms.tRefraction.value = refractor.getRenderTarget().texture;
  uniforms.uReflectMatrix.value = reflector.material.uniforms.textureMatrix.value;
  uniforms.uRefractMatrix.value = refractor.material.uniforms.textureMatrix.value;

  let mirror = true;
  let high = quality;
  let fine = detail;
  let size = [512, 512];

  // Før vannet tegnes: tegn speil- og brytningsbildet (med vannet selv skjult).
  mesh.onBeforeRender = (renderer, scene, camera) => {
    if (!high) return;
    mesh.visible = false;
    reflector.matrixWorld.copy(mesh.matrixWorld);
    refractor.matrixWorld.copy(mesh.matrixWorld);
    if (mirror) reflector.onBeforeRender(renderer, scene, camera);
    refractor.onBeforeRender(renderer, scene, camera);
    depth.update();
    mesh.visible = true;
  };

  const applyQuality = () => {
    if (high) material.defines.USE_RT = '';
    else delete material.defines.USE_RT;
    if (fine) material.defines.USE_DETAIL = '';
    else delete material.defines.USE_DETAIL;
    material.transparent = !high;
    material.depthWrite = high;
    material.needsUpdate = true;
  };
  applyQuality();

  return {
    mesh,
    /** Skjermstørrelsen i piksler: speil-/brytningsbildet er halvparten (hele med detaljert vann). */
    setSize(w, h) {
      size = [w, h];
      const f = fine ? 1 : 0.5;
      const tw = Math.max(64, Math.round(w * f));
      const th = Math.max(64, Math.round(h * f));
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
    setDetail(on) {
      if (on === fine) return;
      fine = on;
      applyQuality();
      this.setSize(...size);
    },
    /** Bølgestyrke uten ombygging av verdenen eller rekompilering av shaderen. */
    setWaves(value) {
      uniforms.uWaveStrength.value = waveStrength(value);
    },
    /** Ringene i vannet (Ripples.values()). */
    setRipples(values) {
      uniforms.uRipples.value.set(values);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      reflector.dispose();
      refractor.dispose();
    },
  };
}
