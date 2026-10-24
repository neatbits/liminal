// Etterbehandling: bloom for lysrørene, og et sluttpass med vignett, filmkorn,
// kromatisk aberrasjon og valgfritt VHS-utseende.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const FxShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uGrain: { value: 0.06 },
    uVignette: { value: 0.6 },
    uAberration: { value: 0.0025 },
    uVhs: { value: 0 },
    uRose: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime, uGrain, uVignette, uAberration, uVhs, uRose;
    uniform vec2 uRes;
    varying vec2 vUv;
    float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 uv = vUv;
      if (uVhs > 0.5) {
        float line = floor(uv.y * 240.0);
        uv.x += sin(uv.y * 180.0 + uTime * 6.0) * 0.0007 + (rand(vec2(line, floor(uTime * 24.0))) - 0.5) * 0.0016;
      }
      vec2 dir = uv - 0.5;
      float ab = uAberration * (1.0 + uVhs * 2.5);
      vec3 col;
      col.r = texture2D(tDiffuse, uv + dir * ab).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - dir * ab).b;
      // A restrained magenta print cast for the mall, preserving bright cream tiles.
      col = mix(col, col * vec3(1.08, 0.92, 1.05) + vec3(0.018, 0.0, 0.015), uRose);
      if (uVhs > 0.5) {
        float l = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(vec3(l), col, 0.78) * vec3(1.03, 1.0, 0.94);
        col *= 0.93 + 0.07 * sin(uv.y * uRes.y * 1.6);
        col += (rand(vec2(uTime, uv.y)) - 0.5) * 0.03;
      }
      float vig = smoothstep(0.85, 0.25, length(dir * vec2(1.0, 0.9)));
      col *= mix(1.0, vig, uVignette);
      col += (rand(uv * uRes + fract(uTime) * 97.0) - 0.5) * uGrain;
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export function createPostFX(renderer, scene, camera) {
  let beforeRender;
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  const renderPass = new RenderPass(scene, camera);
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.5, 0.45, 1.05);
  const output = new OutputPass();
  const fx = new ShaderPass(FxShader);
  composer.addPass(renderPass);
  composer.addPass(bloom);
  composer.addPass(output);
  composer.addPass(fx);

  return {
    composer,
    setBeforeRender(fn) { beforeRender = fn; },
    setCamera(cam) {
      renderPass.camera = cam;
    },
    setSize(w, h, pixelRatio) {
      composer.setPixelRatio(pixelRatio);
      composer.setSize(w, h);
      fx.uniforms.uRes.value.set(w * pixelRatio, h * pixelRatio);
    },
    /** look: { bloom, grain, vignette, aberration, vhs } */
    setLook(look) {
      bloom.strength = look.bloom;
      fx.uniforms.uGrain.value = look.grain;
      fx.uniforms.uVignette.value = look.vignette;
      fx.uniforms.uAberration.value = look.aberration;
      fx.uniforms.uVhs.value = look.vhs ? 1 : 0;
      fx.uniforms.uRose.value = look.rose ?? 0;
    },
    /** full = bloom og kantutjevning (MSAA ×4); ellers uten begge (grafikkinnstillingen Effects). */
    setQuality(full) {
      bloom.enabled = full;
      const samples = full ? 4 : 0;
      for (const t of [composer.renderTarget1, composer.renderTarget2]) {
        if (t.samples === samples) continue;
        t.samples = samples;
        t.dispose(); // lages på nytt med det nye antallet ved neste bilde
      }
    },
    render(time) {
      beforeRender?.();
      fx.uniforms.uTime.value = time;
      composer.render();
    },
    dispose() {
      composer.dispose();
      target.dispose();
      bloom.dispose();
    },
  };
}
