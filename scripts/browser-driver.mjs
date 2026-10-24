// Liten Chrome DevTools-klient for lokale nettlesersjekker, uten ekstra avhengigheter.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

export async function waitFor(check, label, timeout = 30000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const value = await check();
    if (value) return value;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Timed out: ${label}`);
}

class CDP {
  constructor(socket) {
    this.socket = socket;
    this.id = 0;
    this.pending = new Map();
    this.errors = [];
    this.listeners = new Map();
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      const listener = this.listeners.get(message.method);
      if (listener) Promise.resolve().then(() => listener(message.params)).catch((e) => this.errors.push(e.message));
      if (message.method === 'Runtime.exceptionThrown') this.errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
      const task = this.pending.get(message.id);
      if (!task) return;
      this.pending.delete(message.id);
      clearTimeout(task.timer);
      if (message.error) task.reject(new Error(message.error.message));
      else task.resolve(message.result);
    });
    socket.addEventListener('close', () => {
      for (const task of this.pending.values()) {
        clearTimeout(task.timer);
        task.reject(new Error('Browser connection closed'));
      }
      this.pending.clear();
    });
  }

  call(method, params = {}, sessionId) {
    if (process.env.BROWSER_DEBUG) console.log('CDP:', method);
    return new Promise((resolveCall, reject) => {
      const id = ++this.id;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Browser command timed out: ${method}`));
      }, 30000);
      this.pending.set(id, { resolve: resolveCall, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }
}

export async function launchBrowser({ hardware = false } = {}) {
  const chrome = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ].find((p) => p && existsSync(p));
  if (!chrome) throw new Error('Chrome/Edge not found. Set CHROME_PATH to the browser executable.');
  const cache = resolve('node_modules/.cache');
  mkdirSync(cache, { recursive: true });
  const profile = mkdtempSync(join(cache, 'liminal-browser-'));
  const child = spawn(chrome, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--enable-logging=stderr',
    ...(hardware ? [] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']), 'about:blank',
  ], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  let browserLog = '';
  child.stderr.on('data', (chunk) => { browserLog = (browserLog + chunk).slice(-8000); });
  let startupError;
  child.on('error', (e) => { startupError = e; });
  let cdp;
  const close = async () => {
    if (cdp) await cdp.call('Browser.close').catch(() => {});
    if (child.exitCode === null) {
      await Promise.race([
        new Promise((r) => child.once('exit', r)),
        new Promise((r) => setTimeout(r, 1000)),
      ]);
      if (child.exitCode === null) child.kill();
    }
    // Bare den midlertidige profilen laget over, innenfor arbeidsområdets cache.
    if (!resolve(profile).startsWith(cache + sep)) throw new Error('Unexpected browser profile path.');
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  };
  try {
    const portFile = join(profile, 'DevToolsActivePort');
    const lines = await waitFor(() => {
      if (startupError) throw startupError;
      if (child.exitCode !== null) throw new Error(`Browser exited: ${child.exitCode}`);
      return existsSync(portFile) && readFileSync(portFile, 'utf8').trim().split(/\r?\n/);
    }, 'browser startup');
    const socket = new WebSocket(`ws://127.0.0.1:${lines[0]}${lines[1]}`);
    await new Promise((yes, no) => { socket.addEventListener('open', yes, { once: true }); socket.addEventListener('error', no, { once: true }); });
    cdp = new CDP(socket);
    const { targetId } = await cdp.call('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.call('Target.attachToTarget', { targetId, flatten: true });
    const call = (method, params) => cdp.call(method, params, sessionId);
    const evaluate = async (expression) => {
      const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
      return result.result.value;
    };
    await call('Runtime.enable');
    await call('Page.enable');
    const on = (method, listener) => { cdp.listeners.set(method, listener); return () => cdp.listeners.delete(method); };
    return { call, evaluate, on, profile, close, errors: cdp.errors, get log() { return browserLog; } };
  } catch (e) {
    if (process.env.BROWSER_DEBUG) console.error(browserLog);
    await close();
    throw e;
  }
}
