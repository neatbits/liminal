// Kapsler og bibliotekbilder til Steam av dine egne skjermbilder fra fotomodusen (P i programmet,
// lagres i Pictures/Liminal Simulator): npm run steam:capsules -- <bredt bilde> [høyt bilde].
// Det brede brukes til de brede kapslene og bibliotekshelten (3840 × 1240 – ta det i så høy
// oppløsning som mulig), det høye (valgfritt) til de høye. Alt havner i release/steam/.
// Bildene sendes til Chrome via en lokal server: CDP-meldinger på flere MB kutter forbindelsen.
import { mkdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve } from 'node:path';
import { preview } from 'vite';
import { launchBrowser } from './browser-driver.mjs';
import { capsules } from './steam-capsules.mjs';

const OUT = 'release/steam';
const [wide, tall = wide] = process.argv.slice(2).map((f) => resolve(f));
if (!process.argv[2]) {
  console.error('Bruk: npm run steam:capsules -- <bredt bilde> [høyt bilde]');
  process.exit(1);
}

// Bare de to bildene, som /wide og /tall – ingenting annet fra disken.
const files = { '/wide': wide, '/tall': tall };
const images = createServer((req, res) => {
  const file = files[req.url];
  if (!file) return res.writeHead(404).end();
  const type = /\.jpe?g$/i.test(extname(file)) ? 'image/jpeg' : 'image/png';
  res.writeHead(200, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*' }).end(readFileSync(file));
});
await new Promise((r) => images.listen(0, '127.0.0.1', r));
const imageBase = `http://127.0.0.1:${images.address().port}`;

const server = await preview({ preview: { host: '127.0.0.1', port: 0, open: false } });
const origin = server.resolvedUrls.local[0].replace(/\/$/, '');
const browser = await launchBrowser();
mkdirSync(OUT, { recursive: true });
try {
  await capsules(browser, origin, { wide: `${imageBase}/wide`, tall: `${imageBase}/tall` }, OUT);
  console.log(`Ferdig: ${OUT}/`);
} catch (e) {
  console.error('Feil:', e.message);
  process.exitCode = 1;
} finally {
  await browser.close?.().catch(() => {}); // Chrome kan holde profilmappen et øyeblikk
  await server.close();
  images.close();
}
