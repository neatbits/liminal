// Nettleserprobe med samme three.js-instans som appen. Kun brukt av lokale kontroller.
import * as THREE from 'three';
import { windowViewFor } from '../src/core/window-views.js';

export function landscapeDepthProbe(viewer) {
  const source = viewer.world.group.getObjectByName('windowGlass');
  const material = source.material.clone();
  material.uniforms.uNoise.value = source.material.uniforms.uNoise.value;
  material.fragmentShader = material.fragmentShader.replace(
    'gl_FragColor = vec4(col * uGain, 1.0);',
    'gl_FragColor = vec4(hitDistance, ro.x + rd.x * hitDistance, ro.z + rd.z * hitDistance, 1.0);',
  );
  material.needsUpdate = true;
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(source.geometry, material));
  const target = new THREE.WebGLRenderTarget(33, 33, { type: THREE.FloatType, depthBuffer: true });
  const camera = new THREE.PerspectiveCamera(25, 1, 0.05, 1000);
  camera.position.set(5.5, 1.65, 3);
  const view = windowViewFor(viewer.world.theme);
  camera.lookAt(view.spacing / 2, 1.65, 0.86 - view.firstRow);
  const renderer = viewer.renderer, previous = renderer.getRenderTarget();
  const clear = renderer.getClearColor(new THREE.Color()), alpha = renderer.getClearAlpha();
  const read = () => {
    renderer.setRenderTarget(target); renderer.setClearColor(0, 0); renderer.clear(); renderer.render(scene, camera);
    const pixel = new Float32Array(4);
    renderer.readRenderTargetPixels(target, 16, 16, 1, 1, pixel);
    return Array.from(pixel);
  };
  try {
    const first = read();
    camera.position.x += 0.15; // samme kameraretning, fortsatt innenfor smale enkeltglass
    const moved = read();
    return { first, moved };
  } finally {
    renderer.setRenderTarget(previous); renderer.setClearColor(clear, alpha);
    target.dispose(); material.dispose();
  }
}

/** Read actual hit heights through the glass, including roads below and tall neighbouring blocks. */
export function basementCityProbe(viewer) {
  const source=viewer.world.group.getObjectByName('windowGlass'),material=source.material.clone();
  material.uniforms.uNoise.value=source.material.uniforms.uNoise.value;
  material.fragmentShader=material.fragmentShader.replace('gl_FragColor = vec4(col * uGain, 1.0);',
    'gl_FragColor = vec4(hitDistance, ro.y + rd.y * hitDistance, hit.part < 0.0 ? -2.0 : hit.normal.y, 1.0);');
  material.needsUpdate=true;
  const scene=new THREE.Scene();scene.add(new THREE.Mesh(source.geometry,material));
  const target=new THREE.WebGLRenderTarget(64,64,{type:THREE.FloatType,depthBuffer:true});
  const camera=new THREE.PerspectiveCamera(60,1,.01,1000);camera.position.set(5.5,1.65,1.1);
  const renderer=viewer.renderer,previous=renderer.getRenderTarget();
  const clear=renderer.getClearColor(new THREE.Color()),alpha=renderer.getClearAlpha();
  const out={ground:0,minY:Infinity,roofLow:Infinity,towerHigh:-Infinity};
  try {
    for(const pitch of [.4,0,-.5,-.9]) {
      camera.lookAt(5.5,1.65+Math.tan(pitch)*50,-50);
      renderer.setRenderTarget(target);renderer.setClearColor(0,0);renderer.clear();renderer.render(scene,camera);
      const pixels=new Float32Array(64*64*4);renderer.readRenderTargetPixels(target,0,0,64,64,pixels);
      for(let i=0;i<pixels.length;i+=4) {
        if(!pixels[i+3]||pixels[i]>=99999)continue;
        const y=pixels[i+1];out.minY=Math.min(out.minY,y);
        if(pixels[i+2]<-1.5)out.ground++;
        else {
          out.towerHigh=Math.max(out.towerHigh,y);
          if(pixels[i+2]>.5)out.roofLow=Math.min(out.roofLow,y);
        }
      }
    }
    return out;
  } finally {
    renderer.setRenderTarget(previous);renderer.setClearColor(clear,alpha);
    target.dispose();material.dispose();
  }
}
