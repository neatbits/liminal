// Check actual shop views separately; return/write one screenshot at a time.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { presetById } from '../src/gen/index.js';
import { shopfronts } from '../src/core/shopfronts.js';
import { SHOP_INTERIORS } from '../src/core/shop-interiors.js';

export async function checkShopInteriors(browser) {
  const fronts = shopfronts(presetById('mall').make({seed:7,layout:'gallery'})), results = [];
  await browser.evaluate(`liminal.viewer.updateSettings({effects:'reduced',renderScale:1,vhs:false,grain:false})`);
  await browser.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
  for (let style = 0; style < 4; style++) for (const storey of (style === 2 ? [0, 4.4] : [0])) {
    const s = fronts.find(s => s.style === style), x = (s.x0 + s.x1 + 1) / 2;
    console.log(`Checking ${SHOP_INTERIORS[style].kind} interior at ${storey} m…`);
    const result = await browser.evaluate(`(()=>{
      const v=liminal.viewer,g=v.world.group,gl=v.renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;
      const find=name=>g.getObjectsByProperty('name',name).find(o=>o.isMesh);
      const capture=()=>{v.postfx.render(0);const p=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,p);return p;};
      const different=(a,b)=>{let n=0;for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>20)n++;return n;};
      v.camera.position.set(${x},${storey+1.5},${s.z+.5-s.n*1.1});
      v.camera.lookAt(${x},${storey+.9},${s.z+.5-s.n*4.3});
      v.world.update(.7,[1,1,1,1]);const normal=capture();
      const floor=find('shopFloor_${style}').material,wall=find('shopWall_${style}').material;
      const otherFloor=find('shopFloor_${style===0?2:0}').material,originalFloor=floor.uniforms.map.value;
      floor.uniforms.map.value=otherFloor.uniforms.map.value;
      const floorPixels=different(normal,capture());floor.uniforms.map.value=originalFloor;
      const key='${style===0||style===3?'map2':'map'}',originalWall=wall.uniforms[key].value;
      const otherWall=find('shopWall_${style===0?3:0}').material;
      wall.uniforms[key].value=otherWall.uniforms[key].value;
      const wallPixels=different(normal,capture());wall.uniforms[key].value=originalWall;
      capture();return {floorPixels,wallPixels,floorTexture:originalFloor.uuid,
        png:v.renderer.domElement.toDataURL('image/png').split(',')[1],
        linked:v.renderer.info.programs.every(p=>p.diagnostics?.runnable!==false),lost:gl.isContextLost()};
    })()`);
    assert.equal(result.linked, true); assert.equal(result.lost, false);
    assert.ok(result.floorPixels > 100, `${SHOP_INTERIORS[style].kind} ${storey}: floor finish is visible (${result.floorPixels})`);
    assert.ok(result.wallPixels > 30, `${SHOP_INTERIORS[style].kind} ${storey}: wall finish is visible (${result.wallPixels})`);
    writeFileSync(`node_modules/.cache/mall-shop-${SHOP_INTERIORS[style].kind}${storey ? '-upper' : ''}.png`, Buffer.from(result.png, 'base64'));
    results.push(result.floorTexture);
  }
  assert.equal(new Set(results).size, 4);
  await browser.evaluate(`liminal.viewer.updateSettings({effects:'full'});liminal.viewer.postfx.render(0)`);
  console.log('PASS typed shops: four distinct floors/walls, upper arcade, Full/Reduced and shaders');
}
