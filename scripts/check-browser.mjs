// Tester det ferdige bygget i en isolert, hodeløs Chrome/Edge-profil.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { preview } from 'vite';
import { createLevel, TILE } from '../src/core/level.js';
import { levelToJSON } from '../src/core/serialize.js';
import { launchBrowser, waitFor } from './browser-driver.mjs';
import { checkFeedback } from './check-feedback-browser.mjs';
import { checkWater } from './check-water-browser.mjs';
import { checkGraphics } from './check-graphics-browser.mjs';
import { checkUnavailable } from './check-unavailable-browser.mjs';
import { checkEscalatorEditor } from './check-escalator-editor.mjs';
import { checkImportedModels } from './check-imported-models.mjs';
import { checkMall } from './check-mall-browser.mjs';
import { checkArcades } from './check-arcades.mjs';
import { checkSoftBlocks } from './check-soft-browser.mjs';
import { checkInteriorPolish } from './check-interior-polish.mjs';
import { checkGhost } from './check-ghost.mjs';
import { checkTapeHunt } from './check-tape-hunt.mjs';
import { checkHalls } from './check-halls.mjs';
import { checkNightmare } from './check-nightmare.mjs';
import { checkMobilePlayer } from './check-mobile-player.mjs';
import { checkMallSelection } from './check-mall-selection.mjs';
import { checkPoolPillars } from './check-pool-pillars.mjs';
import { checkPCDisplays } from './check-pc-displays.mjs';
import { checkHalfWalls } from './check-half-walls.mjs';
import { checkManualFinishes } from './check-manual-finishes.mjs';

execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], { stdio: 'inherit' });
const server = await preview({ preview: { host: '127.0.0.1', port: 0, open: false } });
let browser;
try {
  console.log('Starting headless browser…');
  browser = await launchBrowser({ hardware: process.argv.includes('--hardware') });
  const { call, evaluate } = browser;
  const consoleErrors = [];
  browser.on('Runtime.consoleAPICalled', (e) => {
    if (e.type === 'error') consoleErrors.push(e.args.map(a => a.value ?? a.description).join(' '));
  });
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const ready = () => waitFor(() => evaluate('Boolean(window.liminal?.level && window.liminal?.viewer.world)').catch(() => false), 'app ready');
  const key = async (keyName, code, modifiers = 0) => {
    for (const type of ['keyDown', 'keyUp']) await call('Input.dispatchKeyEvent', { type, key: keyName, code, modifiers });
  };
  const openMenuItem = (name) => evaluate(`(() => {
    const button = [...document.querySelectorAll('.menu-list button')].find(b => b.textContent.includes(${JSON.stringify(name)}));
    if (!button) throw new Error('Menu item missing');
    button.click();
  })()`);
  await call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `if (location.protocol === 'http:' && !localStorage.getItem('liminal.settings.v1')) localStorage.setItem('liminal.settings.v1', JSON.stringify({sound:false,music:false,mood:'normal',effects:'reduced',renderScale:0.5,waterReflections:false,fpsCap:30}));` });
  console.log('Opening app…');
  await call('Page.navigate', { url: `${origin}/app/` });
  await ready();
  assert.equal(await evaluate(`document.querySelector('.modal-head h2')?.textContent`), 'New room');
  await evaluate(`(() => {
    const selects = document.querySelectorAll('.modal-body select');
    selects[1].value = '16'; selects[2].value = '16';
    document.querySelector('.modal .btn-accent').click();
  })()`);
  await waitFor(() => evaluate(`!document.querySelector('.modal') && liminal.level.name === 'New room' && liminal.level.w === 16`), 'new room on startup');
  console.log('PASS startup New room dialog and creation');
  console.log('Importing high-zone fixture…');

  const level = createLevel({ name: 'Browser regression', w: 8, h: 8, height: 20 });
  for (let z = 1; z < 7; z++) for (let x = 1; x < 7; x++) level.tiles[z * 8 + x] = TILE.FLOOR;
  level.ceilings[9] = 200;
  level.floors[10] = 100;
  level.decks[11] = 100;
  const fixture = join(browser.profile, 'high-room.liminal.json');
  writeFileSync(fixture, JSON.stringify(levelToJSON(level)));
  await call('Page.setInterceptFileChooserDialog', { enabled: true });
  await openMenuItem('Import file');
  const { root } = await call('DOM.getDocument');
  const { nodeId } = await call('DOM.querySelector', { nodeId: root.nodeId, selector: '#file-input' });
  await call('DOM.setFileInputFiles', { nodeId, files: [fixture] });
  await waitFor(() => evaluate(`window.liminal.level.name === 'Browser regression'`), 'import');
  assert.deepEqual(await evaluate('[liminal.level.ceilings[9],liminal.level.floors[10],liminal.level.decks[11]]'), [200, 100, 100]);
  await key('s', 'KeyS', 2);
  assert.equal(await evaluate('Boolean(liminal.level.id) && !liminal.dirty'), true);
  // Siste endring rekker ikke 600 ms-timeren; pagehide skal likevel bevare den.
  await evaluate(`liminal.rename('Last edit before reload')`);
  await call('Page.reload');
  await ready();
  assert.equal(await evaluate('liminal.level.name'), 'Last edit before reload');
  assert.equal(await evaluate(`document.querySelector('.modal-head h2')?.textContent`), 'New room');
  await evaluate(`document.querySelector('.modal-foot .btn:not(.btn-accent)').click()`);
  assert.equal(await evaluate('liminal.level.name'), 'Last edit before reload');
  assert.deepEqual(await evaluate('[liminal.level.ceilings[9],liminal.level.floors[10],liminal.level.decks[11]]'), [200, 100, 100]);
  console.log('PASS import, save and immediate reload with high zones');

  await openMenuItem('Share link');
  await waitFor(() => evaluate(`Boolean(document.querySelector('.share-link'))`), 'share dialog');
  const shared = await evaluate(`document.querySelector('.share-link').value`);
  await call('Page.navigate', { url: 'about:blank' });
  await call('Page.navigate', { url: shared });
  await ready();
  assert.equal(await evaluate(`Boolean(document.querySelector('.modal'))`), false, 'shared links skip startup dialog');
  assert.deepEqual(await evaluate('[liminal.level.ceilings[9],liminal.level.floors[10],liminal.level.decks[11]]'), [200, 100, 100]);
  console.log('PASS shared room round-trip');

  await evaluate(`document.querySelector('#btn-fit').focus()`);
  await openMenuItem('Settings');
  assert.equal(await evaluate(`document.querySelector('.modal').contains(document.activeElement)`), true);
  await evaluate(`document.querySelector('.modal .btn-accent').focus()`);
  await key('Tab', 'Tab');
  assert.equal(await evaluate(`document.activeElement.classList.contains('modal-close')`), true);
  await key('Tab', 'Tab', 8);
  assert.equal(await evaluate(`document.activeElement.classList.contains('btn-accent')`), true);
  await evaluate(`document.querySelector('#btn-fit').focus()`);
  assert.equal(await evaluate(`document.querySelector('.modal').contains(document.activeElement)`), true);
  await key('Escape', 'Escape');
  assert.equal(await evaluate(`!document.querySelector('.modal') && document.activeElement.id === 'btn-fit'`), true);
  console.log('PASS modal focus trap and focus restoration');

  await evaluate(`liminal.viewer.walkFullscreen()`);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.hud-walkbar')).display`), 'none', 'desktop walking hides toolbar');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('#view-settings')).display`), 'none', 'editor controls stay hidden while walking');
  await evaluate(`window.dispatchEvent(new Event('blur'))`);
  assert.notEqual(await evaluate(`getComputedStyle(document.querySelector('.hud-walkbar')).display`), 'none', 'pause shows usable controls');
  const position = await evaluate(`({x:liminal.viewer.walk.walker.x,z:liminal.viewer.walk.walker.z,time:liminal.viewer.time})`);
  await key('w', 'KeyW');
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(await evaluate('liminal.viewer.walk.paused && !liminal.viewer.walk.input.enabled'), true);
  assert.deepEqual(await evaluate(`({x:liminal.viewer.walk.walker.x,z:liminal.viewer.walk.walker.z,time:liminal.viewer.time})`), position);
  await evaluate(`document.querySelector('[data-act="resume"]').click()`);
  assert.equal(await evaluate('!liminal.viewer.walk.paused && liminal.viewer.walk.input.enabled'), true);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.hud-walkbar')).display`), 'none', 'resuming hides desktop toolbar again');
  await evaluate('liminal.viewer.exitWalk()');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.hud-walkbar')).display`), 'none');
  assert.notEqual(await evaluate(`getComputedStyle(document.querySelector('#view-settings')).display`), 'none', 'editor controls return on exit');
  console.log('PASS pause and resume in the running renderer');
  await checkFeedback(browser, 'simulator');

  await call('Page.navigate', { url: 'about:blank' });
  await call('Page.navigate', { url: `${origin}/app/#example=corridor` });
  await ready();
  assert.equal(await evaluate('liminal.level.name'), 'The Endless Corridor');
  assert.equal(await evaluate(`Boolean(document.querySelector('.modal'))`), false, 'examples skip startup dialog');
  console.log('PASS example links skip startup dialog');
  await checkWater(browser, origin);
  await checkGraphics(browser, origin, { hardware: process.argv.includes('--hardware') });
  await checkEscalatorEditor(browser, origin);
  await checkImportedModels(browser, origin);
  await checkPCDisplays(browser, origin);
  await checkMall(browser, origin);
  await checkArcades(browser, origin);
  await checkSoftBlocks(browser, origin);
  await checkInteriorPolish(browser, origin);
  await checkGhost(browser, origin);
  await checkTapeHunt(browser, origin);
  await checkHalls(browser, origin);
  await checkNightmare(browser, origin);
  await checkPoolPillars(browser, origin);
  await checkHalfWalls(browser, origin);
  await checkManualFinishes(browser, origin);
  await checkMallSelection(browser, origin);

  for (const [path, page] of [['/', 'home'], ['/about/', 'about']]) {
    await call('Page.navigate', { url: origin + path });
    await waitFor(() => evaluate(`Boolean(document.querySelector('[data-feedback]')) && document.readyState === 'complete'`).catch(() => false), `${page} ready`);
    assert.equal(await evaluate(`Boolean(document.querySelector('a[href="mailto:hello@liminalsimulator.com"]'))`), true);
    await checkFeedback(browser, page);
    if (page === 'home') {
      await evaluate(`document.querySelector('a[href="about/#changelog"]').click()`);
      await waitFor(() => evaluate(`location.hash === '#changelog' && Boolean(document.querySelector('#changelog time'))`).catch(() => false), 'public changelog link');
      assert.equal(await evaluate(`document.querySelector('#changelog time').dateTime`), '2026-10-24');
      assert.equal(await evaluate(`document.querySelectorAll('#changelog .l-release time').length`), 4);
      console.log('PASS public changelog navigation and release status');
    }
  }

  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate(`document.querySelector('[data-feedback]').click()`);
  assert.equal(await evaluate(`(() => {
    const rect = document.querySelector('.modal').getBoundingClientRect();
    return rect.left >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight && document.documentElement.scrollWidth <= innerWidth;
  })()`), true, 'mobile dialog and header fit without horizontal scrolling');
  const { data: screenshot } = await call('Page.captureScreenshot', { format: 'png' });
  writeFileSync('node_modules/.cache/feedback-mobile.png', Buffer.from(screenshot, 'base64'));
  console.log('PASS mobile feedback layout');

  await checkMobilePlayer(browser, origin);

  assert.deepEqual(browser.errors, [], 'Uncaught browser errors');
  assert.deepEqual(consoleErrors, [], 'Browser/shader console errors');
  await checkUnavailable(browser, origin);
  console.log('Browser checks passed.');
} catch (e) {
  console.error('Browser check failed:', e);
  if (browser?.log) console.error(browser.log.slice(-2500));
  if (browser?.errors.length) console.error('Page errors:', browser.errors);
  process.exitCode = 1;
} finally {
  await browser?.close();
  await new Promise((resolve, reject) => server.httpServer.close((e) => e ? reject(e) : resolve()));
}
