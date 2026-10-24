import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createLevel, TILE } from '../src/core/level.js';
import { autoLights } from '../src/core/ops.js';
import { OBJECTS } from '../src/core/objects.js';
import { encodeLevel } from '../src/core/serialize.js';
import { waitFor } from './browser-driver.mjs';

export async function checkSoftBlocks(browser, origin) {
  const level = createLevel({ name: 'Padded play shapes', theme: 'playroom', w: 20, h: 16, height: 3.5 });
  for (let z = 1; z < 15; z++) for (let x = 1; x < 19; x++) level.tiles[z * level.w + x] = TILE.FLOOR;
  const ids = Object.keys(OBJECTS).filter(id => OBJECTS[id].soft);
  level.objects = ids.map((id, i) => ({ id, x: 3 + i % 5 * 3, z: i < 5 ? 4 : 7, rot: 0, v: i }));
  for (let i = 0; i < 8; i++) level.objects.push({ id: 'softcube', x: 3 + i, z: 10, rot: 0, v: i });
  autoLights(level, { spacing: 3, state: 1 });
  const { call, evaluate } = browser;
  await call('Page.navigate', { url: 'about:blank' });
  await call('Page.navigate', { url: `${origin}/app/#room=${await encodeLevel(level)}` });
  await waitFor(() => evaluate(`liminal?.level.name==='Padded play shapes' && Boolean(liminal.viewer.world)`).catch(() => false), 'soft block room');
  const result = await evaluate(`(async()=>{
    const v=liminal.viewer;v.renderer.setAnimationLoop(null);await v.world.objects.ready;
    liminal.layout.set('3d');v.updateSettings({effects:'reduced',renderScale:1,grain:false,vhs:false,mood:'normal'});
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    v.mode='walk';v.overview.enabled=false;v._applyLook();
    v.camera.position.set(11,3.4,15);v.camera.lookAt(8.5,.55,6.8);
    v.world.update(0,[1,1,1,1]);
    const gl=v.renderer.getContext(),width=gl.drawingBufferWidth,height=gl.drawingBufferHeight;
    const capture=()=>{v.postfx.render(0);const p=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,p);return p;};
    const materials=new Set(),textures=new Set();let vertices=0,complete=true;
    const sizes=v.world.objects.items.map(item=>{
      const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
      item.traverse(m=>{if(!m.isMesh)return;
        const a=m.geometry.attributes.position;vertices+=a.count;
        complete&&=m.geometry.attributes.normal?.count===a.count && m.geometry.attributes.aLight.count===a.count;
        for(let i=0;i<a.count;i++)for(let k=0;k<3;k++){const q=a.getComponent(i,k);min[k]=Math.min(min[k],q);max[k]=Math.max(max[k],q);}
        materials.add(m.material);textures.add(m.material.uniforms.map.value);
      });return max.map((n,k)=>n-min[k]);
    });
    capture();const png=v.renderer.domElement.toDataURL('image/png').split(',')[1];
    const shiny=capture();
    for(const m of materials){delete m.defines.SOFT_VINYL;m.needsUpdate=true;}
    const matte=capture();let sheenPixels=0;
    for(let i=0;i<shiny.length;i+=4)if(Math.abs(shiny[i]-matte[i])+Math.abs(shiny[i+1]-matte[i+1])+Math.abs(shiny[i+2]-matte[i+2])>3)sheenPixels++;
    for(const m of materials){m.defines.SOFT_VINYL=1;m.needsUpdate=true;}
    v.updateSettings({effects:'full'});capture();
    v.renderer.info.autoReset=false;v.renderer.info.reset();const start=performance.now();v.postfx.render(0);gl.finish();
    const ms=performance.now()-start,calls=v.renderer.info.render.calls;v.renderer.info.autoReset=true;
    return {sizes,vertices,complete,textures:textures.size,sheenPixels,png,ms,calls,
      linked:v.renderer.info.programs.every(p=>p.diagnostics?.runnable!==false),lost:gl.isContextLost()};
  })()`);
  assert.equal(result.complete, true);
  assert.equal(result.textures, ids.length, 'all colours share one atlas per shape');
  assert.ok(result.sheenPixels > 20, 'vinyl sheen is visible in actual GPU pixels');
  assert.ok(result.vertices < 16000, 'bounded geometry for repeated blocks');
  for (const [i, o] of level.objects.entries()) for (let k = 0; k < 3; k++) {
    assert.ok(Math.abs(result.sizes[i][k] - OBJECTS[o.id].size[k]) < .002, `${o.id}: rendered dimensions match physics`);
  }
  assert.equal(result.linked, true); assert.equal(result.lost, false);
  writeFileSync('node_modules/.cache/soft-blocks.png', Buffer.from(result.png, 'base64'));
  console.log('PASS padded blocks: eight colours/shapes, shared vinyl atlases, dimensions, sheen pixels and Full/Reduced shaders', {ms:result.ms,calls:result.calls,vertices:result.vertices});
}
