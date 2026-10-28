// Gjenskaper blokkert WebGL etter et GPU-krasj, uten å krasje selve driveren.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { waitFor } from './browser-driver.mjs';
import { TILE } from '../src/core/level.js';

export async function checkUnavailable(browser, origin) {
  const { call, evaluate } = browser;
  const errors = [];
  browser.on('Runtime.consoleAPICalled', e => {
    if (e.type === 'error') errors.push(e.args.map(a => a.value ?? a.description).join(' '));
  });
  await call('Emulation.setTouchEmulationEnabled', { enabled: false });
  await call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  const before = await evaluate(`localStorage.getItem('liminal.rooms.v1')`);
  const { identifier } = await call('Page.addScriptToEvaluateOnNewDocument', { source: `
    const context = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      return /^(webgl2?|experimental-webgl)$/.test(type) ? null : context.call(this,type,...args);
    };
  ` });
  // Oppstartsdialogen: fortsett rommet bak den (hovedknappen når det finnes et utkast).
  const closeModal = () => evaluate(`[...document.querySelectorAll('.modal-foot .btn')].find((b) => b.textContent.startsWith('Continue'))?.click()`);
  const ready = () => waitFor(() => evaluate('Boolean(window.liminal?.level && liminal.viewer.unavailable)').catch(() => false), '2D ready without WebGL');
  try {
    await call('Page.navigate', { url: 'about:blank' });
    await call('Page.navigate', { url: `${origin}/app/` });
    await ready(); await closeModal();
    assert.equal(await evaluate(`Boolean(document.querySelector('.graphics-unavailable [type="button"]')) && document.querySelector('#sidebar').childElementCount > 0 && document.querySelector('#menus').childElementCount > 0`), true);
    await evaluate(`(async () => {
      liminal.layout.set('split');
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      document.querySelector('#btn-fit').click();
      const name=liminal.sidebar.name; name.value='Room preserved without 3D';name.dispatchEvent(new Event('input',{bubbles:true}));
      liminal.editor._render();
    })()`);
    const drawn = await evaluate(`(() => {
      const e=liminal.editor,d=e.ctx.getImageData(0,0,e.canvas.width,e.canvas.height).data;
      return d.some((v,i)=>i%4===3&&v>0);
    })()`);
    assert.equal(drawn, true, '2D plan draws while WebGL is blocked');
    const point = await evaluate(`(() => {
      const e=liminal.editor,l=liminal.level,i=l.tiles.findIndex(t=>t===${TILE.FLOOR});
      liminal.setTool('wall'); const [x,y]=e.view.toScreen(i%l.w+0.5,Math.floor(i/l.w)+0.5),r=e.canvas.getBoundingClientRect();
      return {x:x+r.left,y:y+r.top,i};
    })()`);
    for (const type of ['mousePressed', 'mouseReleased']) await call('Input.dispatchMouseEvent', { type, x:point.x, y:point.y, button:'left', clickCount:1 });
    assert.equal(await evaluate(`liminal.level.tiles[${point.i}]`), TILE.WALL, 'wall tool edits the room without 3D');
    await evaluate(`document.querySelector('#btn-undo').click()`);
    assert.equal(await evaluate(`liminal.level.tiles[${point.i}]`), TILE.FLOOR, 'undo still works');
    await evaluate(`document.querySelector('#btn-walk-top').click()`);
    assert.equal(await evaluate('liminal.viewer.mode'), 'overview', 'walking is declined safely');
    const { data } = await call('Page.captureScreenshot', { format: 'png' });
    writeFileSync('node_modules/.cache/webgl-unavailable.png', Buffer.from(data, 'base64'));
    // pagehide skal bevare siste endring, også om 3D aldri har startet.
    await call('Page.reload'); await ready(); await closeModal();
    assert.equal(await evaluate('liminal.level.name'), 'Room preserved without 3D');
    assert.equal(await evaluate(`localStorage.getItem('liminal.rooms.v1')`), before, 'saved rooms are untouched');
  } finally {
    await call('Page.removeScriptToEvaluateOnNewDocument', { identifier });
  }
  await evaluate(`document.querySelector('.graphics-unavailable button').click()`);
  await waitFor(() => evaluate('Boolean(window.liminal?.viewer.world)').catch(() => false), '3D retry after graphics become available');
  assert.equal(await evaluate('liminal.level.name'), 'Room preserved without 3D');
  assert.equal(await evaluate('liminal.viewer.renderer.getContext().isContextLost()'), false);
  assert.ok(errors.length > 0, 'the test really rejected graphics context creation');
  assert.ok(errors.every(e => /WebGL.*context/i.test(e)), JSON.stringify(errors));
  assert.deepEqual(browser.errors, [], 'graphics failure is handled without an uncaught startup exception');
  console.log('PASS unavailable WebGL: visible recovery message, working 2D/menus, draft preserved and 3D retry');
}
