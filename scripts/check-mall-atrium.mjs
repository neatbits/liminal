import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { presetById } from '../src/gen/index.js';
import { mallLayout } from '../src/gen/mall.js';
import { TILE } from '../src/core/level.js';

export async function checkMallAtrium(browser) {
  const level=presetById('mall').make({seed:7,layout:'gallery'}),front=mallLayout(level.w,level.h).shop+1;
  const court=[];for(let x=5;x<level.w-5;x++)if(level.tiles[front*level.w+x]===TILE.FLOOR&&!level.meta[front*level.w+x])court.push(x);
  const courtX=court[Math.floor(court.length/2)]+.5;
  const result=await browser.evaluate(`(async()=>{
    const v=liminal.viewer;v.mode='walk';v.updateSettings({effects:'full',grain:false,vhs:false,waterReflections:false});
    const g=v.world.group,roof=g.getObjectByName('mallRoofGlass'),spray=v.world.spray;
    const gl=v.renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;
    const capture=()=>{v.postfx.render(0);const a=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,a);return a;};
    const sum=a=>{let s=0;for(let i=0;i<a.length;i+=16)s+=a[i]+a[i+1]+a[i+2];return s;};
    v.world.floorReflection?.setEnabled(false);
    const positions=roof.geometry.attributes.position;
    let low=Infinity,high=-Infinity;for(let i=0;i<positions.count;i++){low=Math.min(low,positions.getY(i));high=Math.max(high,positions.getY(i));}
    v.camera.position.set(23,5.8,20);v.camera.lookAt(36,9.3,20);
    v.world.update(0,[1,1,1,1]);const day=sum(capture());
    const sky=roof.material.uniforms.uDay;const originalDay=sky.value;sky.value=.08;const night=sum(capture());sky.value=originalDay;
    capture();const roofPng=v.renderer.domElement.toDataURL('image/png').split(',')[1];
    const jet=spray.jets[0];v.camera.position.set(jet.x+3,1.65,jet.z+3.8);v.camera.lookAt(jet.x,.85,jet.z);
    if(v.world.water)v.world.water.mesh.visible=false;
    spray.group.visible=false;const hidden=capture();spray.group.visible=true;const visible=capture();
    const streams=spray.group.getObjectByName('fountainStreams');streams.visible=false;const thin=capture();streams.visible=true;
    let thick=0;for(let i=0;i<visible.length;i+=4)if(Math.abs(visible[i]-thin[i])+Math.abs(visible[i+1]-thin[i+1])+Math.abs(visible[i+2]-thin[i+2])>20)thick++;
    let changed=0;for(let i=0;i<visible.length;i+=4)if(Math.abs(visible[i]-hidden[i])+Math.abs(visible[i+1]-hidden[i+1])+Math.abs(visible[i+2]-hidden[i+2])>20)changed++;
    v.world.update(.37,[1,1,1,1]);const animated=capture(),paused=capture();
    let moved=0,unstable=0;for(let i=0;i<visible.length;i+=4){if(Math.abs(visible[i]-animated[i])+Math.abs(visible[i+1]-animated[i+1])+Math.abs(visible[i+2]-animated[i+2])>20)moved++;if(animated[i]!==paused[i]||animated[i+1]!==paused[i+1]||animated[i+2]!==paused[i+2])unstable++;}
    if(v.world.water)v.world.water.mesh.visible=true;
    capture();const sprayPng=v.renderer.domElement.toDataURL('image/png').split(',')[1];
    v.camera.position.set(${courtX},1.65,${front+3});v.camera.lookAt(${courtX},1.5,2);
    capture();const courtPng=v.renderer.domElement.toDataURL('image/png').split(',')[1];
    v.renderer.info.autoReset=false;v.renderer.info.reset();const start=performance.now();v.postfx.render(0);gl.finish();const ms=performance.now()-start,calls=v.renderer.info.render.calls;v.renderer.info.autoReset=true;
    return {low,high,day,night,changed,thick,moved,unstable,count:spray.jets.length,particles:spray.group.getObjectByName('fountainDroplets').geometry.attributes.position.count,ms,calls,roofPng,sprayPng,courtPng,
      linked:v.renderer.info.programs.every(p=>p.diagnostics?.runnable!==false),lost:gl.isContextLost()};
  })()`);
  assert.ok(result.high-result.low>1);assert.ok(result.day>result.night*1.05);
  assert.equal(result.count,2);assert.ok(result.particles<4000);
  assert.ok(result.changed>15,'fountain spray is visible in GPU pixels');
  assert.ok(result.thick>30,'continuous water cores make the fountain visibly stronger');
  assert.ok(result.moved>15,'spray and rings animate');assert.equal(result.unstable,0,'unchanged simulation time freezes spray');
  assert.equal(result.linked,true);assert.equal(result.lost,false);
  for(const [name,key] of [['mall-skylight','roofPng'],['mall-fountain','sprayPng'],['mall-side-arcade','courtPng']])writeFileSync('node_modules/.cache/'+name+'.png',Buffer.from(result[key],'base64'));
  console.log('PASS Mall atrium: pitched daylight roof, animated fountain sprays, pause, shaders and GPU pixels', {ms:result.ms,calls:result.calls,particles:result.particles});
}
