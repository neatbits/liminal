// Production coverage for see-through storefronts and the single planar floor reflection.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { waitFor } from './browser-driver.mjs';
import { checkShopfrontFloors } from './check-shopfront-floors.mjs';
import { checkMallAtrium } from './check-mall-atrium.mjs';
import { checkShopInteriors } from './check-shop-interiors.mjs';
import { checkRoofEnds } from './check-roof-ends.mjs';
import { checkShopPanelBacks } from './check-shop-panel-backs.mjs';
import { presetById } from '../src/gen/index.js';
import { encodeLevel } from '../src/core/serialize.js';

export async function checkMall(browser, origin) {
  const { call, evaluate } = browser;
  const fixture = presetById('mall').make({seed:7,layout:'gallery'});
  await call('Page.navigate',{url:'about:blank'});
  await waitFor(()=>evaluate('location.href==="about:blank"').catch(()=>false),'blank before Mall fixture');
  await call('Page.navigate', { url: `${origin}/app/#room=${await encodeLevel(fixture)}` });
  await waitFor(() => evaluate(`liminal?.level.name === 'The Mall' && Boolean(liminal.viewer.world)`).catch(() => false), 'mall scene');
  await evaluate(`(async () => {
    const v = liminal.viewer;
    v.renderer.setAnimationLoop(null);
    await v.world.objects.ready;
    liminal.layout.set('3d');
    v.updateSettings({effects:'full',grain:false,vhs:false,mood:'normal',waterReflections:false});
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    v.mode='walk'; v.overview.enabled=false; v._applyLook();
    v.camera.position.set(16.5,1.65,23.5); v.camera.lookAt(45,1.5,22);
    v.world.update(0,[1,1,1,1]); v.postfx.render(0);
  })()`);
  const result = await evaluate(`(() => {
    const v=liminal.viewer, g=v.world.group;
    const mesh=name=>g.getObjectsByProperty('name',name).find(o=>o.isMesh);
    const glass=mesh('shopGlass'), floor=mesh('floor'), rail=mesh('railGlass');
    const u=floor.material.uniforms;
    window.__mallFloorUniforms=u;
    const enabled=u.uFloorMirrorOn.value;
    v.world.floorReflection.setEnabled(false);
    v.renderer.info.autoReset=false; v.renderer.info.reset(); v.postfx.render(0);
    const cheap=v.renderer.info.render.calls;
    v.world.floorReflection.setEnabled(true);
    v.renderer.info.reset(); v.postfx.render(0);
    const reflected=v.renderer.info.render.calls;
    v.renderer.info.autoReset=true;
    return {enabled,cheap,reflected,transparent:glass.material.transparent,depthWrite:glass.material.depthWrite,
      railGlass:!!rail, mirrorSize:[u.uFloorMirror.value.image.width,u.uFloorMirror.value.image.height],
      linked:v.renderer.info.programs.every(p=>p.diagnostics?.runnable!==false), lost:v.renderer.getContext().isContextLost()};
  })()`);
  assert.equal(result.enabled,1);
  assert.equal(result.transparent,true);
  assert.equal(result.depthWrite,false);
  assert.equal(result.railGlass,true);
  assert.ok(result.reflected>result.cheap, 'reflection draws the actual scene');
  assert.ok(result.reflected<result.cheap*3, 'reflection does not recurse through water or other floors');
  assert.ok(result.mirrorSize.every(n=>n>0&&n<=1024));
  assert.equal(result.linked,true); assert.equal(result.lost,false);
  // Read immediately after drawing: WebGL's default framebuffer may be cleared before CDP captures it.
  const screenshot = async name => {
    const shot=await evaluate(`(() => {
      const v=liminal.viewer; v.postfx.render(0);
      const gl=v.renderer.getContext(), w=gl.drawingBufferWidth, h=gl.drawingBufferHeight;
      const pixels=new Uint8Array(w*h*4); gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      let lit=0,total=0;
      for(let i=0;i<pixels.length;i+=64){total++;if(pixels[i]+pixels[i+1]+pixels[i+2]>30)lit++;}
      return {png:v.renderer.domElement.toDataURL('image/png').split(',')[1],lit:lit/total};
    })()`);
    assert.ok(shot.lit>0.4, name+': visible scene with bloom and reflection, not a black frame');
    writeFileSync('node_modules/.cache/'+name+'.png',Buffer.from(shot.png,'base64'));
  };
  await screenshot('mall-hall');
  await evaluate(`(() => {
    const v=liminal.viewer;
    v.camera.position.set(18,6.05,14); v.camera.lookAt(25,5.8,8);
    v.settings.vhs=true; v._applyLook(); v.hud.tick(1); v.postfx.render(0);
  })()`);
  assert.equal(await evaluate(`window.__mallFloorUniforms.uFloorHeight.value`),4.4);
  assert.equal(await evaluate(`document.querySelector('.hud-vhs').hidden`),false);
  assert.equal(await evaluate(`document.querySelector('.vhs-speed').textContent`),'SP');
  await screenshot('mall-storefronts');
  await checkShopfrontFloors(browser);
  await checkShopPanelBacks(browser);
  await checkMallAtrium(browser);
  await checkRoofEnds(browser);
  await checkShopInteriors(browser);
  await evaluate(`liminal.viewer.updateSettings({effects:'reduced',vhs:false})`);
  assert.equal(await evaluate(`window.__mallFloorUniforms.uFloorMirrorOn.value`),0);
  await evaluate(`liminal.viewer.mode='overview'; liminal.viewer._applyLook(); liminal.viewer.postfx.render(0)`);
  assert.equal(await evaluate(`document.querySelector('.hud-vhs').hidden`),true);
  console.log('PASS Mall: glass facades, glass guards, ground/upper floor reflections, reduced effects and VHS overlay',result);
}
