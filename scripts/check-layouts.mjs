import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { generateLevel } from '../src/gen/index.js';
import { encodeLevel } from '../src/core/serialize.js';
import { waitFor } from './browser-driver.mjs';

const VIEWS = [['hotel', 'wing', 'bedroom'], ['hotel', 'lobby', 'lobby'], ['office', 'open', 'cubicles'], ['office', 'conference', 'meeting'],
  ['pool', 'cathedral'], ['pool', 'abyss'], ['playroom', 'ballsea'], ['playroom', 'blacklight'],
  ['school', 'auditorium', 'seating'], ['school', 'gym', 'gym'], ['ward', 'nightingale', 'nightingale'], ['ward', 'surgery', 'theatre'], ['ward', 'morgue', 'morgue'], ['garage', 'bays'], ['garage', 'flooded'], ['backrooms', 'canyon'], ['backrooms', 'pillars'],
  ['mall', 'foodcourt', 'foodcourt'], ['mall', 'promenade', 'promenade'], ['mall', 'service', 'stockroom'],
  ['basement', 'storage'], ['basement', 'boiler', 'boiler'], ['basement', 'shelter', 'bunks'], ['basement', 'laundry', 'laundry']];

// Planløsningene (gen/layouts.js) i ekte 3D: alt lastes og tegnes uten feil, modellene og glasset er på plass, og
// byggetiden skrives ut. Skjermbilder: node_modules/.cache/layout-*.jpg.
export async function checkLayouts(browser, origin) {
  const { call, evaluate } = browser;
  await call('Emulation.setDeviceMetricsOverride', { width: 960, height: 600, deviceScaleFactor: 1, mobile: false });
  for (const [theme, layout, kind] of VIEWS) {
    const rooms = [];
    const level = generateLevel({ theme, w: 48, h: 40, seed: 7, layout, onPlan: (p) => rooms.push(...p) });
    const r = rooms.find((p) => p.kind === kind) ?? { x0: 2, z0: 2, x1: level.w - 3, z1: level.h - 3 };
    await call('Page.navigate', { url: 'about:blank' });
    await call('Page.navigate', { url: `${origin}/app/#room=${await encodeLevel(level)}` });
    await waitFor(() => evaluate('Boolean(window.liminal?.viewer.world)').catch(() => false), `${layout} scene`);
    const result = await evaluate(`(async () => {
      const t0 = performance.now();
      liminal.layout.set('3d');
      const v = liminal.viewer;
      await new Promise((r) => setTimeout(r, 2500)); // modellene lastes i bakgrunnen
      v.updateSettings({ effects: 'full', renderScale: 1, vhs: false, grain: false, mood: 'normal' }); v._applyLook();
      v.enterWalk(); v.walk.session.resume(); v.renderer.setAnimationLoop(null);
      const w = v.walk.walker;
      [w.x, w.z] = [${r.x0 + 0.6}, ${r.z0 + 0.6}]; w.floorY = 0;
      w.yaw = Math.atan2(-(${r.x1 + 0.5} - w.x), -(${r.z1 + 0.5} - w.z)); w.pitch = -0.12; w.applyToCamera(v.camera);
      const gl = v.renderer.getContext();
      await new Promise((r) => setTimeout(r, 500));
      v.postfx.render(0);
      const shot = v.renderer.domElement.toDataURL('image/jpeg', 0.8).split(',')[1];
      let glass = 0;
      v.scene.traverse((o) => { if (o.name === 'shopGlass') glass += o.geometry.attributes.position.count; });
      const out = { shot, glass, look: v.level?.look ?? v.walk.level.look, built: Math.round(performance.now() - t0), objects: v.walk.level.objects.length,
        linked: v.renderer.info.programs.every((p) => p.diagnostics?.runnable !== false), lost: gl.isContextLost() };
      v.exitWalk(false);
      return out;
    })()`);
    writeFileSync(`node_modules/.cache/layout-${theme}-${layout}.jpg`, Buffer.from(result.shot, 'base64'));
    assert.ok(result.objects > 0, `${layout}: ${result.objects} objects`);
    assert.equal(result.look ?? 0, level.look ?? 0, 'the look came through the share link');
    assert.equal(result.glass > 0, ['conference', 'surgery', 'foodcourt', 'promenade'].includes(layout), `${layout}: glass ${result.glass}`);
    assert.equal(result.linked, true, `${layout} shaders`);
    assert.equal(result.lost, false);
    assert.deepEqual(browser.errors, []);
    console.log(`PASS ${theme} ${layout}: ${result.objects} objects, look ${result.look}, ${result.built} ms`);
  }
}
