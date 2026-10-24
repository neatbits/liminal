// Offline Web Audio i Chrome, inkludert motorens faktiske rutevalg, miks og romklang.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createServer } from 'vite';
import { launchBrowser, waitFor } from './browser-driver.mjs';

const server = await createServer({ server: { host: '127.0.0.1', port: 0, open: false } });
await server.listen();
let browser;
try {
  browser = await launchBrowser();
  const { call, evaluate } = browser;
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `if (location.protocol === 'http:') localStorage.setItem('liminal.settings.v1', JSON.stringify({sound:false,music:false}));` });
  await call('Page.navigate', { url: `http://127.0.0.1:${server.httpServer.address().port}/app/#example=office` });
  await waitFor(() => evaluate('Boolean(window.liminal?.viewer.world)').catch(() => false), 'viewer');
  await evaluate('liminal.viewer.renderer.setAnimationLoop(null)');
  const results = {};
  for (const surface of ['carpet', 'foam', 'tile', 'water', 'rubber', 'plastic']) {
    const { wav, ...stats } = await evaluate(`(async () => {
      const {renderContact} = await import('/scripts/audio-probe.js');
      return renderContact(${JSON.stringify(surface)});
    })()`);
    results[surface] = stats;
    writeFileSync(`node_modules/.cache/audio-${surface}.wav`, Buffer.from(wav, 'base64'));
    const impact=['rubber','plastic'].includes(surface);
    assert.ok(stats.peak > (impact ? .005 : .001) && stats.peak < (impact ? .3 : .008), `${surface}: restrained playback without clipping`);
  }
  for (const surface of ['carpet', 'foam']) {
    assert.ok(results[surface].peak < results.tile.peak * 0.8, `${surface}: lower transient peak than tile in the complete mix`);
    assert.ok(results[surface].early < 0.12, `${surface}: rounded attack`);
    assert.ok(results[surface].tail < results.tile.tail, `${surface}: reduced reverb tail`);
  }
  assert.ok(results.rubber.rms < results.plastic.rms * 0.6, 'rubber is subdued compared with the old hard impact');
  assert.ok(results.water.peak < 0.055 && results.water.early < 0.12, 'wading has a gentle onset and restrained level');
  for (const state of [{ muted: true }, { paused: true }]) {
    for (const surface of ['foam', 'rubber', 'water']) {
      const result = await evaluate(`(async () => {
        const {renderContact} = await import('/scripts/audio-probe.js');
        const {wav, ...stats} = await renderContact(${JSON.stringify(surface)}, ${JSON.stringify(state)});
        return stats;
      })()`);
      assert.equal(result.peak, 0, `${surface}: silence while ${JSON.stringify(state)}`);
    }
  }
  assert.deepEqual(browser.errors, []);
  console.log('PASS Web Audio: soft footsteps, rubber impact, reverb, mute/pause and WAV previews', results);
} finally {
  await browser?.close();
  await server.close();
}
