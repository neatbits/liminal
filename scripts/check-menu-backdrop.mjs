import assert from 'node:assert/strict';
import { waitFor } from './browser-driver.mjs';

const scene = (evaluate, what) => waitFor(() => evaluate('(liminal.menuBackdrop.scene?.frames ?? 0) > 0').catch(() => false), what, 60000);

// 3D-bakgrunnen i hovedmenyen: tegner rommet, hviler editorens visning, undermenyene og tastaturet.
// Kalles med hovedmenyen åpen, og lar den stå åpen med Play valgt.
export async function checkBackdrop({ evaluate }) {
  await scene(evaluate, 'menu scene');
  const shown = await evaluate(`(() => {
    const s = liminal.menuBackdrop.scene;
    s.draw();
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(s.renderer.domElement, 0, 0, 32, 32);
    const px = g.getImageData(0, 0, 32, 32).data;
    let sum = 0;
    for (let i = 0; i < px.length; i += 4) sum += px[i] + px[i + 1] + px[i + 2];
    const box = document.querySelector('.menu-canvas').getBoundingClientRect();
    return { lit: sum / (px.length / 4) / 3 > 20, full: box.width === innerWidth && box.height === innerHeight,
      cls: document.body.classList.contains('menu-3d'), resting: liminal.viewer.resting };
  })()`);
  assert.deepEqual(shown, { lit: true, full: true, cls: true, resting: true });
  const keys = await evaluate(`(() => {
    const key = (name) => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));
    const now = () => document.activeElement.textContent;
    const labels = () => [...document.querySelectorAll('.start-label')].map((l) => l.textContent);
    key('ArrowDown');
    const down = now();
    key('ArrowUp'); key('ArrowUp');
    const wrap = now();
    key('ArrowDown');
    document.activeElement.click();
    const play = labels();
    const first = [now(), document.querySelector('.start-hint').textContent];
    key('Escape');
    const back = now();
    document.activeElement.nextElementSibling.click();
    const create = labels();
    key('ArrowLeft');
    const left = now();
    document.activeElement.previousElementSibling.focus();
    return { down, wrap, play, first, back, create, left };
  })()`);
  assert.deepEqual(keys, {
    down: 'Create', wrap: 'Quit', play: ['Tape hunt', 'Noclip', 'The Descent', 'Spot the wrong', 'Lights out', 'Daily level', '← Back'],
    first: ['Tape hunt', 'Endless levels – find every tape to open the door'], back: 'Play',
    create: ['Continue', 'New room …', 'Examples …', 'My rooms …', '← Back'], left: 'Create',
  });
  // Lukket: alt slippes, og editorens visning tegner igjen.
  await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
  await waitFor(() => evaluate('!document.querySelector(".menu-canvas") && !liminal.viewer.resting && !document.body.classList.contains("menu-3d")'), 'scene released');
  // Tapt grafikkontekst: den gule bakgrunnen tar over, og menyen virker fortsatt.
  await evaluate(`document.querySelector('header .brand').click()`);
  await scene(evaluate, 'menu scene again');
  await evaluate(`liminal.menuBackdrop.scene.renderer.getContext().getExtension('WEBGL_lose_context').loseContext()`);
  await waitFor(() => evaluate('!document.querySelector(".menu-canvas") && !document.body.classList.contains("menu-3d")'), 'yellow menu after a lost context');
  assert.equal(await evaluate(`document.querySelector('.start-item').textContent`), 'Play');
  await evaluate(`document.querySelector('.start-item').focus()`);
}
