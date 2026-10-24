// Repeterbar telling av innsendte trekanter/tegnekommandoer, også i vannets to renderpass.
// Dette er ikke en FPS-måling: hodeløs Chrome bruker SwiftShader, ikke en fysisk GPU.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createServer } from 'vite';
import { launchBrowser, waitFor } from './browser-driver.mjs';
import { generateLevel } from '../src/gen/index.js';
import { levelToJSON } from '../src/core/serialize.js';

const server = await createServer({ server: { host: '127.0.0.1', port: 0, open: false } });
await server.listen();
let browser;
try {
  browser = await launchBrowser();
  const { call, evaluate, on } = browser;
  const errors = [];
  on('Runtime.consoleAPICalled', (e) => { if (e.type === 'error') errors.push(e.args.map((a) => a.value ?? a.description).join(' ')); });
  await call('Emulation.setDeviceMetricsOverride', { width: 800, height: 600, deviceScaleFactor: 1, mobile: false });
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `if (location.protocol === 'http:') localStorage.setItem('liminal.settings.v1', JSON.stringify({sound:false,music:false,mood:'normal',effects:'reduced',renderScale:0.5,grain:false,waterReflections:true}));` });
  await call('Page.navigate', { url: `http://127.0.0.1:${server.httpServer.address().port}/app/#example=office` });
  await waitFor(() => evaluate('Boolean(window.liminal?.viewer.world)').catch(() => false), 'viewer');
  await evaluate(`liminal.viewer.renderer.setAnimationLoop(null); liminal.layout.set('3d')`);
  await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  const results = [];
  for (const theme of ['pool', 'playroom']) for (const [w, h] of [[48, 40], [96, 80]]) {
    const level = generateLevel({ theme, w, h, seed: 6 });
    await evaluate(`(async () => {
      const { levelFromJSON } = await import('/src/core/serialize.js');
      liminal.setLevel(levelFromJSON(${JSON.stringify(levelToJSON(level))}));
      await liminal.viewer.world.objects.ready;
      const v = liminal.viewer;
      v.mode = 'walk'; v.overview.enabled = false; v._applyLook();
      v.world.update(0, [1,1,1,1]);
    })()`);
    for (const angle of [0, Math.PI / 2, Math.PI]) {
      const stats = await evaluate(`(() => {
        const v = liminal.viewer, spawn = liminal.level.spawn;
        v.camera.position.set(spawn.x, 1.65, spawn.z);
        v.camera.rotation.set(-0.1, ${angle}, 0, 'YXZ');
        v.renderer.info.autoReset = false;
        v.renderer.info.reset();
        v.postfx.render(0);
        const result = { calls: v.renderer.info.render.calls, triangles: v.renderer.info.render.triangles };
        v.renderer.info.autoReset = true;
        return result;
      })()`);
      results.push({ theme, size: `${w}x${h}`, seed: 6, angle, ...stats });
      console.log(JSON.stringify(results.at(-1)));
    }
    const { data } = await call('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`node_modules/.cache/render-${theme}-${w}.png`, Buffer.from(data, 'base64'));
    const check = await evaluate(`(async () => {
      const { compareCulling } = await import('/scripts/render-probe.js');
      return compareCulling(liminal.viewer);
    })()`);
    assert.equal(check.identical, true, `${theme} ${w}x${h}: culling preserves every rendered pixel`);
    console.log(`PASS ${theme} ${w}x${h}: identical pixels with/without culling`);
    if (theme === 'playroom') {
      const wake = await evaluate(`(async () => {
        const v = liminal.viewer, l = liminal.level;
        const i = l.tiles.findIndex(t => t === 2), x = i % l.w, z = Math.floor(i / l.w);
        v.camera.position.set(x + 0.5, 1.65, z - 0.5); v.camera.lookAt(x + 1, -0.05, z + 2);
        v.world.balls.touch(x + 1, z + 0.5, 1.5); v.world.balls.update(0);
        const { compareCulling } = await import('/scripts/render-probe.js');
        return compareCulling(v);
      })()`);
      assert.equal(wake.identical, true, `${theme} ${w}x${h}: wake has no culled edges`);
      console.log(`PASS ${theme} ${w}x${h}: ball wake preserves pixels across chunk edges`);
    }
    assert.equal(await evaluate('liminal.viewer.renderer.info.programs.every(p => p.diagnostics?.runnable !== false)'), true);
  }
  writeFileSync('node_modules/.cache/render-measure.json', JSON.stringify(results, null, 2));
  assert.deepEqual(errors, []);
  assert.deepEqual(browser.errors, []);
} finally {
  await browser?.close();
  await server.close();
}
