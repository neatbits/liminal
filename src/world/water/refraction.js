// Dybden fra det eksisterende brytningspasset, med dets faktiske skrå klippeprojeksjon.
// near/far-formelen for et vanlig perspektivkamera gir feil etter Refractors klipping.
import { DepthTexture, Matrix4 } from 'three';

export function refractionDepth(refractor) {
  const target = refractor.getRenderTarget();
  target.depthTexture = new DepthTexture(target.width, target.height);
  const worldFromClip = new Matrix4();
  return {
    uniforms: {
      tRefractionDepth: { value: target.depthTexture },
      uRefractWorld: { value: worldFromClip },
    },
    update() {
      const camera = refractor.camera;
      worldFromClip.copy(camera.projectionMatrix).invert().premultiply(camera.matrixWorld);
    },
  };
}
