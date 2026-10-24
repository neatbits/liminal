import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createLevel,TILE } from '../src/core/level.js';
import { autoLights } from '../src/core/ops.js';
import { encodeLevel } from '../src/core/serialize.js';
import { waitFor } from './browser-driver.mjs';

export async function checkGhost(browser,origin) {
  const l=createLevel({name:'Floating ghost check',theme:'office',w:16,h:18,height:3.4});
  for(let z=1;z<17;z++)for(let x=1;x<15;x++)l.tiles[z*l.w+x]=TILE.FLOOR;
  autoLights(l,{spacing:4,state:1});
  await browser.call('Page.navigate',{url:'about:blank'});
  await browser.call('Page.navigate',{url:`${origin}/app/#room=${await encodeLevel(l)}`});
  await waitFor(()=>browser.evaluate('Boolean(window.liminal?.viewer.world)').catch(()=>false),'ghost scene');
  const loaded=await browser.evaluate(`(async()=>{
    const v=liminal.viewer;v.renderer.setAnimationLoop(null);liminal.layout.set('3d');
    v.mode='walk';v.overview.enabled=false;v.updateSettings({effects:'full',renderScale:1,vhs:false,grain:false,mood:'normal'});v._applyLook();
    v.camera.position.set(8,1.55,10);v.camera.lookAt(8,1.1,6);
    const m=v.explorer.scary.monster;const ok=await m.load();
    window.__ghostAI={x:8,y:0,z:6,state:'hunt',visible:true};
    window.__ghostPlayer={x:8,z:10};m.update(0,__ghostAI,__ghostPlayer,.1);return ok;
  })()`);
  assert.equal(loaded,true,'optimized animated ghost loads');
  await browser.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
  for(const angle of [0,Math.PI]) {
    await browser.evaluate(`__ghostPlayer.z=${angle?2:10};liminal.viewer.explorer.scary.monster.update(0,__ghostAI,__ghostPlayer,.1)`);
    const result=await browser.evaluate(`(()=>{
      const v=liminal.viewer,m=v.explorer.scary.monster,gl=v.renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;
      const read=()=>{v.postfx.render(0);const a=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,a);return a;};
      const changed=(a,b)=>{let n=0;for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>20)n++;return n;};
      const start=read();m.group.visible=false;const hidden=read();m.group.visible=true;
      // Exercise the production playback range instead of sampling the source collapse.
      const position=m.group.position.clone(),rotation=m.float.rotation.clone();
      m.update(1.7,__ghostAI,__ghostPlayer,.1);
      m.group.position.copy(position);m.float.rotation.copy(rotation);const cloth=read();
      m.update(.6,__ghostAI,__ghostPlayer,.1);const moved=read();m.update(0,__ghostAI,__ghostPlayer,.1);const paused=read();
      return {visible:changed(start,hidden),cloth:changed(start,cloth),hover:changed(start,moved),paused:changed(moved,paused),
        y:m.group.position.y,png:v.renderer.domElement.toDataURL('image/png').split(',')[1],
        linked:v.renderer.info.programs.every(p=>p.diagnostics?.runnable!==false),lost:gl.isContextLost()};
    })()`);
    assert.ok(result.visible>100);assert.ok(result.cloth>30,'authored cloth morphs move GPU pixels');
    assert.ok(result.hover>30);assert.equal(result.paused,0);assert.ok(result.y>.14);
    assert.equal(result.linked,true);assert.equal(result.lost,false);
    writeFileSync(`node_modules/.cache/ghost-${angle?'back':'front'}.png`,Buffer.from(result.png,'base64'));
  }
  await browser.evaluate(`liminal.viewer.explorer.scary.monster.update(0,{...__ghostAI,visible:false},__ghostPlayer,1)`);
  assert.equal(await browser.evaluate('liminal.viewer.explorer.scary.monster.group.visible'),false);
  console.log('PASS ghost: upright cloth animation, hovering, pause, hiding, Full shaders and GPU pixels');
}
