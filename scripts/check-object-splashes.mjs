// Ekte stol → fysikk → vannuniformer og lydkobling. Ingen lyd til høyttalerne.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createServer } from 'vite';
import { launchBrowser, waitFor } from './browser-driver.mjs';
import { createLevel, TILE } from '../src/core/level.js';
import { autoLights } from '../src/core/ops.js';
import { levelToJSON } from '../src/core/serialize.js';

const level = createLevel({ theme: 'pool', w: 14, h: 10, height: 4 });
for (let z = 1; z < 9; z++) for (let x = 1; x < 13; x++) level.tiles[z * 14 + x] = x >= 8 ? TILE.WATER : TILE.FLOOR;
level.objects = [{ id: 'plasticchair', x: 6, z: 4, rot: 0 }];
autoLights(level, { spacing: 4, state: 1 });
const server = await createServer({ server: { host: '127.0.0.1', port: 0, open: false } });
await server.listen();
let browser;
try {
  browser = await launchBrowser();
  const { call, evaluate } = browser;
  await call('Emulation.setDeviceMetricsOverride', { width: 1100, height: 750, deviceScaleFactor: 1, mobile: false });
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `if (location.protocol === 'http:') localStorage.setItem('liminal.settings.v1', JSON.stringify({sound:false,music:false,mood:'normal',grain:false,effects:'reduced',renderScale:1,waterReflections:true,waterWaves:0,fpsCap:30}));` });
  await call('Page.navigate', { url: `http://127.0.0.1:${server.httpServer.address().port}/app/#example=office` });
  await waitFor(() => evaluate('Boolean(window.liminal?.viewer.world)').catch(() => false), 'viewer');
  await evaluate(`(async () => {
    const v = liminal.viewer; v.renderer.setAnimationLoop(null);
    const { levelFromJSON } = await import('/src/core/serialize.js');
    liminal.setLevel(levelFromJSON(${JSON.stringify(levelToJSON(level))}));
    await v.world.objects.ready;
    liminal.layout.set('3d'); v.mode = 'walk'; v.overview.enabled = false; v._applyLook();
    v.walk.enter(); v.walk.session.resume();
    window.splashes = []; window.flashes = 0;
    v.walk.audio.splash = (...args) => splashes.push(args);
    v.walk.hud.splashFlash = () => flashes++;
    Object.assign(v.walk.walker, { x:4.5, z:4.5, floorY:0, vx:0, vz:0, vy:0 });
  })()`);
  await waitFor(() => evaluate('Boolean(liminal.viewer.walk.play.soft.phys)'), 'chair physics');
  await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  const state = await evaluate(`(() => {
    const v = liminal.viewer, w = v.walk, p = w.play, walker = w.walker;
    w.sound = true;
    for (let i=0;i<120;i++) p.update(1/60,walker,false);
    const dry = splashes.length;
    for (let i=0;i<180 && !splashes.length;i++) {
      walker.vx=1.5; walker.x+=1.5/60; p.update(1/60,walker,false);
    }
    walker.vx=0;
    for (let i=0;i<24;i++) p.update(1/60,walker,false);
    v.world.update(0,[1,1,1,1]);
    v.camera.position.set(6.6,2.3,7.5); v.camera.lookAt(8.5,-0.1,4.5); v.postfx.render(0);
    return {dry, sounds:splashes, flashes, rings:p.ripples.points,
      uniforms:[...v.world.water.mesh.material.uniforms.uRipples.value], waves:v.world.water.mesh.material.uniforms.uWaveStrength.value};
  })()`);
  assert.equal(state.dry, 0);
  assert.equal(state.sounds.length, 1);
  assert.equal(state.flashes, 0, 'object splashes do not flash the player HUD');
  assert.equal(state.waves, 0);
  assert.equal(state.rings.length, 2);
  assert.ok(state.rings.every((p) => p.x >= 8 && p.x < 10 && p.z > 4 && p.z < 5));
  assert.ok(state.uniforms.some((n, i) => i % 4 === 3 && n > 0), 'rings reach the water shader');
  const { data } = await call('Page.captureScreenshot', { format: 'png' });
  writeFileSync('node_modules/.cache/object-splash.png', Buffer.from(data, 'base64'));
  const after = await evaluate(`(() => {
    const v=liminal.viewer,w=v.walk,p=w.play;
    for(let i=0;i<240;i++) p.update(1/60,w.walker,false);
    const count=splashes.length,settled=p.ripples.points.length;
    const body=p.soft.phys.blocks[0].body;
    w.sound=false; body.wakeUp(); body.position.set(8.5,2,4.5); body.velocity.set(0,0,0); body.angularVelocity.set(0,0,0);
    body.quaternion.set(0,0,0,1);
    for(let i=0;i<50;i++) p.update(1/60,w.walker,false);
    const mutedRings=p.ripples.points.length;
    w.session.setPaused(true); const before=body.position.clone(),time=p.ripples.time;
    w.update(0.1,v.camera,[1,1,1,1],[]);
    const paused=before.distanceTo(body.position)===0 && time===p.ripples.time;
    w.exit();
    return {count,settled,mutedRings,mutedCount:splashes.length,paused,reset:p.ripples.points.length};
  })()`);
  assert.equal(after.count, 1, 'sinking and bottom contact do not repeat the splash');
  assert.equal(after.settled, 0);
  assert.equal(after.mutedRings, 2, 'mute preserves visible splash rings');
  assert.equal(after.mutedCount, 1);
  assert.equal(after.paused, true);
  assert.equal(after.reset, 0);
  assert.deepEqual(browser.errors, []);
  assert.equal(await evaluate('liminal.viewer.renderer.info.programs.every(p => p.diagnostics?.runnable !== false)'), true);
  console.log('PASS chair pushed into water: one splash, water uniforms at 0% waves, no HUD flash; mute, pause, settling and reset');
} finally {
  await browser?.close();
  await server.close();
}
