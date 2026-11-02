// Oversiktslyset: omgivelseslyset bakes bare der lampene når (world/lighting.js, AMBIENT), så et rom uten lamper er mørkt
// når man går i det. I 3D-oversikten i editoren skal rommet likevel synes mens man tegner: der legges omgivelseslyset
// tilbake, mest der det bakte lyset er svakt (uFill = 1 i oversikten, 0 i gåmodus; world/build.js setBoost).
export const FILL_PARS = /* glsl */ `
uniform vec3 uAmbient;
uniform float uFill;
vec3 withFill(vec3 light) {
  vec3 lum = vec3(0.2126, 0.7152, 0.0722);
  float missing = clamp(1.0 - dot(light, lum) / (dot(uAmbient, lum) + 0.15), 0.0, 1.0);
  return light + uAmbient * uFill * missing;
}`;
