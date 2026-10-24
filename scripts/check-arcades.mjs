import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createLevel, TILE } from '../src/core/level.js';
import { autoLights } from '../src/core/ops.js';
import { encodeLevel } from '../src/core/serialize.js';
import { waitFor } from './browser-driver.mjs';

export async function checkArcades(browser,origin) {
  const l=createLevel({name:'Arcade artwork',theme:'mall',w:18,h:16,height:3.2});
  for(let z=1;z<15;z++) for(let x=1;x<17;x++) l.tiles[z*18+x]=TILE.FLOOR;
  // Automatic selection in an old room, plus an explicit duplicate for material reuse.
  l.objects=Array.from({length:10},(_,k)=>({id:'arcade2',x:k+4,z:3,rot:0}));
  l.objects.push({id:'arcade2',x:2,z:10,rot:1,v:3});
  autoLights(l,{spacing:3,state:1});
  const {call,evaluate}=browser;
  await call('Page.navigate',{url:'about:blank'});
  await call('Page.navigate',{url:`${origin}/app/#room=${await encodeLevel(l)}`});
  await waitFor(()=>evaluate(`liminal?.level.name==='Arcade artwork' && Boolean(liminal.viewer.world)`).catch(()=>false),'arcade room');
  const result=await evaluate(`(async()=>{
    const v=liminal.viewer;v.renderer.setAnimationLoop(null);await v.world.objects.ready;
    liminal.layout.set('3d');v.updateSettings({effects:'reduced',renderScale:1,grain:false,vhs:false,mood:'normal'});
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    v.mode='walk';v.overview.enabled=false;v._applyLook();
    v.camera.position.set(9,1.3,8.3);v.camera.lookAt(9,.95,3.5);
    v.world.update(0,[1,1,1,1]);v.postfx.render(0);
    const fronts=[],panels=[],bounds=[];
    for(const item of v.world.objects.items){
      let front,panel;const box={min:Infinity,max:-Infinity};item.updateWorldMatrix(true,true);
      item.traverse(m=>{if(!m.isMesh)return;
        const map=m.material.uniforms.map.value;
        if(map?.image?.src?.includes('front'))front=m.material;
        if(map?.image?.src?.includes('panel'))panel=m.material;
        if(map?.image?.src?.includes('front')){
          const p=m.position.clone(),a=m.geometry.attributes.position;
          for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(m.matrixWorld);box.min=Math.min(box.min,p.y);box.max=Math.max(box.max,p.y);}
        }
      });
      fronts.push(front);panels.push(panel);bounds.push(box);
    }
    const png=v.renderer.domElement.toDataURL('image/png').split(',')[1];
    const gl=v.renderer.getContext(),pixels=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);
    gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    let lit=0;for(let i=0;i<pixels.length;i+=64)if(pixels[i]+pixels[i+1]+pixels[i+2]>40)lit++;
    return {loaded:fronts.filter(Boolean).length,fronts:new Set(fronts.slice(0,10)).size,panels:new Set(panels.slice(0,10)).size,
      reused:fronts[10]===fronts[0],flip:fronts[0]?.uniforms.map.value.flipY,bounds,png,lit,
      linked:v.renderer.info.programs.every(p=>p.diagnostics?.runnable!==false)};
  })()`);
  assert.equal(result.loaded,11);assert.equal(result.fronts,10);assert.equal(result.panels,10);
  assert.equal(result.reused,true);assert.equal(result.flip,false);assert.equal(result.linked,true);
  assert.ok(result.lit>100);
  for(const b of result.bounds){assert.ok(b.min<=0&&b.min>-.01,`body reaches floor: ${b.min}`);assert.ok(Math.abs(b.max-1.84)<.015);}
  writeFileSync('node_modules/.cache/arcade-variants.png',Buffer.from(result.png,'base64'));
  console.log('PASS ten arcade designs: production textures, shared materials, upright UVs, sunk bases and visible GPU pixels');
}
