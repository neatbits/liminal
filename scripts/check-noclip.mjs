import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { waitFor } from './browser-driver.mjs';

// Noclip (view3d/noclip.js) fra menyens lenke (app/#noclip): butikken, gjennom firkanten inn i Level 0, tilbake til
// butikken, og rekorden når man går ut. Bilder: node_modules/.cache/noclip-*.jpg.
export async function checkNoclip(browser, origin) {
  const { call, evaluate } = browser;
  await call('Emulation.setDeviceMetricsOverride', { width: 960, height: 600, deviceScaleFactor: 1, mobile: false });
  await call('Page.navigate', { url: 'about:blank' });
  await call('Page.navigate', { url: `${origin}/app/#noclip` });
  await waitFor(() => evaluate('Boolean(document.querySelector(\'.modal[aria-label="Noclip"]\'))').catch(() => false), 'Noclip page');
  await evaluate(`(() => { liminal.layout.set('3d'); liminal.viewer.updateSettings({ mood: 'liminal' }); localStorage.removeItem('liminal.runs.v1');
    document.querySelector('.modal[aria-label="Noclip"] .btn-accent').click(); })()`);
  await waitFor(() => evaluate('Boolean(liminal.viewer.explorer.noclip.run && liminal.viewer.walk.level.theme === "store" && !liminal.viewer.explorer.busy)').catch(() => false), 'the store');
  const shot = async (name) => writeFileSync(`node_modules/.cache/noclip-${name}.jpg`, Buffer.from(await evaluate(`(async () => {
    const v = liminal.viewer; await new Promise((r) => setTimeout(r, 1500)); for (let i = 0; i < 10; i++) v.fogLight.update(0.5); v.postfx.render(0);
    return v.renderer.domElement.toDataURL('image/jpeg', 0.8).split(',')[1]; })()`), 'base64'));
  const view = (x, z, yaw) => evaluate(`(() => { const v = liminal.viewer, w = v.walk.walker; v.renderer.setAnimationLoop(null);
    [w.x, w.z] = [${x}, ${z}]; w.floorY = 0; w.yaw = ${yaw}; w.pitch = -0.08; w.applyToCamera(v.camera); })()`);
  // Lener seg mot firkanten til man glir gjennom (eller ikke): oppdaterer modusen i små steg.
  const lean = (expect) => evaluate(`(async () => {
    const v = liminal.viewer, ex = v.explorer, w = v.walk.walker, m = v.walk.level.noclip;
    [w.x, w.z] = [m.x + 0.5 + m.dx * 0.25, m.z + 0.5 + m.dz * 0.25]; w.yaw = Math.atan2(-m.dx, -m.dz);
    for (let i = 0; i < 20 && !ex.busy; i++) ex.update(0.05);
    for (let i = 0; i < 400 && ex.busy; i++) await new Promise((r) => setTimeout(r, 20));
    return ${expect};
  })()`);

  const store = await evaluate(`(() => { const v = liminal.viewer, ex = v.explorer;
    return { mood: v.settings.mood, depth: ex.depth, mark: Boolean(v.walk.level.noclip), sofa: v.walk.level.objects.some((o) => o.id === 'sofa'),
      tapes: ex.tapes.items.length, extra: ex.noclip.extra() }; })()`);
  assert.deepEqual({ ...store, extra: /NOCLIP · THE STORE/.test(store.extra) }, { mood: 'normal', depth: 0, mark: true, sofa: true, tapes: 0, extra: true });
  await view(17.5, 3.5, Math.PI - 0.5);
  await shot('store');
  const cashier = await evaluate(`(async () => { const v = liminal.viewer; await v.world.objects.ready;
    const i = v.walk.level.objects.findIndex((o) => o.id === 'cashier'); let skinned = false;
    v.world.objects.items[i]?.traverse((o) => (skinned ||= !!o.isSkinnedMesh)); return skinned; })()`);
  assert.equal(cashier, true, 'the cashier is animated');
  await view(28.4, 8.5, 0);
  await shot('cashier');
  await view(20.5, 21.6, Math.PI);
  await shot('mark');

  const inside = await lean(`({ depth: ex.depth, theme: v.walk.level.theme, mood: v.settings.mood, back: Boolean(v.walk.level.noclip), tapes: ex.tapes.items.length })`);
  assert.deepEqual(inside, { depth: 1, theme: 'backrooms', mood: 'liminal', back: true, tapes: 0 }, 'through the wall into Level 0, with a way back');
  await evaluate(`(() => { const v = liminal.viewer, w = v.walk.walker; v.renderer.setAnimationLoop(null); w.yaw += Math.PI; w.pitch = -0.1; w.applyToCamera(v.camera); })()`);
  await shot('level0');
  const map = await evaluate(`(() => { const v = liminal.viewer, ex = v.explorer; for (let i = 0; i < 3; i++) ex.update(0.25);
    const z = ex.noclip.zones.zone, c = document.querySelector('.hud-minimap'); let seen = 0; for (const s of z.seen ?? []) seen += s;
    return { shown: !c.hidden, seen: seen > 20 }; })()`);
  assert.deepEqual(map, { shown: true, seen: true }, 'the map shows what you have seen');
  // M: det store kartet (og ikke lyden) – etter en tur rundt i området, så det er noe å se.
  const press = () => evaluate(`(() => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM', bubbles: true }));
    const v = liminal.viewer, ex = v.explorer, z = ex.noclip.zones.zone, w = v.walk.walker, home = [w.x, w.z];
    for (let k = 0; k < 40; k++) { [w.x, w.z] = [3 + (k * 7) % (z.level.w - 6), 3 + (k * 13) % (z.level.h - 6)]; if (v.walk.level.tiles[Math.floor(w.z) * z.level.w + Math.floor(w.x)] === 1) ex.update(0.25); }
    [w.x, w.z] = home; ex.update(0.25);
    return { big: document.querySelector('.hud-minimap').classList.contains('big'), sound: v.settings.sound }; })()`);
  const sound = await evaluate('liminal.viewer.settings.sound');
  const on = await press();
  writeFileSync('node_modules/.cache/noclip-map.png', Buffer.from((await call('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  const off = await press();
  assert.deepEqual([on, off], [{ big: true, sound }, { big: false, sound }], 'M shows the big map in Noclip, not the sound');

  // Ingen dører: langs gangen i øst ligger neste område klart, og over skjøten bytter man uten svart skjerm – og tilbake.
  await evaluate(`(async () => {
    const v = liminal.viewer, z = v.explorer.noclip.zones, w = v.walk.walker;
    for (let i = 0; i < 200 && !z.list[1]?.world; i++) await new Promise((r) => setTimeout(r, 50));
    v.renderer.setAnimationLoop(null);
    [w.x, w.z] = [z.zone.level.w - 7.5, z.zone.exit + 1.5]; w.floorY = 0; w.yaw = -Math.PI / 2; w.pitch = -0.05; w.applyToCamera(v.camera);
  })()`);
  await shot('seam');
  const cross = (east) => evaluate(`(() => {
    const v = liminal.viewer, ex = v.explorer, z = ex.noclip.zones, w = v.walk.walker, l = z.zone.level;
    [w.x, w.z] = ${east} ? [l.w - 3.8, z.zone.exit + 1.5] : [3.8, z.zone.entry + 1.5];
    ex.update(0.016);
    return { depth: ex.depth, theme: v.walk.level.theme, x: Math.round(w.x * 10) / 10, worlds: z.list.filter((q) => q.world).length,
      black: v.hud.black.classList.contains('on'), worker: Boolean(z.worker) };
  })()`);
  const over = await cross(true);
  assert.equal(over.depth, 2, 'over the seam into the next area');
  assert.notEqual(over.theme, 'backrooms');
  assert.equal(over.x, 4.2, 'the same spot, now in the next area');
  assert.ok(over.worlds >= 2, `both areas built: ${over.worlds}`);
  assert.equal(over.black, false, 'no fade to black');
  assert.equal(over.worker, true, 'the next area is made in the background (view3d/zone-worker.js)');
  const back = await cross(false);
  assert.deepEqual([back.depth, back.theme], [1, 'backrooms'], 'and back again');

  const home = await lean(`({ depth: ex.depth, theme: v.walk.level.theme, mood: v.settings.mood })`);
  assert.deepEqual(home, { depth: 0, theme: 'store', mood: 'normal' }, 'back through the square into the store');
  const left = await evaluate(`(() => { liminal.viewer.exitWalk(false); return { saved: JSON.parse(localStorage.getItem('liminal.runs.v1') ?? '{}').noclip, mood: liminal.viewer.settings.mood, run: liminal.viewer.explorer.noclip.active }; })()`);
  assert.deepEqual({ ...left, saved: { ...left.saved, bestDistance: left.saved.bestDistance > 0 } }, { saved: { runs: 1, bestDepth: 2, bestDistance: true }, mood: 'liminal', run: false });
  assert.deepEqual(browser.errors, []);
  console.log('PASS noclip: the store, through the square into Level 0, over a seam with no doors and back, back to the store, record');
}
