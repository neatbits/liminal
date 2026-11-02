import assert from 'node:assert/strict';
import { waitFor } from './browser-driver.mjs';
import { checkBackdrop } from './check-menu-backdrop.mjs';

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
    assert.deepEqual(menu.items, ['Play', 'Create', 'Settings', 'About & credits', 'Quit']);
    assert.match(menu.focus, /Play/, 'Play has focus');
    assert.equal(menu.newRoom, false);
    assert.match(menu.fileMenu, /Main menu.*Quit/, 'File menu: Main menu and Quit');
    // Et klikk ved siden av menyen (den fyller hele skjermen) lukker den ikke, og fokus blir værende.
    const size = await evaluate('[innerWidth, innerHeight]');
    for (const [x, y] of [[8, 8], [size[0] - 8, size[1] / 2]]) {
      for (const type of ['mousePressed', 'mouseReleased']) await call('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
    }
    assert.equal(await evaluate('Boolean(document.querySelector(".start-screen"))'), true, 'click beside the menu keeps it open');
    assert.match(await evaluate('document.activeElement?.textContent ?? ""'), /Play/, 'focus stays in the menu');
    await checkBackdrop(browser);
    await call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 600, deviceScaleFactor: 1, mobile: false }); // et lavt vindu
    const flow = await evaluate(`(async () => {
      const esc = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      esc();
      const closed = !document.querySelector('.start-screen');
      const menu = () => Boolean(document.querySelector('.start-items'));
      const pick = (text) => [...document.querySelectorAll('.start-item')].find((b) => b.textContent.includes(text)).click();
      document.querySelector('header .brand').click();
      const reopened = menu();
      pick('Play');
      pick('Lights out'); // modusen er valgt: bare stemningen igjen, på en side i hele vinduet
      const page = document.querySelector('.modal[aria-label="Game mode"]');
      const game = { title: page.querySelector('.start-title').textContent, cards: page.querySelectorAll('.card').length,
        modes: [...page.querySelectorAll('.card-title')].some((c) => /Tape hunt|Lights out/.test(c.textContent)), page: page.classList.contains('start-page'), menu: menu() };
      esc();
      const esced = menu();
      pick('Daily level');
      const daily = document.querySelector('.modal[aria-label="Daily level"]').classList.contains('start-page') && !menu();
      [...document.querySelectorAll('.modal-foot button')].find((b) => b.textContent === 'Back').click();
      await new Promise((r) => setTimeout(r)); // knappene i dialogene lukker etter en await
      const back = menu();
      pick('Back');
      pick('Settings'); // også innstillingene: en side i hele vinduet, og tilbake til menyen
      const settings = document.querySelector('.modal[aria-label="Settings"]').classList.contains('start-page') && !menu();
      const fits = document.querySelector('.modal-foot').getBoundingClientRect().bottom <= innerHeight; // Done er alltid på skjermen
      document.querySelector('.modal-backdrop').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      const stayed = Boolean(document.querySelector('.modal[aria-label="Settings"]'));
      esc();
      const settingsEsc = menu();
      pick('Settings');
      [...document.querySelectorAll('.modal-foot button')].find((b) => b.textContent === 'Done').click();
      await new Promise((r) => setTimeout(r));
      const settingsDone = menu();
      [...document.querySelectorAll('.start-item')].find((b) => b.textContent === 'Quit').click();
      return { closed, reopened, game, esced, daily, back, settings, fits, stayed, settingsEsc, settingsDone, quit: window.__quit ?? 0, left: !document.querySelector('.modal') };
    })()`);
    assert.deepEqual(flow, { closed: true, reopened: true, game: { title: 'Lights out', cards: 5, modes: false, page: true, menu: false }, esced: true, daily: true, back: true, settings: true, fits: true, stayed: true, settingsEsc: true, settingsDone: true, quit: 1, left: true });
    await call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
    // Musikken kan slås av og på fra innstillingene, og alt som viser den, følger med.
    const music = await evaluate(`(() => {
      document.querySelector('header .brand').click();
      [...document.querySelectorAll('.start-item')].find((b) => b.textContent === 'Settings').click();
      const row = [...document.querySelectorAll('.row')].find((r) => r.querySelector('label')?.textContent === 'Music');
      const set = (value) => { const s = row.querySelector('select'); s.value = value; s.dispatchEvent(new Event('change', { bubbles: true })); };
      const state = () => [liminal.settings.music, liminal.viewer.music.on, document.querySelector('#btn-music').classList.contains('active')];
      set('true');
      const on = state();
      set('false');
      const off = state();
      liminal.viewer.toggle('music');
      const toggled = state();
      liminal.viewer.toggle('music');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return { on, off, toggled, last: state() };
    })()`);
    assert.deepEqual(music, { on: [true, true, true], off: [false, false, false], toggled: [true, true, true], last: [false, false, false] });
    // Fra hovedmenyen rett inn i spillet, og tilbake dit når man går ut – ikke til editoren.
    await evaluate(`(() => { document.querySelector('header .brand').click(); liminal.layout.set('3d');
      [...document.querySelectorAll('.start-item')].find((b) => b.textContent === 'Play').click();
      [...document.querySelectorAll('.start-item')].find((b) => b.textContent.includes('Tape hunt')).click();
      [...document.querySelectorAll('.modal .card')].find((c) => c.textContent.startsWith('Normal')).click();
      document.querySelector('.modal .btn-accent').click(); })()`);
    await waitFor(() => evaluate('liminal.viewer.mode === "walk" && liminal.viewer.explorer.depth === 1 && !liminal.viewer.explorer.busy && !document.querySelector(".modal")').catch(() => false), 'game from the main menu');
    await evaluate('liminal.viewer.exitWalk(false)');
    assert.equal(await evaluate(`[...document.querySelectorAll('.start-label')].some((l) => l.textContent === 'Tape hunt')`), true, 'leaving the game returns to the games in the main menu');
    await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
    await evaluate(`document.querySelector('header .brand').click(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
    assert.equal(await evaluate(`Boolean(document.querySelector('.modal'))`), false, 'Esc closes the main menu');
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
    // About i programmet: ingen nettstedsmeny eller hjemmeside-lenker, bare tilbake til simulatoren.
    await open('/about/', 'document.readyState === "complete" && document.body.classList.contains("in-app")');
    const about = await evaluate(`(() => {
      const shown = (el) => Boolean(el?.getClientRects().length); // også skjult når en forelder er det
      return { home: [...document.querySelectorAll('a')].filter((a) => shown(a) && a.getAttribute('href') === '../').length,
        back: [...document.querySelectorAll('.l-nav a')].map((a) => [a.textContent, a.getAttribute('href')]),
        brand: document.querySelector('.l-top .brand').getAttribute('href'), foot: shown(document.querySelector('.l-foot')),
        app: shown(document.querySelector('[data-app]')), web: shown(document.querySelector('[data-web]')) };
    })()`);
    assert.deepEqual(about, { home: 0, back: [['← Back to Liminal', '../app/']], brand: '../app/', foot: false, app: true, web: false });
    // Uten WebGL: menyen står på den gule tapeten. three.js melder feilen selv; den er forventet her.
    const noGl = await call('Page.addScriptToEvaluateOnNewDocument', {
      source: `HTMLCanvasElement.prototype.getContext = ((get) => function (kind, ...rest) { return /webgl/.test(kind) ? null : get.call(this, kind, ...rest); })(HTMLCanvasElement.prototype.getContext);
        console.error = ((log) => (...args) => /Error creating WebGL context/.test(String(args[0])) || log(...args))(console.error);`,
    });
    await open('/app/', 'Boolean(window.liminal?.level) && Boolean(document.querySelector(".start-screen"))');
    await waitFor(() => evaluate('!document.body.classList.contains("menu-3d")'), 'yellow menu without WebGL');
    assert.deepEqual(await evaluate('[Boolean(document.querySelector(".menu-canvas")), document.querySelectorAll(".start-item").length]'), [false, 5]);
    await call('Page.removeScriptToEvaluateOnNewDocument', { identifier: noGl.identifier });
  } finally {
    await call('Page.removeScriptToEvaluateOnNewDocument', { identifier });
  }
  // På nettsiden: About som før.
  await open('/about/', 'document.readyState === "complete"');
  assert.deepEqual(await evaluate(`[document.body.classList.contains('in-app'), Boolean(document.querySelector('.l-nav a[href="../"]')), getComputedStyle(document.querySelector('[data-app]')).display]`), [false, true, 'none']);
  // På nettsiden: ingen startmeny, og New room som før.
  await open('/app/', 'Boolean(window.liminal?.level) && Boolean(document.querySelector(".modal"))');
  assert.deepEqual(await evaluate(`[Boolean(document.querySelector('.start-screen')), document.querySelector('.modal').getAttribute('aria-label'),
    [...document.querySelectorAll('.menu-list')].some((l) => l.textContent.includes('Quit'))]`), [false, 'New room', false]);
  assert.deepEqual(browser.errors, []);
  console.log('PASS start menu: desktop start screen, focus, Esc, logo, Game mode, Quit, no ads, About without site menu; website unchanged');
}
