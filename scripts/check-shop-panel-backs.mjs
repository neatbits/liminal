import assert from 'node:assert/strict';
import { shopfronts } from '../src/core/shopfronts.js';
import { presetById } from '../src/gen/index.js';
import { TILE,getTile } from '../src/core/level.js';
import { writeFileSync } from 'node:fs';

export async function checkShopPanelBacks(browser) {
  const level=presetById('mall').make({seed:7,layout:'gallery'}),fronts=shopfronts(level),views=[];
  for(const n of [-1,1])for(const dx of [-1,1])for(const floor of [0,4.4]) {
    const s=fronts.find(s=>s.n===n),edge=dx<0?s.x0:s.x1+1;
    views.push([edge+dx*.2,floor+1.5,s.z+.5,edge-dx*.4]);
  }
  for(const n of [-1,1]) {
    const s=fronts.find(s=>s.n===n&&Array.from({length:s.x1-s.x0+1},(_,i)=>getTile(level,s.x0+i,s.z)).includes(TILE.FLOOR));
    for(let x=s.x0;x<=s.x1;x++)if(getTile(level,x,s.z)===TILE.WALL)for(const dx of [-1,1]) {
      if(getTile(level,x+dx,s.z)!==TILE.FLOOR)continue;
      const edge=x+(dx>0?1:0);
      for(const floor of [0,4.4])for(const side of [-1,1])views.push([edge+side*.2,floor+1.5,s.z+.5,edge-side*.3]);
    }
  }
  const samples=await browser.evaluate(`(()=>{
    const v=liminal.viewer,reveal=v.world.group.getObjectByName('shopReveal'),original=reveal.material;
    const marker=new original.constructor({uniforms:original.uniforms,vertexShader:original.vertexShader,
      fragmentShader:original.fragmentShader.replace('gl_FragColor = vec4(col, 1.0);','gl_FragColor = vec4(0.0, 1.0, 1.0, 1.0);'),
      defines:{...original.defines},fog:original.fog});
    const gl=v.renderer.getContext(),pixel=new Uint8Array(7*7*4),out=[];
    reveal.material=marker;
    try{for(const [x,y,z,tx] of ${JSON.stringify(views)}){
      v.camera.position.set(x,y,z);v.camera.lookAt(tx,y,z);v.postfx.render(0);
      gl.readPixels(Math.floor(gl.drawingBufferWidth/2)-3,Math.floor(gl.drawingBufferHeight/2)-3,7,7,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
      let filled=0;for(let i=0;i<pixel.length;i+=4)if(pixel[i]<70&&pixel[i+1]>110&&pixel[i+2]>110)filled++;out.push(filled);
    }}finally{reveal.material=original;marker.dispose();}
    return out;
  })()`);
  assert.ok(samples.every(n=>n>40),`window-bay backing is opaque from either side/storey: ${samples}`);
  const s=fronts.find(s=>s.style===1&&getTile(level,Math.floor((s.x0+s.x1)/2),s.z)===TILE.FLOOR);
  const x=Math.floor((s.x0+s.x1)/2);
  const png=await browser.evaluate(`(()=>{const v=liminal.viewer;
    v.camera.position.set(${x+2.5},1.65,${s.z+.5-s.n*2.8});v.camera.lookAt(${x+.5},1.3,${s.z+.5+s.n});
    v.postfx.render(0);return v.renderer.domElement.toDataURL('image/png').split(',')[1];})()`);
  writeFileSync('node_modules/.cache/mall-shop-entrance-fixed.png',Buffer.from(png,'base64'));
  console.log('PASS Mall window bay: both faces at solid piers AND open entrances, both gallery sides/storeys');
}
