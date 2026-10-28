// Visuell sjekk av LED-striper og lyspaneler: inne i rommet, i dukkehuset og under strømbrudd.
// Bildene havner i node_modules/.cache/leds-<navn>-<suffiks>.png. SwiftShader sier ikke noe om ytelse.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createServer } from 'vite';
import { launchBrowser, waitFor } from './browser-driver.mjs';
import { createLevel, TILE } from '../src/core/level.js';
import { autoLights } from '../src/core/ops.js';
import { levelToJSON } from '../src/core/serialize.js';

/** 12 × 9 m: LED-striper langs veggene i venstre halvdel, lyspaneler midt i høyre. */
function room(theme) {
  const level = createLevel({ theme, w: 14, h: 11, height: 2.8 });
  for (let z = 1; z < 10; z++) for (let x = 1; x < 13; x++) level.tiles[z * level.w + x] = TILE.FLOOR;
  for (let z = 1; z < 10; z++) if (z !== 5) level.tiles[z * level.w + 7] = TILE.WALL;
  autoLights(level, { spacing: 4, state: 1 });
  for (let z = 0; z < 11; z++) for (let x = 0; x < 8; x++) if (level.tiles[z * level.w + x] === TILE.WALL) level.leds[z * level.w + x] = 1;
  for (let z = 1; z < 10; z++) for (let x = 8; x < 13; x++) level.lights[z * level.w + x] = 0;
  for (let z = 3; z < 8; z++) for (let x = 9; x < 12; x++) level.panels[z * level.w + x] = 1;
  return level;
}

const VIEWS = [
  ['leds', 'hotel', [6.5, 1.6, 8.5], [1.5, 2, 2], 1],
  ['panels', 'office', [8.5, 1.6, 9.2], [11, 1.4, 3], 1],
  ['blackout', 'hotel', [6.5, 1.6, 8.5], [1.5, 2, 2], 0],
  ['overview', 'hotel', null, null, 1],
];

const server = await createServer({ server: { host: '127.0.0.1', port: 0, open: false } });
await server.listen();
let browser;
try {
  browser = await launchBrowser({ hardware: process.argv.includes('--hardware') });
  const { call, evaluate, on } = browser;
  const errors = [];
  on('Runtime.consoleAPICalled', (event) => {
    if (event.type === 'error') errors.push(event.args.map((arg) => arg.value ?? arg.description).join(' '));
  });
  await call('Emulation.setDeviceMetricsOverride', { width: 1000, height: 800, deviceScaleFactor: 1, mobile: false });
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `if (location.protocol === 'http:') localStorage.setItem('liminal.settings.v1', JSON.stringify({sound:false,music:false,mood:'normal',effects:'full',renderScale:1,grain:false,waterReflections:false}));` });
  await call('Page.navigate', { url: `http://127.0.0.1:${server.httpServer.address().port}/app/#example=office` });
  await waitFor(() => evaluate('Boolean(window.liminal?.viewer.world)').catch(() => false), 'viewer');
  await evaluate(`liminal.viewer.renderer.setAnimationLoop(null); liminal.layout.set('3d')`);
  await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');

  const suffix = process.argv.find((a) => !a.startsWith('-') && a !== process.argv[0] && a !== process.argv[1]) ?? 'after';
  for (const [name, theme, eye, target, power] of VIEWS) {
    await evaluate(`(async () => {
      const { levelFromJSON } = await import('/src/core/serialize.js');
      liminal.setLevel(levelFromJSON(${JSON.stringify(levelToJSON(room(theme)))}));
      const v = liminal.viewer;
      await v.world.objects.ready;
      const eye = ${JSON.stringify(eye)};
      if (eye) {
        v.mode = 'walk'; v.overview.enabled = false; v._applyLook();
        v.camera.position.set(...eye); v.camera.lookAt(...${JSON.stringify(target)});
      } else v.overview.go('perspective', true);
      v.world.setPower(${power});
      v.world.update(0, [1,1,1,1]); v.postfx.render(0);
    })()`);
    const { data } = await call('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`node_modules/.cache/leds-${name}-${suffix}.png`, Buffer.from(data, 'base64'));
    assert.equal(await evaluate(`liminal.viewer.renderer.info.programs.every(p => p.diagnostics?.runnable !== false)`), true);
    await evaluate(`liminal.viewer.mode = 'overview'; liminal.viewer.overview.enabled = true; liminal.viewer.world.setPower(1)`);
    console.log(`PASS ${name}: shaders and screenshot (${suffix})`);
  }
  assert.deepEqual(errors, [], 'Rendering errors');
  assert.deepEqual(browser.errors, [], 'Uncaught errors');
} finally {
  await browser?.close();
  await server.close();
}
