import * as THREE from 'three';

// Den sorte skikkelsen: en høy, tynn silhuett på en flate som vender mot kameraet, regnet ut i
// fragmentshaderen som en avstand til hode, skuldre, kropp, lange armer og bein. Støy forskyver kanten,
// så den er røykaktig og flytter på seg; beina løser seg opp mot gulvet, og i fart (uRush) blir hele
// kroppen mer utvisket. Ingen munn. Svake øyne bare i mørket (uDark), ellers ville den vært helt usynlig.
// Tåken slår inn senere enn på resten av rommet: sort på nært hold, men den glir inn i bakgrunnen på avstand.
export function figureMaterial(height) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uDark: { value: 0 }, uRush: { value: 0 }, uSway: { value: 0 }, uStride: { value: 0 },
      uHeight: { value: height },
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
    },
    side: THREE.DoubleSide, fog: true, transparent: true, depthWrite: false,
    vertexShader: `
      #include <common>
      #include <fog_pars_vertex>
      varying vec2 vP;
      void main() {
        vP = position.xy;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform float uTime, uDark, uRush, uSway, uStride, uHeight;
      varying vec2 vP;
      #include <fog_pars_fragment>
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      float fbm(vec2 p) { return 0.55 * noise(p) + 0.3 * noise(p * 2.1 + 4.7) + 0.15 * noise(p * 4.3 + 9.2); }
      float limb(vec2 p, vec2 a, vec2 b, float ra, float rb) {
        vec2 pa = p - a, ba = b - a;
        float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        return length(pa - ba * h) - mix(ra, rb, h);
      }
      float smin(float a, float b, float k) {
        float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
        return mix(b, a, h) - k * h * (1.0 - h);
      }
      float body(vec2 p) {
        float s = uStride * (0.08 + 0.1 * uRush);
        float d = limb(p, vec2(0.02, 1.92), vec2(0.03, 1.86), 0.1, 0.095); // hodet, litt på skrå
        d = smin(d, limb(p, vec2(0.0, 1.78), vec2(0.0, 1.6), 0.045, 0.06), 0.05);
        d = smin(d, limb(p, vec2(-0.2, 1.6), vec2(0.2, 1.63), 0.055, 0.055), 0.07); // skuldrene, ikke helt rette
        d = smin(d, limb(p, vec2(0.0, 1.6), vec2(0.0, 1.0), 0.17, 0.11), 0.09);
        d = smin(d, limb(p, vec2(-0.23, 1.58), vec2(-0.31, 1.05), 0.05, 0.036), 0.04); // armene henger langt ned
        d = smin(d, limb(p, vec2(-0.31, 1.05), vec2(-0.28, 0.52), 0.036, 0.018), 0.03);
        d = smin(d, limb(p, vec2(0.23, 1.6), vec2(0.3, 1.08), 0.05, 0.036), 0.04);
        d = smin(d, limb(p, vec2(0.3, 1.08), vec2(0.33, 0.56), 0.036, 0.018), 0.03);
        d = smin(d, limb(p, vec2(-0.07, 1.02), vec2(-0.1 - s, 0.02), 0.07, 0.028), 0.05);
        d = smin(d, limb(p, vec2(0.07, 1.02), vec2(0.1 + s, 0.02), 0.07, 0.028), 0.05);
        return d;
      }
      void main() {
        float scale = 2.05 / uHeight;
        vec2 p = vP * scale;
        p.x += uSway * (p.y - 0.4) * (1.0 + uRush);
        vec2 q = p * vec2(3.2, 2.0) + vec2(0.0, -uTime * (0.3 + 1.1 * uRush));
        vec2 warp = vec2(fbm(q + 3.1), fbm(q + 7.7)) - 0.5;
        float low = 1.0 - smoothstep(0.0, 0.8, p.y);
        float d = body(p + warp * (0.11 + 0.13 * uRush + 0.16 * low));
        d += (fbm(p * 6.0 + vec2(uTime * 0.5, -uTime * 0.8)) - 0.5) * 0.07;
        float edge = 0.04 + 0.08 * uRush + 0.2 * low;
        float alpha = 1.0 - smoothstep(-edge, edge, d);
        // Røyk rundt kroppen.
        float haze = exp(-max(d, 0.0) * 6.5) * (0.2 + 0.55 * fbm(q * 1.4));
        alpha = max(alpha, haze * 0.55);
        alpha *= smoothstep(0.0, 0.3, p.y) * (0.92 - 0.14 * uRush);
        vec3 col = vec3(0.007, 0.007, 0.009) + vec3(0.016, 0.016, 0.02) * uDark;
        // Øynene: to svake punkter som bare synes i mørket.
        vec2 e = vec2(abs(p.x - 0.03) - 0.04, (p.y - 1.9) * 1.6);
        float eyes = exp(-dot(e, e) * 5200.0) * uDark * (0.75 + 0.25 * sin(uTime * 1.7));
        col += vec3(0.85, 0.8, 0.62) * eyes;
        alpha = max(alpha, eyes);
        gl_FragColor = vec4(col, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #if defined(USE_FOG) && defined(FOG_EXP2)
          float fogFactor = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor * fogFactor);
        #endif
      }`,
  });
}
