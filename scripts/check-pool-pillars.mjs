import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createLevel,TILE } from '../src/core/level.js';
import { setPillar } from '../src/core/pillars.js';
import { autoLights } from '../src/core/ops.js';
import { paintWindows } from '../src/core/windows.js';
import { encodeLevel } from '../src/core/serialize.js';
import { waitFor } from './browser-driver.mjs';

export async function checkPoolPillars(browser,origin) {
  const {call,evaluate}=browser,l=createLevel({name:'Round column check',theme:'pool',w:24,h:18,height:6});
  for(let z=1;z<17;z++)for(let x=1;x<23;x++)l.tiles[z*l.w+x]=z>=10&&z<=14&&x>=3&&x<=20?TILE.WATER:TILE.FLOOR;
  for(const [x,d] of [[5,.5],[11,2],[17,3]])assert.equal(setPillar(l,x,7,d),1);
  for(const [x,d] of [[5,.5],[11,1],[17,3]])assert.equal(setPillar(l,x,12,d),1);
  paintWindows(l,Array.from({length:14},(_,i)=>[i+5,0]),true);autoLights(l,{spacing:4,state:1});
  await call('Page.navigate',{url:'about:blank'});
  await call('Page.navigate',{url:`${origin}/app/#room=${await encodeLevel(l)}`});
  await waitFor(()=>evaluate('window.liminal?.level.name==="Round column check"&&Boolean(liminal.viewer.world)').catch(()=>false),'Poolrooms columns');
  // Exercise the real sidebar and editor tool, including metadata in the rendered world.
  await evaluate(`(()=>{const a=liminal;a.viewer.renderer.setAnimationLoop(null);a.setTool('pillar');
    document.querySelector('[aria-label="Pillar diameter"] button:last-child').click();})()`);
  assert.equal(await evaluate('liminal.editor.activeTool.diameter'),3);
  assert.equal(await evaluate(`document.querySelector('[aria-label="Pillar diameter"]').hidden`),false);
  const result=await evaluate(`(async()=>{
    const v=liminal.viewer;await v.world.objects.ready;liminal.layout.set('3d');
    v.mode='walk';v.overview.enabled=false;v.updateSettings({effects:'full',grain:false,vhs:false,mood:'normal',renderScale:1,waterReflections:false});
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    v.camera.position.set(12,1.7,16.2);v.camera.lookAt(11.5,2.3,7.5);v.world.update(0,[1,1,1,1]);v.postfx.render(0);
    const gl=v.renderer.getContext(),p=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,p);
    let lit=0;for(let i=0;i<p.length;i+=4)if(p[i]+p[i+1]+p[i+2]>60)lit++;
    return {png:v.renderer.domElement.toDataURL('image/png').split(',')[1],lit:lit/(p.length/4),
      linked:v.renderer.info.programs.every(p=>p.diagnostics?.runnable!==false),lost:gl.isContextLost()};
  })()`);
  assert.equal(result.linked,true);assert.equal(result.lost,false);assert.ok(result.lit>.5);
  writeFileSync('node_modules/.cache/pool-round-pillars.png',Buffer.from(result.png,'base64'));
  const underwater=await evaluate(`(()=>{const v=liminal.viewer;
    v.camera.position.set(9,-.45,13.8);v.camera.lookAt(11.5,-.45,12.5);v.postfx.render(0);
    return v.renderer.domElement.toDataURL('image/png').split(',')[1];})()`);
  writeFileSync('node_modules/.cache/pool-round-pillars-underwater.png',Buffer.from(underwater,'base64'));
  console.log('PASS round Poolrooms columns, larger diameters, editor selector and GPU rendering');
}
