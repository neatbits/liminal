import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createLevel, TILE } from '../src/core/level.js';
import { autoLights } from '../src/core/ops.js';
import { encodeLevel } from '../src/core/serialize.js';
import { waitFor } from './browser-driver.mjs';

const HELPERS = `
  const v = liminal.viewer, walk = v.walk, w = walk.walker, c = v.camera;
  const key = (code, type = 'keydown') => window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
  const run = (s) => { for (let t = 0; t < s; t += 1 / 30) walk.update(1 / 30, c, [0, 0, 0, 0], []); };
`;

// Krypeganger i ekte 3D: C og hintene, inn gjennom åpningen med ekte gåing, opp igjen, skikkelsen ved
// åpningen og delingslenken. Skjermbilder: node_modules/.cache/crawl-*.png.
export async function checkCrawl(browser, origin) {
  const { call, evaluate } = browser;
  const l = createLevel({ name: 'Crawl check', theme: 'backrooms', w: 24, h: 16, height: 2.8 });
  for (let z = 1; z < 15; z++) for (let x = 1; x < 23; x++) if (x < 9 || x > 15) l.tiles[z * l.w + x] = TILE.FLOOR;
  for (let x = 9; x <= 12; x++) l.tiles[7 * l.w + x] = TILE.CRAWL;
  for (let z = 7; z <= 11; z++) l.tiles[z * l.w + 12] = TILE.CRAWL;
  for (let x = 12; x <= 15; x++) l.tiles[11 * l.w + x] = TILE.CRAWL;
  autoLights(l, { spacing: 4, state: 1 });
  l.spawn = { x: 5.5, z: 7.5, a: -Math.PI / 2 };
  await call('Page.navigate', { url: 'about:blank' });
  await call('Page.navigate', { url: `${origin}/app/#room=${await encodeLevel(l)}` });
  await waitFor(() => evaluate('Boolean(window.liminal?.viewer.world)').catch(() => false), 'crawl scene');
  await call('Emulation.setDeviceMetricsOverride', { width: 1100, height: 680, deviceScaleFactor: 1, mobile: false });
  const png = async (name) => writeFileSync(`node_modules/.cache/crawl-${name}.png`, Buffer.from(await evaluate(`(() => {
    const v = liminal.viewer; v.postfx.render(0); return v.renderer.domElement.toDataURL('image/png').split(',')[1];
  })()`), 'base64'));
  const shared = await evaluate(`liminal.editor.room.tiles[7 * 24 + 10]`);
  await evaluate(`liminal.layout.set('3d')`);
  await new Promise((r) => setTimeout(r, 1500));
  await png('overview');
  await evaluate(`(() => {${HELPERS}
    v.updateSettings({ effects: 'full', renderScale: 1, vhs: false, grain: false, mood: 'normal' }); v._applyLook();
    v.enterWalk(); walk.session.resume();
    v.renderer.setAnimationLoop(null);
    run(0.3);
  })()`);
  await png('opening');
  const flow = await evaluate(`(() => {${HELPERS}
    key('KeyW'); run(3.5); key('KeyW', 'keyup');
    const blocked = w.x < 9;
    run(0.3);
    const atMouth = { prompt: walk.hud.prompt.textContent, eye: c.position.y };
    key('KeyC'); run(0.8);
    return { atMouth, blocked, down: { want: w.wantDown, eye: c.position.y } };
  })()`);
  await png('mouth');
  const inside = await evaluate(`(() => {${HELPERS}
    key('KeyW'); run(4.2); key('KeyW', 'keyup');
    return { x: w.x, down: w.down, eye: c.position.y };
  })()`);
  await png('tunnel');
  await evaluate(`(async () => {${HELPERS}
    const m = v.explorer.scary.monster;
    [w.x, w.z, w.yaw] = [10.5, 7.5, Math.PI / 2]; w.applyToCamera(c);
    await m.load();
    m.update(0, { x: 8.5, y: 0, z: 7.5, state: 'hunt', visible: true, fast: false }, { x: w.x, z: w.z }, 1);
  })()`);
  await png('figure');
  const after = await evaluate(`(() => {${HELPERS}
    v.explorer.scary.monster.group.visible = false;
    [w.x, w.z, w.yaw] = [12.5, 9.5, 0]; run(0.1);
    key('KeyC'); run(0.5);
    const stuck = { want: w.wantDown, down: w.down }; // C inne i gangen: fortsatt nede
    [w.x, w.z] = [18.5, 7.5]; run(0.8);
    const gl = v.renderer.getContext();
    return { stuck, up: w.down, eye: c.position.y, lost: gl.isContextLost(), linked: v.renderer.info.programs.every((p) => p.diagnostics?.runnable !== false) };
  })()`);
  assert.equal(shared, TILE.CRAWL, 'kept in the share link');
  assert.equal(flow.atMouth.prompt, 'C – crawl', 'the hint at the opening');
  assert.equal(flow.blocked, true, 'stopped at the opening upright');
  assert.ok(flow.atMouth.eye > 1.5 && flow.down.eye < 0.75, `the eye comes down: ${flow.atMouth.eye} → ${flow.down.eye}`);
  assert.equal(flow.down.want, true);
  assert.ok(inside.x > 11.5, `crawled through the opening with real walking: ${inside.x}`);
  assert.equal(inside.down, true);
  assert.deepEqual(after.stuck, { want: false, down: true }, 'no standing up under the low ceiling');
  assert.equal(after.up, false);
  assert.ok(after.eye > 1.5, 'up again in the room');
  assert.equal(after.lost, false);
  assert.equal(after.linked, true);
  assert.deepEqual(browser.errors, []);
  console.log('PASS crawlways: share link, hints, the opening, crawling, standing up, shaders and GPU pixels');
}
