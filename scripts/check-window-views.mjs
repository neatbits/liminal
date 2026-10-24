// Ekte vindusmaterialer: temaer, tider på døgnet og alle fire veggretninger.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createServer } from 'vite';
import { launchBrowser, waitFor } from './browser-driver.mjs';
import { createLevel, TILE, LAYERS } from '../src/core/level.js';
import { paintWindows } from '../src/core/windows.js';
import { windowViewFor, WINDOW_VIEWS } from '../src/core/window-views.js';
import { levelToJSON } from '../src/core/serialize.js';
import { autoLights } from '../src/core/ops.js';

function fixture(theme, sky, rotation) {
  const level = createLevel({ theme, w: 16, h: 16, height: 3.4 });
  for (let z = 1; z < 15; z++) for (let x = 1; x < 15; x++) level.tiles[z * 16 + x] = TILE.FLOOR;
  paintWindows(level, theme === 'pool' ? [[4, 0], [5, 0], [6, 0], [7, 0]] : [[5, 0], [6, 0]], true);
  for (let r = 0; r < rotation; r++) for (const key of LAYERS) {
    const next = new Uint8Array(256);
    for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) next[x * 16 + 15 - z] = level[key][z * 16 + x];
    level[key] = next;
  }
  level.sky = sky; autoLights(level, { spacing: 4, state: 1 });
  return level;
}

const server = await createServer({ server: { host: '127.0.0.1', port: 0, open: false } });
await server.listen();
let browser;
try {
  browser = await launchBrowser({ hardware: process.argv.includes('--hardware') });
  const { call, evaluate, on } = browser, errors = [];
  on('Runtime.consoleAPICalled', (e) => { if (e.type === 'error') errors.push(e.args.map((a) => a.value ?? a.description).join(' ')); });
  await call('Emulation.setDeviceMetricsOverride', { width: 1000, height: 800, deviceScaleFactor: 1, mobile: false });
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `if (location.protocol === 'http:') localStorage.setItem('liminal.settings.v1', JSON.stringify({sound:false,music:false,mood:'normal',grain:false,effects:'full',waterReflections:false}));` });
  await call('Page.navigate', { url: `http://127.0.0.1:${server.httpServer.address().port}/app/#example=office` });
  await waitFor(() => evaluate('Boolean(window.liminal?.viewer.world)').catch(() => false), 'viewer');
  assert.equal(await evaluate('liminal.viewer.renderer.getContext().isContextLost()'), false, 'live graphics context');
  await evaluate(`liminal.viewer.renderer.setAnimationLoop(null); liminal.layout.set('3d')`);
  await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  const shapes = await evaluate(`import('/scripts/landscape-shape-probe.js').then(m => m.landscapeShapeProbe(liminal.viewer.renderer))`);
  const expected = [2, 100000, 2, 4, 100000, 100000, 100000, 2];
  shapes.forEach((value, i) => assert.ok(Math.abs(value - expected[i]) < 0.001, `GPU shape ${i}: ${value}`));
  console.log('PASS roof slopes, rounded foliage and parallel/missing rays: 8 GPU probes');
  const fixtures = Object.keys(WINDOW_VIEWS).flatMap((id) => ['day', 'golden', 'dusk', 'night'].map((sky) => [id, sky, 0]));
  fixtures.push(['backrooms', 'day', 0], ...['school','basement'].flatMap(theme=>[1,2,3].map(r=>[theme,'day',r])));
  const selected = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
  for (const [theme, sky, rotation] of fixtures.filter(([theme]) => !selected.length || selected.includes(theme))) {
    await evaluate(`(async () => {
      const {levelFromJSON} = await import('/src/core/serialize.js');
      liminal.setLevel(levelFromJSON(${JSON.stringify(levelToJSON(fixture(theme, sky, rotation)))}));
      const v = liminal.viewer; await v.world.objects.ready;
      v.mode = 'walk'; v.overview.enabled = false; v._applyLook();
      const rotate = ([x,y,z]) => { for (let r=0;r<${rotation};r++) [x,z]=[16-z,x]; return [x,y,z]; };
      v.camera.position.set(...rotate([5.7,1.65,${theme === 'pool' ? 5 : 2.4}]));
      v.camera.lookAt(...rotate([5.7,1.6,0.8])); v.world.update(0,[1,1,1,1]); v.postfx.render(0);
    })()`);
    const view = windowViewFor(theme);
    assert.equal(await evaluate(`liminal.viewer.world.group.getObjectByName('windowGlass').material.userData.windowView ?? null`), view ? theme : null);
    if (view && sky === 'day' && rotation === 0) {
      const result = await evaluate(`(async () => {
        const {landscapeDepthProbe} = await import('/scripts/window-probe.js'); return landscapeDepthProbe(liminal.viewer);
      })()`);
      for (const p of [result.first, result.moved]) {
        assert.equal(p[3], 1, `${theme}: visible glass`);
        const far=view.city?view.firstRow+4*view.rowGap+40:view.firstRow*2+30;
        assert.ok(p[0] > view.firstRow - view.depth[0] - view.depth[1] - 2 && p[0] < far, `${theme}: scene is distant (${p[0]})`);
      }
      // Treff kan være på front eller side; bruk begge horisontale akser.
      assert.ok(Math.hypot(result.first[1] - result.moved[1], result.first[2] - result.moved[2]) > 0.1, `${theme}: physical parallax`);
      console.log(`PASS ${theme}: GPU distance ${result.first[0].toFixed(1)} m and camera parallax`);
      const ghost=await evaluate(`(async()=>{const [{windowGhostProbe},{windows},{ghostSpot}]=await Promise.all([
        import('/scripts/window-probe.js'),import('/src/core/windows.js'),import('/src/world/window-ghost.js')]);
        const win=windows(liminal.level)[0];
        return windowGhostProbe(liminal.viewer,win,{...ghostSpot(win,()=>.5),y:win.floor+1.2});})()`);
      assert.ok(ghost.seen>4&&ghost.otherWall===0&&ghost.hidden===0,`ghost outside the right wall only: ${JSON.stringify(ghost)}`);
      console.log(`PASS ${theme} ghost: outside the chosen wall only, hidden when off`,ghost);
      const snap=await evaluate(`import('/src/view3d/ghost-snapshot.js').then(async({GhostSnapshot})=>{
        const s=new GhostSnapshot(liminal.viewer.renderer),image=await s.take(()=>.3);
        const out=image&&{width:image.width,height:image.height,texture:image.texture.isTexture};s.dispose();return out;})`);
      assert.ok(snap?.texture&&snap.height>1.6&&snap.height<2&&snap.width>0.5,`ghost model still image: ${JSON.stringify(snap)}`);
      if(view.city) {
        const city=await evaluate(`import('/scripts/window-probe.js').then(m=>m.basementCityProbe(liminal.viewer))`);
        assert.ok(city.ground>0,'city streets can be seen far below');
        assert.ok(Math.abs(city.minY-view.groundY)<.01,'GPU street height matches the elevated view');
        assert.ok(city.roofLow < -5 && city.towerHigh > 5,'neighbouring roofs lie below and towers rise above the viewer');
        console.log('PASS Basement city: streets, lower roofs and high towers',city);
      }
    }
    assert.equal(await evaluate('liminal.viewer.renderer.info.programs.every(p => p.diagnostics?.runnable !== false)'), true);
    assert.equal(await evaluate('liminal.viewer.renderer.getContext().isContextLost()'), false, `${theme}: live graphics context`);
    const { data } = await call('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`node_modules/.cache/view-${theme}-${sky}-${rotation}.png`, Buffer.from(data, 'base64'));
    if (theme === 'pool' && sky === 'day') {
      const clip = await evaluate(`(() => { const r = liminal.viewer.renderer.domElement.getBoundingClientRect();
        return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1}; })()`);
      const shot = await call('Page.captureScreenshot', { format: 'png', clip });
      writeFileSync('node_modules/.cache/poolrooms-window-proposal.png', Buffer.from(shot.data, 'base64'));
    }
    console.log(`PASS ${theme} ${sky} wall ${rotation}: shader and screenshot`);
  }
  assert.deepEqual(errors, []); assert.deepEqual(browser.errors, []);
} finally { await browser?.close(); await server.close(); }
