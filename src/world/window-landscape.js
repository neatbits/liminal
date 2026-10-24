// Temaets utsikt: analytisk 3D-landskap i glassflaten. Kamerastråler treffer bakken og
// bygninger et stykke utenfor veggen. Perspektiv/parallakse uten ekstra scene/renderpass.
import * as THREE from 'three';
import { windowViewFor } from '../core/window-views.js';
import { LANDSCAPE_FRAGMENT } from './landscape-shader.js';
import { landscapeNoise } from './landscape-noise.js';
import { BASEMENT_CITY_FRAGMENT } from './basement-city.js';

// Gjennomsiktig plassholder til bildet av spøkelset er tatt (view3d/ghost-snapshot.js).
const NO_GHOST = new THREE.DataTexture(new Uint8Array(4), 1, 1);
NO_GHOST.needsUpdate = true;

const VERT = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

export function landscapeMaterial(sky, theme) {
  const view = windowViewFor(theme);
  if (!view) return null;
  const daylight = sky.sun ? 1 : 0.2;
  const light = new THREE.Color(sky.light);
  const tint = (hex) => new THREE.Color(hex).multiply(light).multiplyScalar(daylight);
  const elev = sky.sun?.elev ?? 0.6, side = sky.sun?.side ?? 0.35;
  const noise = landscapeNoise();
  const skyColor = index => {
    const color=new THREE.Color(sky.sky[index]);
    return view.city ? color.lerp(tint(view.haze),index===0 ? .72 : .62) : color;
  };
  const material = new THREE.ShaderMaterial({
    defines: { VIEW_ROOF: view.roof > 0 ? 1 : 0, VIEW_GREENERY: view.greenery[0] > 0 ? 1 : 0,
      VIEW_SETBACK: view.setback > 0 ? 1 : 0, VIEW_WINDOWS: view.windows, GROUND_STYLE: view.groundStyle },
    uniforms: {
      uNoise: { value: noise },
      uSkyTop: { value: skyColor(0) },
      uSkyBottom: { value: skyColor(1) },
      uGround: { value: tint(view.ground) },
      uStone: { value: tint(view.stone) },
      uLeaf: { value: tint(view.leaf) },
      uSun: { value: new THREE.Vector3(Math.sin(side) * Math.cos(elev), Math.sin(elev), -Math.cos(side) * Math.cos(elev)) },
      uGreenery: { value: new THREE.Vector3(...view.greenery) },
      uRoof: { value: view.roof },
      uSetback: { value: view.setback },
      uBuildSize: { value: new THREE.Vector3(view.width[0], view.height[0], view.depth[0]) },
      uBuildVary: { value: new THREE.Vector3(view.width[1], view.height[1], view.depth[1]) },
      uLayout: { value: new THREE.Vector4(view.firstRow, view.rowGap, view.spacing, view.groundY) },
      uAtmosphere: { value: new THREE.Vector3(view.fog, view.windows, view.lit) },
      uGroundStyle: { value: view.groundStyle },
      uNight: { value: sky.sun ? 0 : 1 },
      uGain: { value: 1 / theme.exposure / (1 + theme.bloom * 0.5) },
      // Spøkelset utenfor vinduet (view3d/window-ghost.js): av til det settes.
      uGhost: { value: new THREE.Vector4() }, uGhostFrame: { value: new THREE.Vector2(0, 1) },
      uGhostSize: { value: new THREE.Vector2(1, 2) }, uGhostMap: { value: NO_GHOST },
    },
    vertexShader: VERT, fragmentShader: view.city?BASEMENT_CITY_FRAGMENT:LANDSCAPE_FRAGMENT,
  });
  material.name = `${theme.label} distant landscape`;
  material.addEventListener('dispose', () => noise.dispose());
  material.userData.windowView = theme.id;
  return material;
}
