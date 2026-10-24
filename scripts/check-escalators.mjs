// Kontroller ekte GPU-trinnbevegelse og ta bilder fra begge etasjer i en isolert nettleser.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createServer } from 'vite';
import { launchBrowser, waitFor } from './browser-driver.mjs';

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
  await call('Page.navigate', { url: `http://127.0.0.1:${server.httpServer.address().port}/app/#example=mall` });
  await waitFor(() => evaluate('Boolean(window.liminal?.viewer.world)').catch(() => false), 'viewer');
  await evaluate(`liminal.viewer.renderer.setAnimationLoop(null); liminal.layout.set('3d')`);
  await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  await evaluate(`(async () => {
    const v = liminal.viewer;
    await v.world.objects.ready;
    const { escalatorRuns } = await import('/src/core/escalators.js');
    window.mallRuns = escalatorRuns(liminal.level);
    v.mode = 'walk'; v.overview.enabled = false; v._applyLook();
  })()`);
  for (const name of ['lower', 'upper', 'atrium', 'underside', 'above', 'fountain']) {
    await evaluate(`(() => {
      const v = liminal.viewer, r = mallRuns.find(r => !r.down);
      if ('${name}' === 'lower') {
        v.camera.position.set(r.origin[0] + 2.3, 1.65, r.origin[1] + 3.2);
        v.camera.lookAt(r.origin[0] - 3.5, 2.9, r.origin[1] + 0.9);
      } else if ('${name}' === 'upper') {
        v.camera.position.set(r.origin[0] - r.length - 1.2, 6.05, r.origin[1] + 1);
        v.camera.lookAt(r.origin[0] - 3, 2.1, r.origin[1] + 1);
      } else if ('${name}' === 'underside') {
        v.camera.position.set(r.origin[0] - 4.5, 1.65, r.origin[1] + 4);
        v.camera.lookAt(r.origin[0] - 4, 2.2, r.origin[1] + 0.8);
      } else if ('${name}' === 'above') {
        v.camera.position.set(r.origin[0] - 4, 7.2, r.origin[1] + 4);
        v.camera.lookAt(r.origin[0] - 4, 1.5, r.origin[1] + 1);
      } else if ('${name}' === 'fountain') {
        const i = liminal.level.tiles.findIndex(t => t === 2);
        const x = i % liminal.level.w, z = Math.floor(i / liminal.level.w);
        v.camera.position.set(x + 4.5, 2.6, z + 4.5);
        v.camera.lookAt(x + 1.5, 0, z + 1);
      } else {
        const spawn = liminal.level.spawn;
        v.camera.position.set(spawn.x + 1, 1.65, spawn.z);
        v.camera.lookAt(r.origin[0] - 2, 2.5, r.origin[1] + 1);
      }
      v.world.update(0.2, [1,1,1,1]); v.postfx.render(0);
    })()`);
    const { data } = await call('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`node_modules/.cache/mall-escalator-${name}.png`, Buffer.from(data, 'base64'));
    assert.equal(await evaluate('liminal.viewer.renderer.info.programs.every(p => p.diagnostics?.runnable !== false)'), true);
    console.log(`PASS escalator ${name}: shaders and screenshot`);
  }
  assert.equal(await evaluate(`Boolean(liminal.viewer.world.group.getObjectByName('fountainStone'))`), true, 'Mall fountain has a stone coping');
  assert.equal(await evaluate(`'USE_CAUSTICS' in liminal.viewer.world.group.getObjectByName('basin').material.defines`), false, 'Mall mosaics do not use swimming-pool caustics');
  await evaluate(`(() => {
    const v = liminal.viewer;
    const r = mallRuns.find(r => !r.down);
    v.camera.position.set(r.origin[0] + 2.3, 1.65, r.origin[1] + 3.2);
    v.camera.lookAt(r.origin[0] - 3.5, 2.9, r.origin[1] + 0.9);
  })()`);
  // Vis bare trinnene: ingen vannbølger, flimring, korn eller andre objekter kan gi utslaget.
  const floorHits = await evaluate(`(async () => {
    const { inspectEscalatorFloor } = await import('/scripts/mall-probe.js');
    return inspectEscalatorFloor(liminal.viewer, mallRuns.find(r => !r.down));
  })()`);
  assert.ok(floorHits.some((hit) => hit.mesh === 'escalatorFloor' && Math.abs(hit.point[1]) < 0.001), 'Solid tiled floor below the free escalator');
  console.log('PASS escalator floor: downward ray hits geometry instead of the scene background');
  assert.deepEqual(await evaluate(`(() => {
    const v = liminal.viewer;
    for (const child of v.world.group.children) child.visible = child.name === 'escalators';
    const render = (t) => { v.world.update(t, [1,1,1,1]); v.postfx.render(0); return v.renderer.domElement.toDataURL(); };
    const before = render(0), after = render(0.3), paused = render(0.3);
    return { moves: before !== after, freezes: after === paused, meshes: v.world.group.getObjectByName('escalators').children.length };
  })()`), { moves: true, freezes: true, meshes: 2 });
  assert.deepEqual(errors, []);
  assert.deepEqual(browser.errors, []);
  console.log('PASS isolated GPU step animation and frozen simulation time');
} finally {
  await browser?.close();
  await server.close();
}
