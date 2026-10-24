// Visuell regresjon for skliestart med tidlig sving, rør og større startplattform.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createServer } from 'vite';
import { launchBrowser, waitFor } from './browser-driver.mjs';
import { createLevel, TILE } from '../src/core/level.js';
import { fillTiles, rectIndices, autoLights } from '../src/core/ops.js';
import { fillZone } from '../src/core/zones.js';
import { addSlide } from '../src/core/slides.js';
import { levelToJSON } from '../src/core/serialize.js';

function fixture(start, tube, theme = 'pool') {
  const level = createLevel({ w: 22, h: 14, height: 5, theme });
  fillTiles(level, rectIndices(level, { x0: 1, z0: 1, x1: 20, z1: 12 }), TILE.FLOOR);
  fillZone(level, 'floor', rectIndices(level, { x0: 2, z0: 4, x1: 5, z1: 8 }), 2.4);
  fillTiles(level, rectIndices(level, { x0: 9, z0: 3, x1: 20, z1: 11 }), TILE.WATER);
  const points = Array.from({ length: 7 - start }, (_, k) => [start + k, 6]);
  points.push([6, 7], [7, 8], [8, 9], [9, 9], [10, 9], [11, 9]);
  addSlide(level, points, tube, 'red');
  autoLights(level, { spacing: 4, state: 1 });
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
  await call('Emulation.setDeviceMetricsOverride', { width: 1100, height: 800, deviceScaleFactor: 1, mobile: false });
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `if (location.protocol === 'http:') localStorage.setItem('liminal.settings.v1', JSON.stringify({sound:false,music:false,mood:'normal',grain:false,effects:'full',waterReflections:false}));` });
  await call('Page.navigate', { url: `http://127.0.0.1:${server.httpServer.address().port}/app/#example=pools` });
  await waitFor(() => evaluate('Boolean(window.liminal?.viewer.world)').catch(() => false), 'viewer');
  await evaluate(`liminal.viewer.renderer.setAnimationLoop(null); liminal.layout.set('3d')`);
  await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  const suffix = process.argv[2] ? `-${process.argv[2]}` : '';
  for (const [name, start, tube, theme] of [['open', 5, false, 'pool'], ['tube', 5, true, 'pool'], ['long-platform', 3, false, 'pool'], ['tube-top', 5, true, 'playroom'], ['tube-side', 5, true, 'playroom']]) {
    await evaluate(`(async () => {
      const {levelFromJSON} = await import('/src/core/serialize.js');
      liminal.setLevel(levelFromJSON(${JSON.stringify(levelToJSON(fixture(start, tube, theme)))}));
      const v = liminal.viewer;
      await v.world.objects.ready;
      v.mode = 'walk'; v.overview.enabled = false; v._applyLook();
      v.camera.position.set(${start - 0.3}, 3.75, 6.5);
      v.camera.lookAt(${start + 2}, 2.1, 6.9);
      if (${JSON.stringify(name)} === 'tube-top') {
        v.camera.position.set(5.2, 4.7, 6.9); v.camera.lookAt(7.5, 2.7, 6.5);
      }
      if (${JSON.stringify(name)} === 'tube-side') {
        v.camera.position.set(6.5, 3.5, 9); v.camera.lookAt(7, 2.8, 6.5);
      }
      v.world.update(0, [1,1,1,1]); v.postfx.render(0);
    })()`);
    const { data } = await call('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`node_modules/.cache/slide-entry-${name}${suffix}.png`, Buffer.from(data, 'base64'));
    assert.equal(await evaluate('liminal.viewer.renderer.info.programs.every(p => p.diagnostics?.runnable !== false)'), true);
    console.log(`PASS slide entry ${name}: render and screenshot`);
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(browser.errors, []);
} finally {
  await browser?.close();
  await server.close();
}
