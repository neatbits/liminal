import assert from 'node:assert/strict';
import { waitFor } from './browser-driver.mjs';

// Game mode (forsiden → app/#play): stemningsvalg først, så rett inn på Level 1 med kassettjakt og
// låste dører. Rommet i editoren er hjem etterpå. På telefonen: knappen under stemningsvalget.
export async function checkGameMode(browser, origin) {
  const { call, evaluate } = browser;
  const open = async (hash, ready) => {
    await call('Page.navigate', { url: 'about:blank' });
    await waitFor(() => evaluate('location.href === "about:blank"').catch(() => false), 'blank');
    await call('Page.navigate', { url: `${origin}/app/${hash}` });
    await waitFor(() => evaluate(ready).catch(() => false), `app ${hash}`);
  };
  const inGame = () => waitFor(() => evaluate('liminal.viewer.mode === "walk" && liminal.viewer.explorer.depth === 1 && !liminal.viewer.explorer.busy').catch(() => false), 'Level 1');

  await call('Page.navigate', { url: `${origin}/` });
  await waitFor(() => evaluate('document.readyState === "complete"').catch(() => false), 'landing');
  assert.equal(await evaluate(`document.querySelector('.l-hero a[href="app/#play"]')?.textContent.includes('Game mode')`), true, 'landing has a Game mode button');

  await open('#play', 'Boolean(window.liminal?.viewer.world) && Boolean(document.querySelector(\'.modal[aria-label="Game mode"]\'))');
  const dialog = await evaluate(`(() => {
    const m = document.querySelector('.modal[aria-label="Game mode"]');
    return { hash: location.hash, moods: [...m.querySelectorAll('.card-title')].map((t) => t.textContent),
      newRoom: Boolean(document.querySelector('.modal[aria-label="New room"]')), home: liminal.level.name };
  })()`);
  assert.equal(dialog.hash, '');
  assert.deepEqual(dialog.moods, ['Normal', 'Abandoned', 'Liminal', 'Uncanny', 'Nightmare']);
  assert.equal(dialog.newRoom, false, 'no New room dialog in front');
  await evaluate(`(() => {
    const m = document.querySelector('.modal[aria-label="Game mode"]');
    [...m.querySelectorAll('.card')].find((c) => c.textContent.startsWith('Nightmare')).click();
    m.querySelector('.btn-accent').click();
  })()`);
  await inGame();
  const desktop = await evaluate(`(() => {
    const v = liminal.viewer, ex = v.explorer;
    const out = { mood: v.settings.mood, locked: ex.hunt.locked, tapes: ex.total > 0, home: ex.home?.name, modal: Boolean(document.querySelector('.modal')),
      title: document.querySelector('.hud-title')?.textContent ?? '' };
    v.exitWalk(false);
    out.back = v.level === liminal.level && liminal.level.name;
    v.setMood('normal'); // lagres (updateSettings gjør ikke det), så neste sjekk ikke arver stemningen
    return out;
  })()`);
  assert.deepEqual(desktop, { mood: 'nightmare', locked: true, tapes: true, home: dialog.home, modal: false, title: desktop.title, back: dialog.home });
  assert.match(desktop.title, /^LEVEL 1/);

  // Telefonen: knappen under stemningsvalget får fokus når man kommer fra forsiden.
  await call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  try {
    await open('#play', 'Boolean(window.liminal?.mobile && document.querySelector(".mobile-game"))');
    assert.equal(await evaluate(`document.activeElement?.classList.contains('mobile-game')`), true);
    await evaluate(`(() => {
      const s = document.querySelector('.mobile-mood select');
      s.value = 'uncanny';
      s.dispatchEvent(new Event('change'));
      document.querySelector('.mobile-game').click();
    })()`);
    await inGame();
    const phone = await evaluate(`(() => {
      const v = liminal.viewer, out = { mood: v.settings.mood, locked: v.explorer.hunt.locked };
      v.exitWalk(false);
      out.home = !document.querySelector('.mobile-home').hidden;
      v.setMood('normal'); // lagres (updateSettings gjør ikke det), så neste sjekk ikke arver stemningen
      return out;
    })()`);
    assert.deepEqual(phone, { mood: 'uncanny', locked: true, home: true });
  } finally {
    await call('Emulation.setTouchEmulationEnabled', { enabled: false });
    await call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  }
  assert.deepEqual(browser.errors, []);
  console.log('PASS game mode: landing button, mood choice, straight into Level 1 (desktop and phone), home room kept');
}
