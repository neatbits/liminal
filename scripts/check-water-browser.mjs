// Bølgeslideren gjennom den faktiske dialogen, lagring og 3D-materialet i produksjonsbygget.
import assert from 'node:assert/strict';
import { waitFor } from './browser-driver.mjs';

export async function checkWater(browser, origin) {
  const { call, evaluate } = browser;
  const open = async () => {
    await call('Page.navigate', { url: 'about:blank' });
    await call('Page.navigate', { url: `${origin}/app/#example=pools` });
    await waitFor(() => evaluate(`window.liminal?.level.name === 'The Poolrooms' && Boolean(liminal.viewer.world.water)`).catch(() => false), 'pool water');
  };
  const settings = () => evaluate(`document.querySelectorAll('.menu-list button').forEach(b => { if (b.textContent.startsWith('Settings')) b.click(); })`);
  const state = () => evaluate(`({setting:liminal.settings.waterWaves,shader:liminal.viewer.world.water.mesh.material.uniforms.uWaveStrength.value})`);
  await open();
  const id = await evaluate('liminal.viewer.world.water.mesh.uuid');
  await settings();
  await evaluate(`document.querySelector('input[aria-label="Water waves"]').focus()`);
  for (const [key, expected] of [['Home', 0], ['End', 2]]) {
    for (const type of ['keyDown', 'keyUp']) await call('Input.dispatchKeyEvent', { type, key, code: key });
    assert.deepEqual(await state(), { setting: expected, shader: expected });
  }
  await evaluate(`(() => {
    const input = document.querySelector('input[aria-label="Water waves"]');
    input.value = '1.5'; input.dispatchEvent(new Event('input', {bubbles:true}));
  })()`);
  assert.deepEqual(await state(), { setting: 1.5, shader: 1.5 });
  assert.equal(await evaluate(`document.querySelector('input[aria-label="Water waves"]').getAttribute('aria-valuetext')`), '150 %');
  assert.equal(await evaluate('liminal.viewer.world.water.mesh.uuid'), id, 'slider updates existing water');
  await evaluate(`document.querySelector('.modal .btn-accent').click()`);
  await open();
  assert.deepEqual(await state(), { setting: 1.5, shader: 1.5 }, 'wave strength survives reloading');
  await settings();
  await evaluate(`(() => {
    const row = [...document.querySelectorAll('.settings .row')].find(row => row.querySelector('label')?.textContent === 'Water');
    const select = row.querySelector('select');
    select.value = 'detailed'; select.dispatchEvent(new Event('change', {bubbles:true}));
  })()`);
  assert.equal(await evaluate(`'USE_DETAIL' in liminal.viewer.world.water.mesh.material.defines`), true);
  assert.deepEqual(await state(), { setting: 1.5, shader: 1.5 }, 'quality choice preserves wave strength');
  // La neste sjekk fortsatt bruke den raske grafikkprofilen.
  await evaluate(`liminal.viewer.updateSettings({waterReflections:false,waterDetail:false})`);
  await evaluate(`document.querySelector('.modal .btn-accent').click()`);
  console.log('PASS water waves: keyboard, live update, persistence and quality switching');
}
