import assert from 'node:assert/strict';
import { waitFor } from './browser-driver.mjs';

// Startmenyen i programmet (Electron): window.liminalDesktop (desktop/preload.cjs) settes inn før
// siden lastes, som i programmet. Uten den er oppstarten som før (New room).
export async function checkStartMenu(browser, origin) {
  const { call, evaluate } = browser;
  const open = async (path, ready) => {
    await call('Page.navigate', { url: 'about:blank' });
    await waitFor(() => evaluate('location.href === "about:blank"').catch(() => false), 'blank');
    await call('Page.navigate', { url: `${origin}${path}` });
    await waitFor(() => evaluate(ready).catch(() => false), path);
  };
  const { identifier } = await call('Page.addScriptToEvaluateOnNewDocument', {
    source: "window.liminalDesktop = { platform: 'test', quit() { window.__quit = (window.__quit ?? 0) + 1; } };",
  });
  try {
    await open('/app/', 'Boolean(window.liminal?.level) && Boolean(document.querySelector(".start-screen"))');
    const menu = await evaluate(`(() => ({
      items: [...document.querySelectorAll('.start-item .start-label')].map((e) => e.textContent),
      focus: document.activeElement?.textContent ?? '',
      newRoom: Boolean(document.querySelector('.modal[aria-label="New room"]')),
      fileMenu: [...document.querySelectorAll('.menu-list')].map((l) => l.textContent).join('|'),
    }))()`);
    assert.deepEqual(menu.items, ['📼 Game mode', 'Continue', 'New room …', 'Examples …', 'My rooms …', 'Settings …', 'About & credits', 'Quit']);
    assert.match(menu.focus, /Game mode/, 'Game mode has focus');
    assert.equal(menu.newRoom, false);
    assert.match(menu.fileMenu, /Main menu.*Quit/, 'File menu: Main menu and Quit');
    const flow = await evaluate(`(async () => {
      const esc = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      esc();
      const closed = !document.querySelector('.start-screen');
      document.querySelector('header .brand').click();
      const reopened = Boolean(document.querySelector('.start-screen'));
      [...document.querySelectorAll('.start-item')].find((b) => b.textContent.includes('Game mode')).click();
      const game = Boolean(document.querySelector('.modal[aria-label="Game mode"]')) && !document.querySelector('.start-screen');
      esc();
      document.querySelector('header .brand').click();
      [...document.querySelectorAll('.start-item')].find((b) => b.textContent === 'Quit').click();
      return { closed, reopened, game, quit: window.__quit ?? 0, left: !document.querySelector('.modal') };
    })()`);
    assert.deepEqual(flow, { closed: true, reopened: true, game: true, quit: 1, left: true });
    // Delte lenker: til nettsiden (app://… virker ikke for andre), og en innlimt lenke åpnes her.
    const shared = await evaluate(`(async () => {
      const until = async (f) => { for (let i = 0; i < 100 && !f(); i++) await new Promise((r) => setTimeout(r, 50)); return f(); };
      const item = (label) => [...document.querySelectorAll('.menu-list button')].find((b) => b.querySelector('span')?.textContent === label);
      const name = liminal.level.name;
      item('Share link …').click();
      const url = (await until(() => document.querySelector('.modal .share-link')))?.value ?? '';
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      liminal.level.name = 'Something else';
      liminal.dirty = false;
      item('Open shared link …').click();
      const input = await until(() => document.querySelector('.modal[aria-label="Open shared link"] input'));
      input.value = url;
      document.querySelector('.modal .btn-accent').click();
      await until(() => liminal.level.name === name);
      return { url: url.startsWith('https://liminalsimulator.com/app/#room='), opened: liminal.level.name === name, closed: !document.querySelector('.modal') };
    })()`);
    assert.deepEqual(shared, { url: true, opened: true, closed: true });
    await open('/', 'document.readyState === "complete"');
    assert.equal(await evaluate(`document.getElementById('ad-slot')`), null, 'no ad slot in the app');
  } finally {
    await call('Page.removeScriptToEvaluateOnNewDocument', { identifier });
  }
  // På nettsiden: ingen startmeny, og New room som før.
  await open('/app/', 'Boolean(window.liminal?.level) && Boolean(document.querySelector(".modal"))');
  assert.deepEqual(await evaluate(`[Boolean(document.querySelector('.start-screen')), document.querySelector('.modal').getAttribute('aria-label'),
    [...document.querySelectorAll('.menu-list')].some((l) => l.textContent.includes('Quit'))]`), [false, 'New room', false]);
  assert.deepEqual(browser.errors, []);
  console.log('PASS start menu: desktop start screen, focus, Esc, logo, Game mode, Quit, no ads; website unchanged');
}
