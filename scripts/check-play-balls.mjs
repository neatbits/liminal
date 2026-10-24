// Ekte fysikk og renderkobling for løse baller, med en isolert nettleserprofil.
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
  await call('Emulation.setDeviceMetricsOverride', { width: 1000, height: 720, deviceScaleFactor: 1, mobile: false });
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `if (location.protocol === 'http:') localStorage.setItem('liminal.settings.v1', JSON.stringify({sound:false,music:false,mood:'normal',grain:false,effects:'full',waterReflections:false}));` });
  await call('Page.navigate', { url: `http://127.0.0.1:${server.httpServer.address().port}/app/#example=playroom` });
  await waitFor(() => evaluate('Boolean(window.liminal?.viewer.world && liminal.viewer.walk.play.soft.phys)').catch(() => false), 'physics loaded');
  await evaluate(`liminal.viewer.renderer.setAnimationLoop(null); liminal.layout.set('3d')`);
  await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  await evaluate(`(async () => {
    const v = liminal.viewer;
    await v.world.objects.ready;
    v.mode = 'walk'; v.overview.enabled = false; v._applyLook();
    window.savedPlayObjects = JSON.stringify(liminal.level.objects);
    const soft = v.walk.play.soft;
    const away = { x:-100,z:-100,floorY:0,vx:0,vz:0 };
    for (let k=0;k<120;k++) soft.update(1/60,away,false);
  })()`);
  for (const place of ['floor', 'pit']) {
    const result = await evaluate(`(async () => {
      const v = liminal.viewer, soft = v.walk.play.soft;
      const entry = soft.phys.blocks.find(p => liminal.level.objects[p.i].id === 'playball' &&
        liminal.level.tiles[liminal.level.objects[p.i].z * liminal.level.w + liminal.level.objects[p.i].x] === ${place === 'floor' ? 1 : 2});
      if (!entry) throw new Error('No ${place} play ball');
      const body = entry.body, before = body.position.clone();
      body.velocity.set(1.5,1.4,0); body.wakeUp();
      for (let k=0;k<30;k++) soft.update(1/60,{x:-100,z:-100,floorY:0,vx:0,vz:0},false);
      const { ballRenderError } = await import('/scripts/play-ball-probe.js');
      const renderError = ballRenderError(v,entry.i,body);
      v.camera.position.set(body.position.x+1.4,0.8,body.position.z+1.6);
      v.camera.lookAt(body.position.x,body.position.y,body.position.z);
      v.world.update(0,[1,1,1,1]); v.postfx.render(0);
      return { moved:body.position.distanceTo(before)>0.2, renderError, bodies:soft.phys.blocks.filter(p=>p.radius).length };
    })()`);
    assert.equal(result.moved, true);
    assert.ok(result.renderError < 0.001, 'Model sphere follows its actual physics centre');
    assert.ok(result.bodies <= 48);
    const { data } = await call('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`node_modules/.cache/play-ball-${place}.png`, Buffer.from(data, 'base64'));
    console.log(`PASS ${place}: sphere physics, moving mesh and screenshot (${result.bodies} physical balls)`);
  }
  assert.equal(await evaluate(`(() => {
    const v = liminal.viewer, w = v.walk, body = w.play.soft.phys.blocks.find(p=>p.radius).body;
    w.active=true; w.session.setPaused(true);
    const before=JSON.stringify([body.position,body.velocity]);
    w.update(0.1,v.camera,[1,1,1,1],[]);
    return before === JSON.stringify([body.position,body.velocity]);
  })()`), true, 'Pause freezes the physical balls');
  assert.equal(await evaluate('JSON.stringify(liminal.level.objects) === savedPlayObjects'), true, 'Simulation never changes saved room objects');
  await evaluate('liminal.viewer.walk.play.reset()');
  await waitFor(() => evaluate('Boolean(liminal.viewer.walk.play.soft.phys)').catch(() => false), 'reset physics');
  assert.equal(await evaluate('liminal.viewer.walk.play.soft.phys.moved()'), false, 'Exit/reset restores start positions');
  assert.equal(await evaluate('liminal.viewer.renderer.info.programs.every(p => p.diagnostics?.runnable !== false)'), true);
  assert.deepEqual(errors, []);
  assert.deepEqual(browser.errors, []);
  console.log('PASS pause, immutable saved objects, reset and shaders');
} finally {
  await browser?.close();
  await server.close();
}
