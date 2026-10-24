import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { waitFor } from './browser-driver.mjs';
import { createLevel,TILE } from '../src/core/level.js';
import { autoLights } from '../src/core/ops.js';
import { encodeLevel } from '../src/core/serialize.js';

export async function checkInteriorPolish(browser,origin) {
  const open=async url=>{
    await browser.call('Page.navigate',{url:'about:blank'});
    await browser.call('Page.navigate',{url});
    await waitFor(()=>browser.evaluate('Boolean(window.liminal?.viewer.world)').catch(()=>false),'interior polish scene');
    await browser.evaluate(`(async()=>{const v=liminal.viewer;v.renderer.setAnimationLoop(null);await v.world.objects.ready;
      liminal.layout.set('3d');v.mode='walk';v.overview.enabled=false;
      v.updateSettings({effects:'full',renderScale:1,grain:false,vhs:false,mood:'normal',waterReflections:false});v._applyLook();})()`);
    await browser.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
  };
  const save=async name=>{
    const result=await browser.evaluate(`(()=>{const v=liminal.viewer;v.world.update(.5,[1,1,1,1]);v.postfx.render(.5);
      return {png:v.renderer.domElement.toDataURL('image/png').split(',')[1],
        linked:v.renderer.info.programs.every(p=>p.diagnostics?.runnable!==false),lost:v.renderer.getContext().isContextLost()};})()`);
    assert.equal(result.linked,true);assert.equal(result.lost,false);
    writeFileSync(`node_modules/.cache/${name}.png`,Buffer.from(result.png,'base64'));
  };
  for(const id of ['mall-cross-court','mall-terraces']) {
    await open(`${origin}/app/#example=${id}`);
    await browser.evaluate(`(()=>{const v=liminal.viewer;
      v.camera.position.set(${id==='mall-cross-court'?32:19.5},1.7,17.5);
      v.camera.lookAt(${id==='mall-cross-court'?32:30},1.5,${id==='mall-cross-court'?3:10});})()`);
    await save(id);
  }
  const l=createLevel({name:'Contact footprint check',theme:'office',w:20,h:14,height:3.4});
  for(let z=1;z<13;z++)for(let x=1;x<19;x++)l.tiles[z*l.w+x]=TILE.FLOOR;
  l.objects=[{id:'desk2',x:4,z:6,rot:0},{id:'retropcdesktop',x:4,z:6,rot:0},
    {id:'mallbench',x:9,z:6,rot:0},{id:'pottedtree',x:14,z:6,rot:0}];
  autoLights(l,{spacing:4,state:1});
  await open(`${origin}/app/#room=${await encodeLevel(l)}`);
  const pixels=await browser.evaluate(`(()=>{
    const v=liminal.viewer,shadows=v.world.objects.group.getObjectsByProperty('name','contactShadow');
    // Faste gjenstanders skygger tegnes samlet (object-batches.js): slå av det som faktisk tegnes.
    const drawn=v.world.objects.group.children.filter(o=>o.visible&&(o.name==='contactShadow'||o.userData.source==='contactShadow'));
    const gl=v.renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;
    v.camera.position.set(9.5,2.8,11);v.camera.lookAt(9.5,.4,6);
    const read=()=>{v.postfx.render(0);const p=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,p);return p;};
    const visible=read();drawn.forEach(s=>s.visible=false);const hidden=read();drawn.forEach(s=>s.visible=true);
    let changed=0;for(let i=0;i<visible.length;i+=4)if(hidden[i]+hidden[i+1]+hidden[i+2]-visible[i]-visible[i+1]-visible[i+2]>15)changed++;
    return {changed,count:shadows.length,materials:new Set(shadows.map(s=>s.material.uuid)).size,
      desktop:shadows.some(s=>Math.abs(s.position.y-.804)<.001)};
  })()`);
  assert.equal(pixels.count,4);assert.equal(pixels.materials,1);assert.equal(pixels.desktop,true);
  assert.ok(pixels.changed>80,`receiver shadows darken visible GPU pixels: ${JSON.stringify(pixels)}`);
  await save('contact-shadows');
  console.log('PASS Mall layout examples and floor/tabletop contact footprints on GPU',pixels);
}
