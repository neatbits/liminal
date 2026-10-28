// Startpunkt i en annen etasje: Spawn-verktøyet i etasje 2 gjør etasje 2 til startetasjen, gåingen
// starter der, delingslenken tar det med, og etasje 1 viser startpunktet svakt med etasjenummeret.
// Skjermbilde: node_modules/.cache/spawn-storey.png.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createLevel, TILE } from '../src/core/level.js';
import { encodeLevel } from '../src/core/serialize.js';
import { autoLights } from '../src/core/ops.js';
import { fillRect } from '../src/gen/util.js';
import { insertStorey, emptyStorey } from '../src/core/storeys.js';
import { waitFor } from './browser-driver.mjs';

function building() {
  const level = createLevel({ name: 'Spawn floors', theme: 'office', w: 16, h: 12, height: 2.8 });
  fillRect(level, 1, 1, 14, 10, TILE.FLOOR);
  autoLights(level, { spacing: 3, state: 1 });
  const up = emptyStorey(level);
  fillRect(up, 6, 2, 12, 9, TILE.FLOOR);
  insertStorey(level, 1, up);
  return level;
}

export async function checkSpawnStorey(browser, origin) {
  const { call, evaluate } = browser;
  const ready = () => waitFor(() => evaluate(`window.liminal?.level.name === 'Spawn floors' && Boolean(liminal.viewer.world)`).catch(() => false), 'spawn room');
  await call('Page.navigate', { url: 'about:blank' });
  await call('Page.navigate', { url: `${origin}/app/#room=${await encodeLevel(building())}` });
  await ready();
  await evaluate(`liminal.layout.set('split')`);
  await evaluate(`liminal.editor.setStorey(1)`);
  await evaluate(`liminal.setTool('spawn')`);
  const p = await evaluate(`(() => { const e = liminal.editor, r = e.canvas.getBoundingClientRect(); const q = e.view.toScreen(9.5, 5.5); return { x: q[0] + r.left, y: q[1] + r.top }; })()`);
  await call('Input.dispatchMouseEvent', { type: 'mouseMoved', ...p });
  await call('Input.dispatchMouseEvent', { type: 'mousePressed', ...p, button: 'left', buttons: 1, clickCount: 1 });
  await call('Input.dispatchMouseEvent', { type: 'mouseReleased', ...p, button: 'left', buttons: 0, clickCount: 1 });
  assert.deepEqual(await evaluate(`[liminal.level.spawnStorey, liminal.level.storeys[0].spawn.x, liminal.level.storeys[0].spawn.z]`), [1, 9.5, 5.5]);
  await evaluate(`liminal.walk()`);
  assert.deepEqual(await evaluate(`[liminal.viewer.storeys.current, liminal.viewer.walk.walker.x, liminal.viewer.walk.walker.z]`), [1, 9.5, 5.5]);
  await evaluate('liminal.viewer.exitWalk(false)');
  await evaluate(`liminal.editor.setStorey(0)`);
  await evaluate(`liminal.layout.set('2d')`);
  await evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
  writeFileSync('node_modules/.cache/spawn-storey.png', Buffer.from((await call('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  const shared = await evaluate(`(() => { [...document.querySelectorAll('.menu-list button')].find(b => b.textContent.includes('Share link')).click();
    return new Promise(r => setTimeout(() => r(document.querySelector('.share-link')?.value), 300)); })()`);
  await evaluate(`liminal.layout.set('split')`);
  await call('Page.navigate', { url: 'about:blank' });
  await call('Page.navigate', { url: shared });
  await ready();
  assert.deepEqual(await evaluate(`[liminal.level.spawnStorey, liminal.level.storeys[0].spawn.x]`), [1, 9.5]);
  console.log('PASS spawn point on floor 2: walking starts there, shared, shown faintly on floor 1');
}
