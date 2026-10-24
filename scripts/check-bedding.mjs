// A two-sided cloth surface must be lit on whichever side faces the viewer.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createLevel, TILE } from '../src/core/level.js';
import { autoLights } from '../src/core/ops.js';
import { encodeLevel } from '../src/core/serialize.js';
import { waitFor } from './browser-driver.mjs';

export async function checkBedding(browser, origin) {
  const l = createLevel({ name: 'Two-sided bedding', theme: 'ward', w: 12, h: 12, height: 3 });
  for (let z = 1; z < 11; z++) for (let x = 1; x < 11; x++) l.tiles[z * 12 + x] = TILE.FLOOR;
  l.objects = [{ id: 'hospitalbed', x: 5, z: 3, rot: 0 }];
  autoLights(l, { spacing: 3, state: 1 });
  const { call, evaluate } = browser;
  await call('Page.navigate', { url: 'about:blank' });
  await call('Page.navigate', { url: `${origin}/app/#room=${await encodeLevel(l)}` });
  await waitFor(() => evaluate(`window.liminal?.level.name === 'Two-sided bedding' && Boolean(liminal.viewer.world)`).catch(() => false), l.name);
  const result = await evaluate(`(async()=>{
    const v=liminal.viewer; v.renderer.setAnimationLoop(null);
    await v.world.objects.ready;
    liminal.layout.set('3d'); v.updateSettings({effects:'off',renderScale:1,grain:false});
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    v.mode='walk';v.overview.enabled=false;v._applyLook();
    v.camera.position.set(5.8,1.65,6);v.camera.lookAt(5.5,.6,3.5);
    v.world.update(0,[1,1,1,1]);
    const gl=v.renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;
    const render=(unlit)=>{
      v.world.objects.items[0].traverse(m=>{if(m.isMesh)m.material.uniforms.uUnlit.value=unlit;});
      v.postfx.render(0);
      const pixels=new Uint8Array(w*h*4); gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      return pixels;
    };
    const reference=render(1),lit=render(0);
    let changed=0,black=0;
    for(let i=0;i<lit.length;i+=4){
      const a=(reference[i]+reference[i+1]+reference[i+2])/3,b=(lit[i]+lit[i+1]+lit[i+2])/3;
      if(a>150 && a-b>10){changed++;if(b<a*.3)black++;}
    }
    return {changed,black,linked:v.renderer.info.programs.every(p=>p.diagnostics?.runnable!==false)};
  })()`);
  assert.equal(result.linked, true);
  assert.ok(result.changed > 100, 'cloth surface is visible in GPU pixels');
  assert.ok(result.black / result.changed < 0.1, `no black unlit patches in bright cloth: ${JSON.stringify(result)}`);
  const { data } = await call('Page.captureScreenshot', { format: 'png' });
  writeFileSync('node_modules/.cache/bedding.png', Buffer.from(data, 'base64'));
  console.log(`PASS two-sided bedding: ${result.black}/${result.changed} bright pixels have dark patches`);
}
