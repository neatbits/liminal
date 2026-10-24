// Render de berørte temaene i en isolert nettleser; skjermbilder ligger i ignorert cache.
// SwiftShader kontrollerer rendering, men er ikke en måling av ytelsen på en fysisk GPU.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createServer } from 'vite';
import { launchBrowser, waitFor } from './browser-driver.mjs';
import { presetById } from '../src/gen/index.js';
import { createLevel, TILE } from '../src/core/level.js';
import { paintWindows } from '../src/core/windows.js';
import { autoLights } from '../src/core/ops.js';
import { levelToJSON } from '../src/core/serialize.js';

const server = await createServer({ server: { host: '127.0.0.1', port: 0, open: false } });
await server.listen();
let browser;
try {
  browser = await launchBrowser();
  const { call, evaluate, on } = browser;
  const consoleErrors = [];
  on('Runtime.consoleAPICalled', (event) => {
    if (event.type === 'error') consoleErrors.push(event.args.map((arg) => arg.value ?? arg.description).join(' '));
  });
  await call('Emulation.setDeviceMetricsOverride', { width: 1000, height: 700, deviceScaleFactor: 1, mobile: false });
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `if (location.protocol === 'http:') localStorage.setItem('liminal.settings.v1', JSON.stringify({sound:false,music:false,mood:'normal',effects:'full',renderScale:1,waterReflections:false,fpsCap:30}));` });
  await call('Page.navigate', { url: `http://127.0.0.1:${server.httpServer.address().port}/app/#example=office` });
  await waitFor(() => evaluate('Boolean(window.liminal?.viewer.world)').catch(() => false), 'viewer');
  await evaluate(`liminal.viewer.renderer.setAnimationLoop(null); liminal.layout.set('3d')`);
  await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');

  const fixtures = ['level0', 'pools', 'mall', 'playroom', 'school'].map((theme) => [theme, presetById(theme).make()]);
  const room = createLevel({ theme: 'office', w: 12, h: 10, height: 2.7 });
  for (let z = 1; z < 9; z++) for (let x = 1; x < 11; x++) room.tiles[z * 12 + x] = TILE.FLOOR;
  paintWindows(room, [[4, 0], [5, 0], [7, 0]], true);
  autoLights(room, { spacing: 4, state: 1 });
  room.spawn = { x: 5.5, z: 5, a: 0 };
  for (const sky of ['day', 'golden', 'night']) fixtures.push([`windows-${sky}`, { ...room, sky }]);
  fixtures.push(['windows-pool', { ...room, theme: 'pool', sky: 'day' }]);

  const selected = process.argv.slice(2); // valgfritt: bare navngitte scener ved lokale materialendringer
  for (const [name, level] of fixtures.filter(([name]) => !selected.length || selected.includes(name))) {
    await evaluate(`(async () => {
      const { levelFromJSON } = await import('/src/core/serialize.js');
      liminal.setLevel(levelFromJSON(${JSON.stringify(levelToJSON(level))}));
      await liminal.viewer.world.objects.ready;
      const v = liminal.viewer;
      v.mode = 'walk'; v.overview.enabled = false; v._applyLook();
      const spawn = liminal.level.spawn;
      v.camera.position.set(spawn.x, 1.65, spawn.z);
      v.camera.rotation.set(-0.05, spawn.a, 0, 'YXZ');
      v.world.update(0, [1,1,1,1]);
      v.postfx.render(0);
    })()`);
    await new Promise((resolve) => setTimeout(resolve, 200));
    const { data } = await call('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`node_modules/.cache/${name}.png`, Buffer.from(data, 'base64'));
    if (['mall', 'playroom', 'school'].includes(level.theme)) assert.equal(await evaluate(`Boolean(liminal.viewer.world.group.getObjectByName('signs'))`), true);
    if (name === 'windows-pool') {
      assert.equal(await evaluate(`(() => {
        const map = liminal.viewer.world.group.getObjectByName('sunPatch').material.map;
        const canvas = map.image;
        const pixel = canvas.getContext('2d').getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data;
        return pixel[0] > 240 && pixel[1] > 240 && pixel[2] > 240;
      })()`), true, 'Poolrooms sunlight has no crossbar shadow');
    }
    assert.equal(await evaluate(`liminal.viewer.renderer.info.programs.every(p => p.diagnostics?.runnable !== false)`), true, `${name} shaders compile`);
    console.log(`PASS ${name}: shaders, scene and screenshot`);
  }
  assert.deepEqual(consoleErrors, [], 'Rendering errors');
  assert.deepEqual(browser.errors, [], 'Uncaught errors');
} finally {
  await browser?.close();
  await server.close();
}
