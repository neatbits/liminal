// Visuell regresjon for teksturer på innvendige og utvendige buer i Playroom.
// SwiftShader verifiserer rendering, ikke ytelse på fysisk GPU.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createServer } from 'vite';
import { launchBrowser, waitFor } from './browser-driver.mjs';
import { createLevel, TILE } from '../src/core/level.js';
import { CORNER, setCornerAt } from '../src/core/corners.js';
import { autoLights } from '../src/core/ops.js';
import { levelToJSON } from '../src/core/serialize.js';

const server = await createServer({ server: { host: '127.0.0.1', port: 0, open: false } });
await server.listen();
let browser;
try {
  browser = await launchBrowser();
  const { call, evaluate, on } = browser;
  const errors = [];
  on('Runtime.consoleAPICalled', (event) => {
    if (event.type === 'error') errors.push(event.args.map((arg) => arg.value ?? arg.description).join(' '));
  });
  await call('Emulation.setDeviceMetricsOverride', { width: 1000, height: 900, deviceScaleFactor: 1, mobile: false });
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `if (location.protocol === 'http:') localStorage.setItem('liminal.settings.v1', JSON.stringify({sound:false,music:false,mood:'normal',effects:'full',renderScale:1,grain:false,waterReflections:false}));` });
  await call('Page.navigate', { url: `http://127.0.0.1:${server.httpServer.address().port}/app/#example=office` });
  await waitFor(() => evaluate('Boolean(window.liminal?.viewer.world)').catch(() => false), 'viewer');
  await evaluate(`liminal.viewer.renderer.setAnimationLoop(null); liminal.layout.set('3d')`);
  await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');

  const level = createLevel({ theme: 'playroom', w: 10, h: 10, height: 3 });
  for (let z = 1; z < 9; z++) for (let x = 1; x < 9; x++) level.tiles[z * level.w + x] = TILE.FLOOR;
  const fixtures = [
    ['inside', 1, 1, 0, [3.5, 1.6, 3.5], [1.4, 1.5, 1.4]],
    ['outside', 4, 4, 2, [7, 1.6, 7], [4.6, 1.5, 4.6]],
  ];
  const suffix = process.argv[2] ?? 'after';
  for (const [name, x, z, k, eye, target] of fixtures) {
    level.corners.fill(0);
    level.tiles[4 * level.w + 4] = name === 'outside' ? TILE.WALL : TILE.FLOOR;
    setCornerAt(level, x, z, CORNER.ROUND, k);
    autoLights(level, { spacing: 3, state: 1 });
    await evaluate(`(async () => {
      const { levelFromJSON } = await import('/src/core/serialize.js');
      liminal.setLevel(levelFromJSON(${JSON.stringify(levelToJSON(level))}));
      const v = liminal.viewer;
      await v.world.objects.ready;
      v.mode = 'walk'; v.overview.enabled = false; v._applyLook();
      v.camera.position.set(...${JSON.stringify(eye)}); v.camera.lookAt(...${JSON.stringify(target)});
      v.world.update(0, [1,1,1,1]); v.postfx.render(0);
    })()`);
    const { data } = await call('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`node_modules/.cache/corner-${name}-${suffix}.png`, Buffer.from(data, 'base64'));
    assert.equal(await evaluate(`liminal.viewer.renderer.info.programs.every(p => p.diagnostics?.runnable !== false)`), true);
    console.log(`PASS rounded ${name}: shaders and screenshot (${suffix})`);
  }
  assert.deepEqual(errors, [], 'Rendering errors');
  assert.deepEqual(browser.errors, [], 'Uncaught errors');
} finally {
  await browser?.close();
  await server.close();
}
