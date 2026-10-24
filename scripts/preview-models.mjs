import { createServer } from 'vite';
import { writeFileSync } from 'node:fs';
import { launchBrowser, waitFor } from './browser-driver.mjs';
import { MALL_OBJECTS } from '../src/core/object-catalog-mall.js';
import { ELECTRONIC_OBJECTS } from '../src/core/object-catalog-electronics.js';
const mall = process.argv.includes('--mall');
const electronics = process.argv.includes('--electronics');
const definitions = electronics ? ELECTRONIC_OBJECTS : mall ? MALL_OBJECTS : null;
const server = await createServer({ server: { host: '127.0.0.1', port: 0, open: false } });
await server.listen();
let browser;
try {
  browser = await launchBrowser({ hardware: true });
  await browser.call('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1050, deviceScaleFactor: 1, mobile: false });
  await browser.call('Page.navigate', { url: `http://127.0.0.1:${server.httpServer.address().port}/about/` });
  await waitFor(() => browser.evaluate(`Boolean(document.querySelector('#model-credits li')) && document.readyState === 'complete'`).catch(() => false), 'credits page ready');
  console.log(await browser.evaluate(`(async () => { const {previewModels} = await import('/scripts/model-preview.js'); return await previewModels(${definitions ? JSON.stringify(definitions) : ''}); })()`));
  const { data } = await browser.call('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`node_modules/.cache/${electronics ? 'electronics-models' : mall ? 'mall-models' : 'models'}.png`, Buffer.from(data, 'base64'));
  console.log(browser.errors);
} finally {
  await browser?.close();
  await server.close();
}
