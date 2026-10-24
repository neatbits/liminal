// Looking diagonally into a display-window recess used to expose the floor below.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { presetById } from '../src/gen/index.js';
import { shopfronts } from '../src/core/shopfronts.js';

export async function checkShopfrontFloors(browser) {
  const fronts=shopfronts(presetById('mall').make({seed:7,layout:'gallery'}));
  const views=[-1,1].flatMap(n=>{
    const s=fronts.find(s=>s.n===n);
    return [-1,1].map(dx=>{
      const edge=dx<0?s.x0:s.x1+1;
      return [edge-dx*.6,s.z+.5-n,edge-dx*.2,s.z+.5+n*.4,edge,s.z+.5-n*.42];
    });
  });
  const result = await browser.evaluate(`(async () => {
    const v=liminal.viewer;
    v.mode='walk';v.updateSettings({vhs:false,grain:false,mood:'normal'});
    const originals=[],materials=[];
    v.world.group.traverse(m=>{
      if(!m.isMesh || !(['floor','tileFloor'].includes(m.name) || m.name.startsWith('shopFloor_')))return;
      const src=m.material;
      const material=new src.constructor({uniforms:src.uniforms,vertexShader:src.vertexShader,
        fragmentShader:src.fragmentShader.replace('gl_FragColor = vec4(col, 1.0);',
          'gl_FragColor = vec4(vPos.y < 1.0 ? vec3(1.0, 0.0, 1.0) : col, 1.0);'),
        defines:{...src.defines},fog:src.fog});
      originals.push([m,src]);materials.push(material);m.material=material;
    });
    const reveal=v.world.group.getObjectByName('shopReveal');
    const gl=v.renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;
    const pixels=new Uint8Array(7*7*4);
    const render=(edge,front)=>{
      v.postfx.render(0);
      // Sample the formerly exposed recess, excluding legitimate views down into the atrium.
      const p=new v.camera.position.constructor(edge,5.15,front).project(v.camera);
      const px=Math.max(0,Math.min(w-7,Math.round((p.x*.5+.5)*w)-3));
      const py=Math.max(0,Math.min(h-7,Math.round((p.y*.5+.5)*h)-3));
      gl.readPixels(px,py,7,7,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      let exposed=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]>180&&pixels[i+1]<100&&pixels[i+2]>180)exposed++;
      return exposed;
    };
    const cases=[];
    try {
      for(const effects of ['full','reduced']) {
        v.updateSettings({effects});
        for(const [x,z,tx,tz,edge,front] of ${JSON.stringify(views)}) {
          v.camera.position.set(x,6.05,z);v.camera.lookAt(tx,4.1,tz);
          reveal.visible=false;const open=render(edge,front);
          reveal.visible=true;const closed=render(edge,front);
          cases.push({effects,x,z,open,closed});
        }
      }
    } finally {
      if(reveal)reveal.visible=true;
      for(const [mesh,material] of originals)mesh.material=material;
      for(const material of materials)material.dispose();
    }
    v.postfx.render(0);
    return {cases,png:v.renderer.domElement.toDataURL('image/png').split(',')[1],
      linked:v.renderer.info.programs.every(p=>p.diagnostics?.runnable!==false)};
  })()`);
  assert.ok(result.cases.some(c=>c.open>10), 'reproduces the original view through the missing recess side');
  for(const c of result.cases) {
    assert.ok(c.closed<3, `upper shop floor stays opaque: ${JSON.stringify(c)}`);
  }
  assert.equal(result.linked,true);
  writeFileSync('node_modules/.cache/mall-shop-floor-fixed.png',Buffer.from(result.png,'base64'));
  console.log('PASS Mall shop floors: both recess ends, both gallery directions, Full/Reduced, lower floor hidden');
}
