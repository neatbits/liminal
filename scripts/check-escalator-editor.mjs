// Rulletrapp via faktiske verktøyknapper og pekerdrag i produksjonsbygget.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createLevel, TILE } from '../src/core/level.js';
import { encodeLevel } from '../src/core/serialize.js';
import { autoLights } from '../src/core/ops.js';
import { waitFor } from './browser-driver.mjs';

export async function checkEscalatorEditor(browser, origin) {
  const { call, evaluate } = browser;
  const level = createLevel({ name: 'Manual escalators', theme: 'mall', w: 22, h: 18, height: 8 });
  for (let z = 1; z < 17; z++) for (let x = 1; x < 21; x++) {
    const i = z * level.w + x; level.tiles[i] = TILE.FLOOR;
    if (x >= 13) level.decks[i] = 44;
  }
  autoLights(level, { spacing: 4, state: 1 });
  await call('Page.navigate', { url: 'about:blank' });
  await call('Page.navigate', { url: `${origin}/app/#room=${await encodeLevel(level)}` });
  const ready = () => waitFor(() => evaluate(`window.liminal?.level.name === 'Manual escalators' && Boolean(liminal.viewer.world)`).catch(() => false), 'Mall editor');
  await ready();
  await evaluate(`liminal.layout.set('2d')`);
  await evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
  await evaluate(`document.querySelector('[title="Escalator (E)"]').click(); liminal.sidebar.tools.brushRow.querySelectorAll('button')[1].click()`);
  assert.deepEqual(await evaluate(`({tool:liminal.editor.activeTool.escalator,width:liminal.editor.brush,visible:!document.querySelector('[aria-label="Escalator direction"]').hidden,shapeHidden:liminal.sidebar.tools.shapeRow.hidden})`), { tool:true,width:2,visible:true,shapeHidden:true });
  const count = () => evaluate(`liminal.level.tiles.reduce((n,t,i)=>n+(t===${TILE.STAIRS}&&Boolean(liminal.level.meta[i]&4)),0)`);
  const drag = async (a, b, erase = false) => {
    const points = await evaluate(`(() => {
      const e=liminal.editor,r=e.canvas.getBoundingClientRect();
      return ${JSON.stringify([a,b])}.map(([x,z])=>{const p=e.view.toScreen(x+.5,z+.5);return{x:p[0]+r.left,y:p[1]+r.top};});
    })()`);
    const button = erase ? 'right' : 'left', buttons = erase ? 2 : 1;
    await call('Input.dispatchMouseEvent', { type:'mouseMoved',...points[0] });
    await call('Input.dispatchMouseEvent', { type:'mousePressed',...points[0],button,buttons,clickCount:1 });
    await call('Input.dispatchMouseEvent', { type:'mouseMoved',...points[1],button,buttons });
    await call('Input.dispatchMouseEvent', { type:'mouseReleased',...points[1],button,buttons:0,clickCount:1 });
  };
  await drag([6,6],[12,6]); assert.equal(await count(),14);
  await evaluate(`document.querySelector('[aria-label="Escalator direction"]').lastElementChild.click()`);
  await drag([6,10],[12,10]); assert.equal(await count(),28);
  assert.deepEqual(await evaluate(`[liminal.level.meta[6*22+6]&8,liminal.level.meta[10*22+6]&8]`), [0,8]);
  assert.equal(await evaluate(`liminal.level.floors[10*22+12]`),44);
  await evaluate(`document.querySelector('#btn-undo').click()`); assert.equal(await count(),14);
  await evaluate(`document.querySelector('#btn-redo').click()`); assert.equal(await count(),28);
  await drag([6,10],[12,10],true); assert.equal(await count(),14);
  await evaluate(`document.querySelector('#btn-undo').click()`); assert.equal(await count(),28);
  await evaluate(`liminal.setTool('floor')`);
  assert.equal(await evaluate(`document.querySelector('[aria-label="Escalator direction"]').hidden`),true);
  for (const type of ['keyDown','keyUp']) await call('Input.dispatchKeyEvent',{type,key:'e',code:'KeyE'});
  assert.equal(await evaluate(`liminal.editor.tool.id`),'escalator');
  await evaluate(`[...document.querySelectorAll('.menu-list button')].find(b=>b.textContent.includes('Share link')).click()`);
  await waitFor(() => evaluate(`Boolean(document.querySelector('.share-link'))`), 'escalator share link');
  const shared=await evaluate(`document.querySelector('.share-link').value`);
  await call('Page.navigate',{url:'about:blank'}); await call('Page.navigate',{url:shared}); await ready();
  assert.equal(await count(),28);
  assert.deepEqual(await evaluate(`[liminal.level.meta[6*22+6]&8,liminal.level.meta[10*22+6]&8]`),[0,8]);
  assert.deepEqual(await evaluate(`liminal.viewer.world.group.getObjectByName('escalators').children.map(m=>m.name).sort()`),['escalator-down','escalator-up']);
  await evaluate(`liminal.layout.set('3d')`);
  await evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
  await evaluate(`(() => {
    const v=liminal.viewer;v.renderer.setAnimationLoop(null);v.mode='walk';v.overview.enabled=false;v._applyLook();
    v.camera.position.set(4,1.8,8.5);v.camera.lookAt(12,3.1,8.5);v.world.update(1,[1,1,1,1]);v.postfx.render(1);
  })()`);
  assert.equal(await evaluate('liminal.viewer.renderer.getContext().isContextLost()'),false);
  assert.equal(await evaluate('liminal.viewer.renderer.info.programs.every(p=>p.diagnostics?.runnable!==false)'),true);
  const {data}=await call('Page.captureScreenshot',{format:'png'});
  writeFileSync('node_modules/.cache/manual-escalators.png',Buffer.from(data,'base64'));
  console.log('PASS manual escalator tool: width, up/down, drag/erase, undo/redo, keyboard, sharing and 3D');
}
