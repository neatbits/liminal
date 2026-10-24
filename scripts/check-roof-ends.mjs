// Inspect the gable termination from both ends, with full and reduced postprocessing.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { mallRoof } from '../src/core/mall-roof.js';
import { presetById } from '../src/gen/index.js';

export async function checkRoofEnds(browser) {
  const r=mallRoof(presetById('mall').make({seed:7,layout:'gallery'})),mid=(r.z0+r.z1)/2;
  for(const [end,dir,effects] of [[r.x0,1,'full'],[r.x1,-1,'reduced']]) {
    await browser.evaluate(`liminal.viewer.updateSettings({effects:'${effects}',renderScale:1})`);
    await browser.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
    const result=await browser.evaluate(`(()=>{
      const v=liminal.viewer,frame=v.world.group.getObjectByName('mallRoofFrame');
      const gl=v.renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;
      v.camera.position.set(${end+dir*5.5},6.05,${mid});
      v.camera.lookAt(${end},8.1,${mid});
      const capture=()=>{v.postfx.render(0);const p=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,p);return p;};
      const visible=capture();frame.visible=false;const hidden=capture();frame.visible=true;
      let changed=0;for(let i=0;i<visible.length;i+=4)
        if(Math.abs(visible[i]-hidden[i])+Math.abs(visible[i+1]-hidden[i+1])+Math.abs(visible[i+2]-hidden[i+2])>40)changed++;
      capture();return {changed,png:v.renderer.domElement.toDataURL('image/png').split(',')[1],
        linked:v.renderer.info.programs.every(p=>p.diagnostics?.runnable!==false),lost:gl.isContextLost()};
    })()`);
    assert.ok(result.changed>100,'dark gable framing is visible');
    assert.equal(result.linked,true);assert.equal(result.lost,false);
    writeFileSync(`node_modules/.cache/mall-roof-end-${effects}.png`,Buffer.from(result.png,'base64'));
  }
  console.log('PASS Mall roof ends: framed gables and procedural sky, Full/Reduced shaders');
}
