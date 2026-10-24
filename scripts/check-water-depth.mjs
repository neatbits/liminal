// Gjenskaper dybdeskiftet ved stupebrett med samme basseng sett fra flere vinkler.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createServer } from 'vite';
import { launchBrowser, waitFor } from './browser-driver.mjs';
import { createLevel, TILE } from '../src/core/level.js';
import { autoLights } from '../src/core/ops.js';
import { levelToJSON } from '../src/core/serialize.js';

const level = createLevel({ theme: 'pool', w: 16, h: 16, height: 4 });
for (let z = 1; z < 15; z++) for (let x = 1; x < 15; x++) {
  const i = z * 16 + x;
  level.tiles[i] = x >= 4 && x <= 13 && z >= 3 && z <= 12 ? TILE.WATER : TILE.FLOOR;
  if (x >= 5 && x <= 9 && z >= 7 && z <= 9) level.depths[i] = 28;
}
level.objects = [{ id: 'divingboard', x: 3, z: 8, rot: 3 }];
autoLights(level, { spacing: 4, state: 1 });
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
  await call('Emulation.setDeviceMetricsOverride', { width: 1200, height: 800, deviceScaleFactor: 1, mobile: false });
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `if (location.protocol === 'http:') localStorage.setItem('liminal.settings.v1', JSON.stringify({sound:false,music:false,mood:'normal',grain:false,effects:'reduced',renderScale:1,waterReflections:true,waterWaves:0,fpsCap:30}));` });
  await call('Page.navigate', { url: `http://127.0.0.1:${server.httpServer.address().port}/app/#example=office` });
  await waitFor(() => evaluate('Boolean(window.liminal?.viewer.world)').catch(() => false), 'viewer');
  await evaluate(`(async () => {
    liminal.viewer.renderer.setAnimationLoop(null);
    const { levelFromJSON } = await import('/src/core/serialize.js');
    liminal.setLevel(levelFromJSON(${JSON.stringify(levelToJSON(level))}));
    await liminal.viewer.world.objects.ready;
    liminal.layout.set('3d');
    const v = liminal.viewer;
    v.mode = 'walk'; v.overview.enabled = false; v._applyLook();
    v.world.update(0, [1,1,1,1]);
  })()`);
  await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  for (const [name, camera] of [['above', [11, 3.4, 13]], ['side', [12, 1.65, 5]], ['waves', [12, 1.65, 5]], ['simple', [12, 1.65, 5]]]) {
    await evaluate(`(() => {
      const v = liminal.viewer;
      v.world.water.setQuality(${name !== 'simple'});
      v.world.water.setDetail(${name === 'waves'});
      v.world.water.setWaves(${name === 'waves' ? 1 : 0});
      v.camera.position.set(${camera.join(',')}); v.camera.lookAt(7, -0.4, 8);
      v.postfx.render(0);
    })()`);
    const { data } = await call('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`node_modules/.cache/water-depth-${name}.png`, Buffer.from(data, 'base64'));
    assert.equal(await evaluate('liminal.viewer.renderer.info.programs.every(p => p.diagnostics?.runnable !== false)'), true);
    console.log(`PASS water depth, ${name}: render and screenshot`);
  }
  await evaluate('liminal.viewer.world.water.setWaves(0)');
  const probes = await evaluate(`import('/scripts/water-depth-probe.js').then(m => m.probeWaterDepth(liminal.viewer))`);
  assert.equal(probes.length, 10);
  for (const probe of probes) assert.ok(Math.abs(probe.actual - probe.expected) < 0.16, JSON.stringify(probe));
  console.log('PASS water absorption follows visible geometry (10 GPU/raycast probes, normal and simple water)');
  const ripples = await evaluate(`import('/scripts/water-ripple-probe.js').then(m => m.probeStillWaterRipples(liminal.viewer))`);
  for (const result of ripples) {
    assert.ok(result.splashCount >= 2, 'landing creates splash rings');
    assert.equal(result.stillChanges, 0, `${result.mode}: no background movement at 0 %`);
    assert.ok(result.splashChanges > 20, `${result.mode}: splash rings remain visible at 0 % (${result.splashChanges} pixels)`);
  }
  assert.equal(ripples.at(-1).settledChanges, 0, 'water settles after splash rings fade');
  console.log('PASS jumping into still water: visible ripples in all water quality modes, then calm again');
  assert.deepEqual(errors, []);
  assert.deepEqual(browser.errors, []);
} finally {
  await browser?.close();
  await server.close();
}
