import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createLevel,TILE } from '../src/core/level.js';
import { autoLights } from '../src/core/ops.js';
import { encodeLevel } from '../src/core/serialize.js';
import { RETRO_PC_IDS } from '../src/core/object-catalog-electronics.js';
import { displayStand } from '../src/gen/furnish-electronics.js';
import { waitFor } from './browser-driver.mjs';

export async function checkPCDisplays(browser,origin) {
  const {call,evaluate}=browser,l=createLevel({name:'PC display tables',theme:'mall',w:24,h:14,height:3.4});
  for(let z=1;z<13;z++)for(let x=1;x<23;x++)l.tiles[z*l.w+x]=TILE.FLOOR;
  RETRO_PC_IDS.forEach((id,i)=>assert.equal(displayStand(l,id,4+i*4,1,0),true));
  autoLights(l,{spacing:4,state:1});
  await call('Page.navigate',{url:'about:blank'});
  await call('Page.navigate',{url:`${origin}/app/#room=${await encodeLevel(l)}`});
  await waitFor(()=>evaluate('window.liminal?.level.name==="PC display tables"&&Boolean(liminal.viewer.world)').catch(()=>false),'PC tables');
  const result=await evaluate(`(async()=>{
    const v=liminal.viewer;v.renderer.setAnimationLoop(null);await v.world.objects.ready;
    liminal.layout.set('3d');v.mode='walk';v.overview.enabled=false;
    v.updateSettings({effects:'full',renderScale:1,grain:false,vhs:false,mood:'normal',waterReflections:false});
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    v.camera.position.set(10.5,2.1,10);v.camera.lookAt(10.5,1,1.5);v.postfx.render(0);
    const items=v.world.objects.items;
    const bounds=items.map(item=>{item.updateWorldMatrix(true,true);const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
      item.traverse(m=>{if(!m.isMesh||m.name==='contactShadow')return;const a=m.geometry.attributes.position,p=m.position.clone();
        for(let j=0;j<a.count;j++){p.fromBufferAttribute(a,j).applyMatrix4(m.matrixWorld);for(const [k,key]of ['x','y','z'].entries()){min[k]=Math.min(min[k],p[key]);max[k]=Math.max(max[k],p[key]);}}});
      return {min,max};});
    return {bounds,png:v.renderer.domElement.toDataURL('image/png').split(',')[1],linked:v.renderer.info.programs.every(p=>p.diagnostics?.runnable!==false)};
  })()`);
  assert.equal(result.linked,true);
  for(let i=0;i<result.bounds.length;i+=2) {
    const table=result.bounds[i],pc=result.bounds[i+1];
    for(const k of [0,2]) {assert.ok(pc.min[k]>=table.min[k]-.01);assert.ok(pc.max[k]<=table.max[k]+.01);}
    assert.ok(Math.abs(pc.min[1]-table.max[1])<.01,'computer rests on the actual imported tabletop');
  }
  writeFileSync('node_modules/.cache/pc-display-tables.png',Buffer.from(result.png,'base64'));
  console.log('PASS four retro PCs fully supported on imported display tables, actual asset bounds and shaders');
}
