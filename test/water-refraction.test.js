import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector4, WebGLRenderTarget } from 'three';
import { refractionDepth } from '../src/world/water/refraction.js';

describe('dybde fra vannets brytningspass', () => {
  it('rekonstruerer den synlige bunnen med skrå klipping og skiftende kamera', () => {
    const target = new WebGLRenderTarget(80, 60);
    const camera = new PerspectiveCamera(75, 4 / 3, 0.05, 500);
    const depth = refractionDepth({ camera, getRenderTarget: () => target });
    try {
      expect(depth.uniforms.tRefractionDepth.value.isDepthTexture).toBe(true);
      expect(depth.uniforms.tRefractionDepth.value.image).toMatchObject({ width: 80, height: 60 });
      for (const position of [[12, 1.65, 5], [11, 3.4, 13], [4, 0.1, 7]]) {
        camera.position.set(...position);
        camera.lookAt(7, -0.4, 8);
        camera.updateMatrixWorld();
        camera.updateProjectionMatrix();
        // Refractor erstatter den tredje raden med en skrå klippeflate. near/far og
        // projectionMatrixInverse tilhører fortsatt det opprinnelige kameraet.
        camera.projectionMatrix.elements[2] = 0.2;
        camera.projectionMatrix.elements[6] = -1.4;
        camera.projectionMatrix.elements[10] = -1.1;
        camera.projectionMatrix.elements[14] = -0.4;
        depth.update();
        for (const point of [[6, -2.8, 8], [10.5, -0.7, 8], [5, -1.2, 7]]) {
          const clip = new Vector4(...point, 1).applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix);
          clip.divideScalar(clip.w);
          const world = clip.applyMatrix4(depth.uniforms.uRefractWorld.value);
          world.divideScalar(world.w);
          point.forEach((value, i) => expect(world.getComponent(i)).toBeCloseTo(value, 8));
        }
      }
    } finally {
      target.dispose();
    }
  });
});
