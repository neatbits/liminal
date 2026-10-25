// Liminal Simulator som program (Electron): bygget i dist/ i et eget vindu under app://liminal/
// (desktop/files.mjs). Starter i simulatoren med startmenyen (src/app/start-menu.js); lenker ut
// åpnes i nettleseren, og tilbakemeldinger går til nettstedet. Starter i fullskjerm; F11 (og View →
// Fullscreen) bytter, og valget huskes (window-state.mjs). Ctrl+Q og Quit i menyene avslutter.
// Bygging og Steam: docs/desktop.md.
// --check (npm run desktop:check): åpner programmet usynlig, sjekker 3D, lagring, font, modeller,
// startmenyen og tilbakemeldingene, og avslutter med PASS/FAIL.
import { app, BrowserWindow, protocol, net, shell, ipcMain } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SCHEME, START, FEEDBACK, fileFor, isFeedback, isExternal } from './files.mjs';
import { loadWindowState, saveWindowState } from './window-state.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', 'dist');
const check = process.argv.includes('--check');
// --check --fullscreen: synlig, i fullskjerm, og gåmodus inn og ut (blir vinduet i fullskjerm?).
const checkFullscreen = check && process.argv.includes('--fullscreen');
// Datamappen (rom, utkast, innstillinger): fast navn, også i den urørte exe-en (som ikke har produktnavnet
// i seg, se docs/desktop.md). Selvsjekken bruker en egen: rører ikke rommene, og stanses ikke av et åpent vindu.
app.setPath('userData', check ? path.join(app.getPath('temp'), 'liminal-desktop-check') : path.join(app.getPath('appData'), 'Liminal Simulator'));

protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, codeCache: true } },
]);
// Bærbare med to skjermkort: bruk det kraftige.
app.commandLine.appendSwitch('force_high_performance_gpu');

const notFound = () => new Response('Not found', { status: 404 });

async function serve(request) {
  if (isFeedback(request.url)) {
    // Skjemaet godtar bare sitt eget nettsted som opprinnelse (feedback-lib.php); grensen per
    // IP-adresse gjelder som før. Node sin fetch, siden nettleseren ikke lar oss sette Origin.
    const body = request.method === 'POST' ? await request.text() : undefined;
    const res = await fetch(FEEDBACK, {
      method: request.method,
      headers: { 'Content-Type': request.headers.get('content-type') ?? 'application/json', Origin: new URL(FEEDBACK).origin },
      body,
    }).catch(() => null);
    return res ?? new Response(JSON.stringify({ message: 'No connection. Please try again later.' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
  const file = fileFor(request.url, root);
  return file ? net.fetch(pathToFileURL(file).toString()).catch(notFound) : notFound();
}

function createWindow() {
  const state = loadWindowState(app.getPath('userData'));
  const win = new BrowserWindow({
    fullscreen: checkFullscreen || (!check && state.fullscreen), // selvsjekken ellers usynlig, i et vindu
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    title: 'Liminal Simulator',
    backgroundColor: '#1b1810',
    autoHideMenuBar: true,
    show: !check || checkFullscreen,
    icon: path.join(here, 'icon.png'),
    webPreferences: { preload: path.join(here, 'preload.cjs'), contextIsolation: true, sandbox: true, backgroundThrottling: false },
  });
  win.removeMenu();
  const { webContents } = win;
  webContents.setWindowOpenHandler(({ url }) => {
    // Lenker ut åpnes i nettleseren; egne sider (About fra dialogen, target=_blank) i samme vindu.
    if (isExternal(url)) shell.openExternal(url);
    else if (fileFor(url, root)) win.loadURL(url);
    return { action: 'deny' };
  });
  webContents.on('will-navigate', (e, url) => {
    if (!isExternal(url)) return;
    e.preventDefault();
    shell.openExternal(url);
  });
  webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') toggleFullscreen(win);
    else if ((input.control || input.meta) && input.key.toLowerCase() === 'q') app.quit();
    else return;
    e.preventDefault();
  });
  // Fotomodus (P): rett i Pictures/Liminal Simulator uten dialog. Annet (eksporterte rom) spør som vanlig.
  webContents.session.on('will-download', (_e, item) => {
    if (!/^liminal-.+.(png|jpe?g)$/i.test(item.getFilename())) return;
    const dir = path.join(app.getPath('pictures'), 'Liminal Simulator');
    fs.mkdirSync(dir, { recursive: true });
    item.setSavePath(path.join(dir, item.getFilename()));
  });
  win.loadURL(START);
  return win;
}

/**
 * Fullskjerm av/på (F11, View-menyen), og husk valget til neste oppstart. Gåmodusens egen fullskjerm
 * (requestFullscreen i siden) endrer ikke valget.
 */
function toggleFullscreen(win) {
  const on = !win.isFullScreen();
  win.setFullScreen(on);
  if (!check) saveWindowState(app.getPath('userData'), { fullscreen: on });
}

/** --check: venter på 3D-verdenen og sjekker resten (se øverst). */
async function selfCheck(win) {
  const js = (code) => win.webContents.executeJavaScript(code);
  const until = Date.now() + 60000;
  while (Date.now() < until && !(await js('Boolean(window.liminal?.viewer?.world)').catch(() => false))) {
    await new Promise((r) => setTimeout(r, 250));
  }
  const result = await js(`(async () => {
    localStorage.setItem('liminal.desktop-check', '1');
    const faces = await document.fonts.load('20px VT323'); // fonten pakket med, hentet fra app://
    const v = liminal.viewer;
    await v.world.objects?.ready;
    // Skjemaet når nettstedet og godtas som derfra: tekst i stedet for JSON gir 415 etter
    // opprinnelsessjekken (403 = avvist), før noe sendes eller telles. 503 = uten nett.
    const feedback = (await fetch('../api/feedback.php', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'check' }).catch(() => null))?.status ?? 0;
    return {
      origin: location.origin, world: Boolean(v.world), webgl: Boolean(v.renderer?.getContext()),
      storage: localStorage.getItem('liminal.desktop-check') === '1', desktop: Boolean(window.liminalDesktop),
      font: faces.some((f) => f.family.replace(/"/g, '') === 'VT323' && f.status === 'loaded'), models: v.world.group.children.length > 0,
      feedback, startMenu: Boolean(document.querySelector('.start-screen')),
    };
  })()`).catch((e) => ({ error: String(e) }));
  if (checkFullscreen) {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const before = win.isFullScreen();
    await js("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))"); // lukk startmenyen
    await win.webContents.executeJavaScript('liminal.walk()', true); // som et klikk
    await wait(1500);
    const walking = await js('liminal.viewer.mode');
    await win.webContents.executeJavaScript('liminal.viewer.exitWalk(false)', true);
    await wait(1500);
    result.fullscreen = { before, walking, after: win.isFullScreen() };
  }
  const ok = (!checkFullscreen || (result.fullscreen.before && result.fullscreen.walking === 'walk' && result.fullscreen.after)) && result.world && result.webgl && result.storage && result.desktop && result.font && result.startMenu && [415, 503].includes(result.feedback);
  console.log(`${ok ? 'PASS' : 'FAIL'} desktop: ${JSON.stringify(result)}`);
  app.exit(ok ? 0 : 1);
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win?.isMinimized()) win.restore();
    win?.focus();
  });
  app.whenReady().then(() => {
    protocol.handle(SCHEME, serve);
    ipcMain.on('liminal:quit', () => app.quit());
    ipcMain.on('liminal:fullscreen', (e) => {
      const win = BrowserWindow.fromWebContents(e.sender);
      if (win) toggleFullscreen(win);
    });
    const win = createWindow();
    if (check) win.webContents.once('did-finish-load', () => selfCheck(win));
  });
  app.on('window-all-closed', () => app.quit());
}
