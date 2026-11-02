// Lommelykten i shaderne. Den sitter ved øyet, så alt man ser, har fri sikt til den: den trenger verken
// skygger eller baking, og den legges på etter det bakte lyset, så strømbrudd ikke demper den. Uniformene
// er felles for alle etasjene og settes av view3d/flashlight.js. Se docs/flashlight.md.
import * as THREE from 'three';

export const FLASH_RANGE = 17; // m: lengre enn dette når strålen aldri
const FALLOFF = 0.05;

/** Delt av alle materialene (createSharedUniforms). uFlashPos.w = styrken, 0 = av. */
export const FLASH = {
  uFlashPos: { value: new THREE.Vector4(0, 0, 0, 0) },
  uFlashDir: { value: new THREE.Vector3(0, 0, -1) },
};

export const FLASH_PARS = /* glsl */ `
uniform vec4 uFlashPos;
uniform vec3 uFlashDir;
/** Lyset fra strålen i et punkt: en hard kjerne og en svak ring rundt, uten hensyn til flatens retning. */
vec3 flashBeam(vec3 world) {
  if (uFlashPos.w <= 0.0) return vec3(0.0);
  vec3 ray = world - uFlashPos.xyz;
  float d2 = dot(ray, ray);
  float c = dot(ray, uFlashDir) / max(sqrt(d2), 0.001);
  float cone = 0.2 * smoothstep(0.8, 0.92, c) + 0.8 * smoothstep(0.915, 0.975, c);
  float reach = max(1.0 - d2 / ${(FLASH_RANGE * FLASH_RANGE).toFixed(1)}, 0.0);
  return vec3(1.0, 0.93, 0.78) * uFlashPos.w * cone * reach * reach / (1.0 + d2 * ${FALLOFF.toFixed(3)});
}
/** Som flashBeam, men flater som vender bort fra lykten får mindre. Normalen regnes ut av selve punktet. */
vec3 flashlight(vec3 world) {
  if (uFlashPos.w <= 0.0) return vec3(0.0);
  vec3 n = cross(dFdx(world), dFdy(world));
  vec3 ray = normalize(world - uFlashPos.xyz);
  return flashBeam(world) * (0.3 + 0.7 * abs(dot(n / max(length(n), 1e-9), ray)));
}`;

/**
 * For enkle materialer som ellers dempes med strømmen (kassetter, sikringsskap): de lyser opp i strålen.
 * @param albedo fargen i full belysning, [r, g, b]
 */
export function withFlash(material, albedo) {
  const uAlbedo = { value: new THREE.Vector3(...albedo) };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, FLASH, { uAlbedo });
    shader.vertexShader = `varying vec3 vFlashWorld;\n${shader.vertexShader}`.replace(
      '#include <project_vertex>',
      '#include <project_vertex>\nvFlashWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;',
    );
    shader.fragmentShader = `varying vec3 vFlashWorld;\nuniform vec3 uAlbedo;\n${FLASH_PARS}\n${shader.fragmentShader}`.replace(
      '#include <opaque_fragment>',
      '#include <opaque_fragment>\ngl_FragColor.rgb += uAlbedo * flashlight(vFlashWorld);',
    );
  };
  return material;
}
