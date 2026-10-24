import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createLevel, TILE } from '../src/core/level.js';
import { FINISHES, FINISH } from '../src/core/finishes.js';
import { autoLights } from '../src/core/ops.js';
import { encodeLevel } from '../src/core/serialize.js';
import { waitFor } from './browser-driver.mjs';

export async function checkManualFinishes(browser, origin) {
  const { call, evaluate } = browser;
  const l = createLevel({ name: 'Manual finish check', theme: 'mall', w: 24, h: 20, height: 4 });
  for (let z = 1; z < 19; z++) for (let x = 1; x < 23; x++) l.tiles[z * l.w + x] = x === 11 || z === 9 ? TILE.WALL : TILE.FLOOR;
  autoLights(l, { spacing: 3, state: 1 });
  await call('Page.navigate', { url: 'about:blank' });
  await call('Page.navigate', { url: `${origin}/app/#room=${await encodeLevel(l)}` });
  const ready = () => waitFor(() => evaluate('window.liminal?.level.name === "Manual finish check" && Boolean(liminal.viewer.world)').catch(() => false), 'manual finishes');
  await ready();
  await evaluate(`liminal.layout.set('2d')`);
  await evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
  await evaluate(`document.querySelector('#btn-fit').click()`);
  await evaluate(`document.querySelector('[title="Floor finish (T)"]').click();liminal.setShape('rect')`);
  assert.deepEqual(await evaluate(`Array.from(document.querySelector('[aria-label="Floor finish"]').options,o=>o.textContent)`), FINISHES.map(f => f.label));
  const drag = async (a, b, erase = false) => {
    const points = await evaluate(`(() => {const e=liminal.editor,r=e.canvas.getBoundingClientRect();return ${JSON.stringify([a,b])}.map(([x,z])=>{const p=e.view.toScreen(x+.5,z+.5);return {x:p[0]+r.left,y:p[1]+r.top}})})()`);
    const button = erase ? 'right' : 'left', buttons = erase ? 2 : 1;
    await call('Input.dispatchMouseEvent', { type:'mouseMoved', ...points[0] });
    await call('Input.dispatchMouseEvent', { type:'mousePressed', ...points[0], button, buttons, clickCount:1 });
    await call('Input.dispatchMouseEvent', { type:'mouseMoved', ...points[1], button, buttons });
    await call('Input.dispatchMouseEvent', { type:'mouseReleased', ...points[1], button, buttons:0, clickCount:1 });
  };
  const rooms = [[[1,1],[10,8]],[[12,1],[22,8]],[[1,10],[10,18]],[[12,10],[22,18]]];
  for (const f of FINISHES.filter(f => f.style !== undefined)) {
    await evaluate(`(() => {const s=document.querySelector('[aria-label="Floor finish"]');s.value='${f.value}';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    assert.equal(await evaluate('liminal.editor.activeTool.value'), f.value);
    await drag(...rooms[f.style]);
    const [x,z] = rooms[f.style][0];
    assert.equal(await evaluate(`liminal.level.finish[${z}*24+${x}]`),f.value);
  }
  const count = () => evaluate(`liminal.level.finish.filter(v=>v===${FINISH.ARCADE}).length`);
  assert.equal(await count(),90);
  await evaluate(`document.querySelector('#btn-undo').click()`); // undo café
  await evaluate(`document.querySelector('#btn-undo').click()`); assert.equal(await count(),0);
  await evaluate(`document.querySelector('#btn-redo').click()`); assert.equal(await count(),90);
  await evaluate(`document.querySelector('#btn-redo').click()`);
  await drag(...rooms[2],true); assert.equal(await count(),0);
  await evaluate(`document.querySelector('#btn-undo').click()`); assert.equal(await count(),90);
  await evaluate(`liminal.setTool('object');document.querySelector('[title="Arcade cabinet"]').click()`);
  await drag([4,12],[4,12]);
  assert.equal(await evaluate(`liminal.level.objects.some(o=>o.id==='arcade2')`),true);
  await evaluate(`document.querySelector('[aria-label="Floor finish"]').blur();document.querySelector('[title="Floor (1)"]').click()`);
  assert.equal(await evaluate('liminal.sidebar.tools.finishRow.hidden'),true);
  for (const type of ['keyDown','keyUp']) await call('Input.dispatchKeyEvent',{type,key:'t',code:'KeyT'});
  assert.equal(await evaluate('liminal.editor.tool.id'),'tiles');
  await evaluate(`[...document.querySelectorAll('.menu-list button')].find(b=>b.textContent.includes('Share link')).click()`);
  await waitFor(() => evaluate('Boolean(document.querySelector(".share-link"))'), 'finish share link');
  const link = await evaluate('document.querySelector(".share-link").value');
  await call('Page.navigate',{url:'about:blank'}); await call('Page.navigate',{url:link}); await ready();
  assert.equal(await count(),90);
  const textures = await evaluate(`(async () => {
    const v=liminal.viewer;await v.world.objects.ready;v.renderer.setAnimationLoop(null);liminal.layout.set('3d');
    v.mode='walk';v.overview.enabled=false;v.updateSettings({effects:'full',grain:false,vhs:false,mood:'normal',renderScale:1});
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    return [0,1,2,3].map(i=>v.world.group.getObjectByName('shopFloor_'+i).material.uniforms.map.value.uuid);
  })()`);
  assert.equal(new Set(textures).size,4);
  for (const [quality, x, z, tx, tz] of [['full',5.5,17,5.5,10.5],['reduced',17,7,17,1.5]]) {
    const image = await evaluate(`(() => {const v=liminal.viewer;v.updateSettings({effects:'${quality}'});
      v.camera.position.set(${x},1.65,${z});v.camera.lookAt(${tx},.8,${tz});v.world.update(0,[1,1,1,1]);v.postfx.render(0);
      return {png:v.renderer.domElement.toDataURL('image/png').split(',')[1],
        linked:v.renderer.info.programs.every(p=>p.diagnostics?.runnable!==false),lost:v.renderer.getContext().isContextLost()};})()`);
    assert.equal(image.linked,true); assert.equal(image.lost,false);
    writeFileSync(`node_modules/.cache/manual-finishes-${quality}.png`,Buffer.from(image.png,'base64'));
  }
  console.log('PASS painted shop finishes: real palette, rectangles, erasing, undo/redo, arcade objects, keyboard, sharing and GPU');
}
