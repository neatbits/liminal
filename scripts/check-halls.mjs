import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { waitFor } from './browser-driver.mjs';
import { babbdiLevel } from '../src/gen/babbdi.js';
import { mulberry32 } from '../src/core/rng.js';
import { encodeLevel } from '../src/core/serialize.js';

// Betongsalene (et sjeldent nivå i den uendelige utforskingen, gen/babbdi.js): bygges med byutsikt
// i vinduene, massive brystninger og uten shaderfeil. Åpnes som delt rom (det skjulte temaet leses).
export async function checkHalls(browser, origin) {
  const level = babbdiLevel(mulberry32(3), 'Concrete halls check');
  await browser.call('Page.navigate', { url: 'about:blank' });
  await browser.call('Page.navigate', { url: `${origin}/app/#room=${await encodeLevel(level)}` });
  await waitFor(() => browser.evaluate('window.liminal?.level.name === "Concrete halls check" && Boolean(liminal.viewer.world)').catch(() => false), 'concrete halls');
  const result = await browser.evaluate(`(async () => {
    const v = liminal.viewer, lv = liminal.level;
    v.renderer.setAnimationLoop(null); liminal.layout.set('3d');
    await v.world.objects.ready;
    v.mode = 'walk'; v.overview.enabled = false; v._applyLook();
    v.camera.position.set(28, 5.8, lv.h / 2); v.camera.lookAt(50, 2, lv.h / 2 + 3);
    v.world.update(0, [1, 1, 1, 1]); v.postfx.render(0);
    const glass = v.world.group.getObjectsByProperty('name', 'windowGlass').map((m) => m.material);
    return {
      theme: lv.theme,
      png: v.renderer.domElement.toDataURL('image/png').split(',')[1],
      city: glass.some((m) => m.userData.windowView === 'babbdi'),
      parapets: v.world.group.getObjectsByProperty('name', 'rail').reduce((n, m) => n + (m.geometry?.attributes.position.count ?? 0), 0),
      linked: v.renderer.info.programs.every((p) => p.diagnostics?.runnable !== false),
      lost: v.renderer.getContext().isContextLost(),
    };
  })()`);
  assert.equal(result.theme, 'babbdi', 'a shared room keeps the hidden theme');
  assert.equal(result.linked, true);
  assert.equal(result.lost, false);
  assert.equal(result.city, true, 'the windows show the concrete city');
  assert.ok(result.parapets > 100, `solid parapets along the galleries (${result.parapets})`);
  writeFileSync('node_modules/.cache/concrete-halls.png', Buffer.from(result.png, 'base64'));
  assert.deepEqual(browser.errors, []);
  console.log('PASS concrete halls: hidden theme, city view, parapets, shaders and screenshot');
}
