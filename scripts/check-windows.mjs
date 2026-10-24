// Kontrollerer Poolrooms-glassfelt, Playroom-utsikt med avstand og tørre sklier.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createServer } from 'vite';
import { launchBrowser, waitFor } from './browser-driver.mjs';
import { createLevel, TILE } from '../src/core/level.js';
import { paintWindows } from '../src/core/windows.js';
import { autoLights, fillTiles, rectIndices } from '../src/core/ops.js';
import { fillZone } from '../src/core/zones.js';
import { addSlide } from '../src/core/slides.js';
import { levelToJSON } from '../src/core/serialize.js';

function fixture(theme, sky) {
  const level = createLevel({ theme, w: 16, h: 14, height: 3.4 });
  for (let z = 1; z < 13; z++) for (let x = 1; x < 15; x++) level.tiles[z * 16 + x] = TILE.FLOOR;
  paintWindows(level, theme === 'pool' ? [[4, 0], [5, 0], [6, 0], [7, 0], [15, 4], [15, 5], [15, 6]] : [[5, 0], [6, 0]], true);
  fillZone(level, 'floor', rectIndices(level, { x0: 2, z0: 6, x1: 4, z1: 8 }), 2.4);
  fillTiles(level, rectIndices(level, { x0: 10, z0: 5, x1: 14, z1: 11 }), TILE.WATER);
  addSlide(level, Array.from({ length: 8 }, (_, i) => [4 + i, 7]), true, 'red');
  autoLights(level, { spacing: 4, state: 1 });
  level.sky = sky;
  return level;
}

const server = await createServer({ server: { host: '127.0.0.1', port: 0, open: false } });
await server.listen();
let browser;
try {
  browser = await launchBrowser();
  const { call, evaluate, on } = browser;
  const errors = [];
  on('Runtime.consoleAPICalled', (e) => { if (e.type === 'error') errors.push(e.args.map((a) => a.value ?? a.description).join(' ')); });
  await call('Emulation.setDeviceMetricsOverride', { width: 1100, height: 850, deviceScaleFactor: 1, mobile: false });
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `if (location.protocol === 'http:') localStorage.setItem('liminal.settings.v1', JSON.stringify({sound:false,music:false,mood:'normal',grain:false,effects:'full',waterReflections:false}));` });
  await call('Page.navigate', { url: `http://127.0.0.1:${server.httpServer.address().port}/app/#example=office` });
  await waitFor(() => evaluate('Boolean(window.liminal?.viewer.world)').catch(() => false), 'viewer');
  await evaluate(`liminal.viewer.renderer.setAnimationLoop(null); liminal.layout.set('3d')`);
  await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  for (const [theme, sky] of [['pool', 'day'], ['playroom', 'day'], ['playroom', 'golden'], ['playroom', 'night']]) {
    await evaluate(`(async () => {
      const {levelFromJSON} = await import('/src/core/serialize.js');
      liminal.setLevel(levelFromJSON(${JSON.stringify(levelToJSON(fixture(theme, sky)))}));
      const v = liminal.viewer;
      await v.world.objects.ready;
      v.mode = 'walk'; v.overview.enabled = false; v._applyLook();
      v.camera.position.set(5.7, 1.65, ${theme === 'pool' ? 5 : 2.4});
      v.camera.lookAt(5.7, 1.6, 0.8);
      v.world.update(0, [1,1,1,1]); v.postfx.render(0);
    })()`);
    assert.equal(await evaluate(`liminal.viewer.world.group.getObjectByName('slideIn_red').material.defines.USE_CAUSTICS !== undefined`), theme === 'pool', `${theme}: slide water film`);
    if (theme === 'playroom' && sky === 'day') {
      const result = await evaluate(`(async () => {
        const {landscapeDepthProbe} = await import('/scripts/window-probe.js');
        return landscapeDepthProbe(liminal.viewer);
      })()`);
      for (const sample of [result.first, result.moved]) {
        assert.equal(sample[3], 1, 'probe ray hits visible glass');
        assert.ok(sample[0] > 35 && sample[0] < 155, `buildings stand tens of metres outside: ${sample[0]}`);
      }
      assert.ok(Math.hypot(result.first[1] - result.moved[1], result.first[2] - result.moved[2]) > 0.1, 'moving sideways changes the 3D hit point');
      console.log('PASS Playroom: GPU ray depth, camera parallax and distant buildings', result);
    }
    const { data } = await call('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`node_modules/.cache/window-${theme}-${sky}.png`, Buffer.from(data, 'base64'));
    if (theme === 'playroom' && sky === 'day') {
      await evaluate(`(() => {
        const v = liminal.viewer;
        v.camera.position.set(4.1, 3.8, 7.3); v.camera.lookAt(6.4, 2.6, 7.5);
        v.postfx.render(0);
      })()`);
      const shot = await call('Page.captureScreenshot', { format: 'png' });
      writeFileSync('node_modules/.cache/window-playroom-dry-slide.png', Buffer.from(shot.data, 'base64'));
    }
    assert.equal(await evaluate('liminal.viewer.renderer.info.programs.every(p => p.diagnostics?.runnable !== false)'), true);
    console.log(`PASS ${theme} ${sky}: window render, dry/wet slide and screenshot`);
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(browser.errors, []);
} finally {
  await browser?.close();
  await server.close();
}
